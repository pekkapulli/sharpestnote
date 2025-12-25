import { untrack } from 'svelte';
import {
	autoCorrelate,
	centsOff,
	frequencyFromNoteNumber,
	noteFromPitch,
	noteNameFromMidi,
	type Accidental
} from '$lib/tuner/tune';
import {
	calculateAmplitude,
	calculateHighFrequencyBurst,
	calculateSpectralFlux,
	getDetectionConfig,
	isFrequencyStable
} from './analysis';
import { createAudioChain, teardownAudioChain, type AudioChain } from './audioGraph';
import { genericDetectionConfig, instrumentMap } from '$lib/config/instruments';
import { lengthToMs } from '$lib/config/melody';
import type { InstrumentKind, TunerOptions, TunerState } from './types';

export type { InstrumentKind, TunerOptions, TunerState } from './types';

export function createTuner(options: TunerOptions = {}) {
	let audioContext: AudioContext | null = null;
	let audioChain: AudioChain | null = null;
	let rafId: number | null = null;
	let buffer: Float32Array | null = null;
	let noteDebounceId: number | null = null;
	let debouncedNote: string | null = null;
	let pendingNote: string | null = null;
	const frequencyHistory: number[] = [];
	const amplitudeHistory: number[] = [];

	const state = $state<TunerState>({
		isListening: false,
		frequency: null,
		cents: null,
		note: null,
		error: null,
		devices: [],
		selectedDeviceId: null,
		amplitude: 0,
		isNoteActive: false,
		heldSixteenths: 0
	});

	const a4 = $state({ value: options.a4 ?? 442 });
	const accidental = $state({ value: options.accidental ?? 'sharp' });
	const debounceTime = $state({ value: options.debounceTime ?? 200 });
	const amplitudeThreshold = $state({ value: options.amplitudeThreshold ?? 0.02 });
	const instrument = $state({ value: options.instrument ?? 'generic' });
	const tempoBPM = $state({ value: options.tempoBPM ?? 120 });
	const maxGain = $state({ value: options.maxGain ?? 12 });
	const minGain = $state({ value: options.minGain ?? 0.1 });
	const gain = $state({ value: options.gain ?? 2 });
	const autoGainEnabled = $state({ value: options.autoGain ?? true });
	const targetAmplitude = $state({ value: options.targetAmplitude ?? 0.4 });
	const gainAdjustRate = $state({ value: options.gainAdjustRate ?? 0.12 });
	const autoGainInterval = $state({ value: options.autoGainInterval ?? 100 });

	// Internal tracking for note hold duration
	let lastTickAt: number | null = null;
	let holdMs = 0;
	let heldNote: string | null = null;
	let smoothedAmplitude = 0;
	let autoGainElapsed = 0;
	let peakAmplitude = 0;
	let amplitudeAtDropStart = 0; // track amplitude when drop begins
	let previousSpectrum: Float32Array | null = null; // for spectral flux calculation
	let highSpectralFluxFrames = 0;
	let amplitudeDropFrames = 0; // count consecutive frames with amplitude drop
	let highFreqBurstFrames = 0; // count frames with high-frequency burst (bow scrape/attack noise)

	function clampGain(value: number): number {
		return Math.max(minGain.value, Math.min(maxGain.value, value));
	}

	async function refreshDevices() {
		try {
			const list = await navigator.mediaDevices.enumerateDevices();
			state.devices = list.filter((d) => d.kind === 'audioinput');
			if (!state.selectedDeviceId && state.devices.length) {
				state.selectedDeviceId = state.devices[0].deviceId;
			}
		} catch (err) {
			console.error(err);
			state.error = 'Could not list audio devices.';
		}
	}

	async function start() {
		try {
			state.error = null;
			stop();

			audioContext = audioContext ?? new AudioContext();
			await audioContext.resume();

			gain.value = clampGain(gain.value);
			audioChain = await createAudioChain(audioContext, state.selectedDeviceId, gain.value);
			buffer = audioChain.buffer;

			state.isListening = true;
			refreshDevices();
			tick();
		} catch (err) {
			console.error(err);
			state.error = 'Unable to start microphone. Please check permissions.';
			stop();
		}
	}

	function stop() {
		if (noteDebounceId) {
			clearTimeout(noteDebounceId);
			noteDebounceId = null;
		}
		debouncedNote = null;
		pendingNote = null;

		if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}

		lastTickAt = null;
		holdMs = 0;
		heldNote = null;
		state.heldSixteenths = 0;
		peakAmplitude = 0;
		amplitudeAtDropStart = 0;
		highSpectralFluxFrames = 0;
		amplitudeDropFrames = 0;
		highFreqBurstFrames = 0;
		previousSpectrum = null;

		teardownAudioChain(audioChain);
		audioChain = null;
		buffer = null;
		state.isListening = false;
	}

	function tick() {
		const chain = audioChain;
		const data = buffer;
		if (!chain || !audioContext || !data) {
			return;
		}

		const analyser = chain.analyser;
		const gainNode = chain.gainNode;

		const now = performance.now();
		if (lastTickAt === null) lastTickAt = now;
		const dt = now - lastTickAt;

		const tempData = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>;
		analyser.getFloatTimeDomainData(tempData);
		const freq = autoCorrelate(tempData, audioContext.sampleRate);
		const amplitude = calculateAmplitude(tempData);

		// Compute FFT for spectral flux
		const fftData = new Uint8Array(analyser.frequencyBinCount);
		analyser.getByteFrequencyData(fftData);
		const spectrum = new Float32Array(fftData);

		state.amplitude = amplitude;
		const instrumentType = untrack(() => instrument.value as InstrumentKind);
		const tuning = getDetectionConfig(instrumentType, instrumentMap, genericDetectionConfig);

		// Track frequency and amplitude history
		frequencyHistory.push(freq);
		amplitudeHistory.push(amplitude);
		if (frequencyHistory.length > 20) frequencyHistory.shift();
		if (amplitudeHistory.length > 20) amplitudeHistory.shift();

		// Calculate spectral flux (how much the spectrum is changing)
		const spectralFlux = calculateSpectralFlux(spectrum, previousSpectrum);

		const currentActive = state.isNoteActive;

		// Detect high-frequency burst (bow scrape/attack noise = bow interacting with string)
		const highFreqBurst = calculateHighFrequencyBurst(spectrum, previousSpectrum);
		if (highFreqBurst > tuning.highFreqBurstThreshold) {
			highFreqBurstFrames++;
			// if (highFreqBurstFrames === 1) {
			// 	console.log(
			// 		`High-freq burst detected: ${highFreqBurst.toFixed(3)} (threshold: ${tuning.highFreqBurstThreshold}), freq: ${freq.toFixed(1)}, amp: ${amplitude.toFixed(4)}`
			// 	);
			// }
		} else {
			// if (highFreqBurstFrames > 0) {
			// 	console.log(
			// 		`Burst ended after ${highFreqBurstFrames} frames, burst value was ${highFreqBurst.toFixed(3)}`
			// 	);
			// }
			highFreqBurstFrames = 0;
		}
		const hasHighFreqBurst = highFreqBurstFrames >= tuning.highFreqBurstFrameThreshold;
		const burstEndsNote = tuning.burstRequiresDecay
			? hasHighFreqBurst &&
				peakAmplitude > 0 &&
				amplitude / peakAmplitude < tuning.burstMinDecayRatio
			: hasHighFreqBurst;
		// if (burstEndsNote && currentActive) {
		// 	console.log(`High-freq burst triggered note end (${highFreqBurstFrames} frames)`);
		// }

		previousSpectrum = new Float32Array(spectrum);

		// Use hysteresis so small reverbs/room noise don't require amplitude to hit zero
		const activateThreshold = amplitudeThreshold.value;
		const meetsFrequency = freq > 0 && isFrequencyStable(freq, frequencyHistory);

		// Track peak amplitude for decay detection
		if (amplitude > peakAmplitude) {
			peakAmplitude = amplitude;
		}

		// Detect high spectral flux (spectrum changing significantly = note ending or changing)
		const hasHighSpectralFlux = spectralFlux > tuning.spectralFluxThreshold;
		if (hasHighSpectralFlux) {
			highSpectralFluxFrames++;
		} else {
			highSpectralFluxFrames = 0;
		}
		const hasSpectralChange = highSpectralFluxFrames >= tuning.highFluxFrameThreshold;

		// Detect sustained amplitude drop (bow lifting off)
		// First, check if amplitude is currently dropping
		const isAmplitudeDropping =
			amplitudeHistory.length >= 2 && amplitude < amplitudeHistory[amplitudeHistory.length - 2];

		if (isAmplitudeDropping) {
			amplitudeDropFrames++;
			// Record amplitude when drop started (first frame of drop)
			if (amplitudeDropFrames === 1) {
				amplitudeAtDropStart = amplitude;
			}
		} else {
			// Amplitude is not dropping, so check: did it recover?
			// If we had a drop and now it's NOT recovering back up, it's permanent
			if (amplitudeDropFrames > 0) {
				// Drop was detected but amplitude isn't dropping anymore
				// Check if it stayed low (didn't recover much)
				const recoveryRatio = amplitude / amplitudeAtDropStart;
				if (recoveryRatio < tuning.amplitudeRecoveryThreshold) {
					// Amplitude dropped and barely recovered - permanent change
					amplitudeDropFrames = tuning.amplitudeDropThreshold; // trigger the drop detection
				} else {
					// It recovered - was just a fluctuation
					amplitudeDropFrames = 0;
				}
			}
		}

		// Only consider it a permanent drop if sustained long enough
		const hasAmplitudeDrop = amplitudeDropFrames >= tuning.amplitudeDropThreshold;

		if (currentActive) {
			const frequencyLost = !meetsFrequency;
			const amplitudeCriticallyLow = amplitude < amplitudeThreshold.value * 0.3;
			// End note if:
			// - High-frequency burst detected (bow scrape = release/attack), OR
			// - BOTH spectral change AND amplitude drop (note ending), OR
			// - Frequency becomes unstable/lost, OR
			// - Amplitude drops to near silence
			const spectralChangeWithDrop = hasSpectralChange && hasAmplitudeDrop;
			state.isNoteActive = !(
				burstEndsNote ||
				spectralChangeWithDrop ||
				frequencyLost ||
				amplitudeCriticallyLow
			);
		} else {
			state.isNoteActive = amplitude > activateThreshold && meetsFrequency;
			// Always reset spectral flux counter when not actively playing a note
			if (!state.isNoteActive) {
				highSpectralFluxFrames = 0;
				amplitudeDropFrames = 0;
				amplitudeAtDropStart = 0;
				highFreqBurstFrames = 0;
			} else {
				peakAmplitude = amplitude;
				amplitudeDropFrames = 0; // reset drop tracking at note start
				amplitudeAtDropStart = 0;
				highFreqBurstFrames = 0;
			}
		}

		if (freq > 0 && state.isNoteActive) {
			const currentA4 = untrack(() => a4.value);
			const currentAccidental = untrack(() => accidental.value);

			const midi = noteFromPitch(freq, currentA4);
			const target = frequencyFromNoteNumber(midi, currentA4);
			state.frequency = freq;
			state.cents = centsOff(freq, target);
			const detectedNote = noteNameFromMidi(midi, currentAccidental);

			// Debounce note changes to smooth transient noise
			if (detectedNote !== pendingNote) {
				if (noteDebounceId) clearTimeout(noteDebounceId);
				pendingNote = detectedNote;
				noteDebounceId = window.setTimeout(() => {
					debouncedNote = pendingNote;
					state.note = pendingNote;
					noteDebounceId = null;
				}, debounceTime.value);
			} else if (noteDebounceId === null && state.note !== debouncedNote) {
				// Timer already fired; sync state if needed
				state.note = debouncedNote;
			}
		} else {
			state.frequency = null;
			state.cents = null;
			if (noteDebounceId) {
				clearTimeout(noteDebounceId);
				noteDebounceId = null;
			}
			debouncedNote = null;
			pendingNote = null;
			state.note = null;
		}

		// Update held duration in ms and convert to 16th notes using tempo
		const current = state.note;
		if (state.isNoteActive && current) {
			if (heldNote === current) {
				holdMs += dt;
			} else {
				heldNote = current;
				holdMs = 0;
			}
			const tempo = Math.max(
				1,
				untrack(() => tempoBPM.value)
			);
			const sixteenthMs = lengthToMs(1, tempo);
			state.heldSixteenths = sixteenthMs > 0 ? holdMs / sixteenthMs : 0;
		} else {
			heldNote = null;
			holdMs = 0;
			state.heldSixteenths = 0;
		}

		lastTickAt = now;

		autoGainElapsed += dt;
		// Auto gain: adapt input level to target amplitude without raising noise floor excessively
		// Only adjust BETWEEN notes to avoid interfering with current note detection
		if (
			autoGainEnabled.value &&
			gainNode &&
			autoGainElapsed > autoGainInterval.value &&
			!state.isNoteActive
		) {
			autoGainElapsed = 0;
			smoothedAmplitude = smoothedAmplitude * 0.9 + amplitude * 0.1;
			const target = targetAmplitude.value;
			const lower = target * 0.85;
			const upper = target * 1.25;
			const adjustStep = 1 + Math.max(0.01, Math.min(0.25, gainAdjustRate.value));
			const currentGain = gain.value;

			// Adjust gain when between notes but still have some signal to calibrate from
			const hasSignal = smoothedAmplitude > activateThreshold * 0.5;
			if (hasSignal) {
				let nextGain = currentGain;
				if (smoothedAmplitude < lower) {
					nextGain = clampGain(currentGain * adjustStep);
				} else if (smoothedAmplitude > upper) {
					nextGain = clampGain(currentGain / adjustStep);
				}
				if (nextGain !== currentGain) {
					gain.value = nextGain;
					gainNode.gain.value = nextGain;
				}
			}
		}

		rafId = requestAnimationFrame(tick);
	}

	function checkSupport() {
		if (!navigator.mediaDevices?.getUserMedia) {
			state.error = 'Microphone access is not available in this browser.';
			return false;
		}
		return true;
	}

	function resetHoldDuration() {
		holdMs = 0;
		heldNote = null;
		state.heldSixteenths = 0;
	}

	return {
		get state() {
			return state;
		},
		get a4() {
			return a4.value;
		},
		set a4(value: number) {
			a4.value = value;
		},
		get accidental() {
			return accidental.value;
		},
		set accidental(value: Accidental) {
			accidental.value = value;
		},
		get debounceTime() {
			return debounceTime.value;
		},
		set debounceTime(value: number) {
			debounceTime.value = value;
		},
		get amplitudeThreshold() {
			return amplitudeThreshold.value;
		},
		set amplitudeThreshold(value: number) {
			amplitudeThreshold.value = value;
		},
		get tempoBPM() {
			return tempoBPM.value;
		},
		set tempoBPM(value: number) {
			tempoBPM.value = value > 0 ? value : 1;
		},
		get gain() {
			return gain.value;
		},
		set gain(value: number) {
			const clamped = clampGain(value);
			gain.value = clamped;
			if (audioChain) audioChain.gainNode.gain.value = clamped;
		},
		get autoGain() {
			return autoGainEnabled.value;
		},
		set autoGain(value: boolean) {
			autoGainEnabled.value = value;
		},
		get targetAmplitude() {
			return targetAmplitude.value;
		},
		set targetAmplitude(value: number) {
			targetAmplitude.value = Math.max(0.001, Math.min(0.5, value));
		},
		get autoGainInterval() {
			return autoGainInterval.value;
		},
		set autoGainInterval(value: number) {
			autoGainInterval.value = Math.max(50, value);
		},
		get instrument() {
			return instrument.value;
		},
		set instrument(value: InstrumentKind) {
			instrument.value = value;
		},
		start,
		stop,
		refreshDevices,
		checkSupport,
		resetHoldDuration,
		destroy: stop
	};
}
