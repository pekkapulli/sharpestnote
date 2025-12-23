import { untrack } from 'svelte';
import {
	autoCorrelate,
	centsOff,
	frequencyFromNoteNumber,
	noteFromPitch,
	noteNameFromMidi,
	type Accidental
} from '$lib';
import { lengthToMs } from '$lib/config/rhythm';

const FFT_SIZE = 2048;

export interface TunerState {
	isListening: boolean;
	frequency: number | null;
	cents: number | null;
	note: string | null;
	error: string | null;
	devices: MediaDeviceInfo[];
	selectedDeviceId: string | null;
	amplitude: number;
	isNoteActive: boolean;
	heldSixteenths: number; // how many 1/16 notes the current note has been held (can be fractional)
}

export interface TunerOptions {
	a4?: number;
	accidental?: Accidental;
	debounceTime?: number;
	amplitudeThreshold?: number;
	instrument?: 'violin' | 'guitar' | 'flute' | 'generic';
	tempoBPM?: number; // for converting time held into 16th-note units
	gain?: number; // amplification multiplier (1.0 = no change, 2.0 = 2x boost)
	autoGain?: boolean; // auto adjust gain to target amplitude
	targetAmplitude?: number; // desired RMS amplitude before compressor
	maxGain?: number;
	minGain?: number;
	gainAdjustRate?: number; // fraction step per adjustment (e.g., 0.08 = 8%)
	autoGainInterval?: number; // ms between auto-gain adjustments (e.g., 100)
}

export function createTuner(options: TunerOptions = {}) {
	let audioContext: AudioContext | null = null;
	let analyser: AnalyserNode | null = null;
	let mediaStream: MediaStream | null = null;
	let mediaSource: MediaStreamAudioSourceNode | null = null;
	let gainNode: GainNode | null = null;
	let compressor: DynamicsCompressorNode | null = null;
	let highpassFilter: BiquadFilterNode | null = null;
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
	const SPECTRAL_FLUX_THRESHOLD = 0.15; // very aggressive - catch even subtle spectral shifts
	const HIGH_FLUX_THRESHOLD = 1; // fire after 1 frame of high flux detection (fastest)
	let amplitudeDropFrames = 0; // count consecutive frames with amplitude drop
	const AMPLITUDE_DROP_THRESHOLD = 2; // require just 2 frames of consistent drop
	const AMPLITUDE_RECOVERY_THRESHOLD = 0.7; // if drops below 70% of peak, it's permanent
	let highFreqBurstFrames = 0; // count frames with high-frequency burst (bow scrape/attack noise)
	const HIGH_FREQ_BURST_THRESHOLD = 0.6; // lower threshold for better sensitivity to bow interactions
	const HIGH_FREQ_BURST_FRAME_THRESHOLD = 1; // require 1+ frames of burst

	function clampGain(value: number): number {
		return Math.max(minGain.value, Math.min(maxGain.value, value));
	}

	function calculateAmplitude(data: Float32Array): number {
		let sum = 0;
		for (let i = 0; i < data.length; i++) {
			sum += data[i] * data[i];
		}
		return Math.sqrt(sum / data.length);
	}

	function calculateSpectralFlux(
		currentSpectrum: Float32Array,
		previousSpectrum: Float32Array | null
	): number {
		if (!previousSpectrum || previousSpectrum.length !== currentSpectrum.length) {
			return 0;
		}

		// Normalize both spectra
		const normalize = (spec: Float32Array) => {
			let sum = 0;
			for (let i = 0; i < spec.length; i++) {
				sum += spec[i] * spec[i];
			}
			const norm = Math.sqrt(sum);
			return norm > 0 ? Array.from(spec).map((v) => v / norm) : Array.from(spec);
		};

		const currNorm = normalize(currentSpectrum);
		const prevNorm = normalize(previousSpectrum);

		// Euclidean distance (L2 norm) between normalized spectra
		let squaredDist = 0;
		for (let i = 0; i < currNorm.length; i++) {
			const diff = currNorm[i] - prevNorm[i];
			squaredDist += diff * diff;
		}
		return Math.sqrt(squaredDist);
	}

	function calculateHighFrequencyBurst(
		spectrum: Float32Array,
		previousSpectrum: Float32Array | null
	): number {
		if (!previousSpectrum || spectrum.length !== previousSpectrum.length) {
			return 0;
		}

		// Look at mid-to-high frequencies (30% to 100% of spectrum = where bow scrape lives)
		// This range captures the transient noise better than just the very top
		const highFreqStart = Math.floor(spectrum.length * 0.3);
		let highFreqNow = 0;
		let highFreqPrev = 0;

		for (let i = highFreqStart; i < spectrum.length; i++) {
			highFreqNow += spectrum[i];
			highFreqPrev += previousSpectrum[i];
		}

		// Calculate the surge in high-mid frequency content
		const highFreqChange = (highFreqNow - highFreqPrev) / (highFreqPrev + 1); // +1 to avoid division by zero
		return Math.max(0, highFreqChange); // only positive surges matter
	}

	function isFrequencyStable(freq: number, windowSize: number = 5): boolean {
		if (frequencyHistory.length < windowSize) return false;
		const recent = frequencyHistory.slice(-windowSize);
		const avg = recent.reduce((a, b) => a + b) / recent.length;
		const variance = recent.reduce((sum, f) => sum + Math.abs(f - avg), 0) / recent.length;
		// Allow more variance for low frequencies (they naturally wobble more)
		// Use 3-4% variance tolerance, higher for lower frequencies
		const tolerancePercent = freq < 100 ? 0.04 : 0.03;
		return variance < avg * tolerancePercent;
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

			analyser = audioContext.createAnalyser();
			analyser.fftSize = FFT_SIZE;
			buffer = new Float32Array(analyser.fftSize);

			const constraints: MediaStreamConstraints = {
				audio: state.selectedDeviceId
					? {
							deviceId: { exact: state.selectedDeviceId },
							echoCancellation: false,
							noiseSuppression: false,
							autoGainControl: false,
							channelCount: 1
						}
					: {
							echoCancellation: false,
							noiseSuppression: false,
							autoGainControl: false,
							channelCount: 1
						},
				video: false
			};

			mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
			mediaSource = audioContext.createMediaStreamSource(mediaStream);

			// Create gain node for amplification
			gainNode = audioContext.createGain();
			gain.value = clampGain(gain.value);
			gainNode.gain.value = gain.value;

			// Create compressor for dynamic range compression
			compressor = audioContext.createDynamicsCompressor();
			compressor.threshold.value = -20; // dB - higher threshold lets natural dynamics through
			compressor.knee.value = 30; // softer knee for more natural compression
			compressor.ratio.value = 4; // moderate compression (1:4 not 1:100)
			compressor.attack.value = 0.01; // 10ms attack (slower to preserve transients)
			compressor.release.value = 0.1; // 100ms release (faster to reveal amplitude decay)

			// Create highpass filter to reduce octave-hopping and rumble
			highpassFilter = audioContext.createBiquadFilter();
			highpassFilter.type = 'highpass';
			highpassFilter.frequency.value = 40; // Hz - allow low cello C (65Hz) through while removing rumble

			// Connect: mediaSource -> gain -> compressor -> highpass -> analyser
			mediaSource.connect(gainNode);
			gainNode.connect(compressor);
			compressor.connect(highpassFilter);
			highpassFilter.connect(analyser);

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

		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
			mediaStream = null;
		}

		if (mediaSource) {
			mediaSource.disconnect();
			mediaSource = null;
		}

		if (gainNode) {
			gainNode.disconnect();
			gainNode = null;
		}

		if (compressor) {
			compressor.disconnect();
			compressor = null;
		}

		if (highpassFilter) {
			highpassFilter.disconnect();
			highpassFilter = null;
		}

		if (analyser) {
			analyser.disconnect();
			analyser = null;
		}

		buffer = null;
		state.isListening = false;
	}

	function tick() {
		const data = buffer;
		if (!analyser || !audioContext || !data) {
			return;
		}

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
		if (highFreqBurst > HIGH_FREQ_BURST_THRESHOLD) {
			highFreqBurstFrames++;
			if (highFreqBurstFrames === 1) {
				console.log(
					`High-freq burst detected: ${highFreqBurst.toFixed(3)} (threshold: ${HIGH_FREQ_BURST_THRESHOLD}), freq: ${freq.toFixed(1)}, amp: ${amplitude.toFixed(4)}`
				);
			}
		} else {
			if (highFreqBurstFrames > 0) {
				console.log(
					`Burst ended after ${highFreqBurstFrames} frames, burst value was ${highFreqBurst.toFixed(3)}`
				);
			}
			highFreqBurstFrames = 0;
		}
		const hasHighFreqBurst = highFreqBurstFrames >= HIGH_FREQ_BURST_FRAME_THRESHOLD;
		if (hasHighFreqBurst && currentActive) {
			console.log(`High-freq burst triggered note end (${highFreqBurstFrames} frames)`);
		}

		previousSpectrum = new Float32Array(spectrum);

		// Use hysteresis so small reverbs/room noise don't require amplitude to hit zero
		const activateThreshold = amplitudeThreshold.value;
		const meetsFrequency = freq > 0 && isFrequencyStable(freq);

		// Track peak amplitude for decay detection
		if (amplitude > peakAmplitude) {
			peakAmplitude = amplitude;
		}

		// Detect high spectral flux (spectrum changing significantly = note ending or changing)
		const hasHighSpectralFlux = spectralFlux > SPECTRAL_FLUX_THRESHOLD;
		if (hasHighSpectralFlux) {
			highSpectralFluxFrames++;
		} else {
			highSpectralFluxFrames = 0;
		}
		const hasSpectralChange = highSpectralFluxFrames >= HIGH_FLUX_THRESHOLD;

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
				if (recoveryRatio < AMPLITUDE_RECOVERY_THRESHOLD) {
					// Amplitude dropped and barely recovered - permanent change
					amplitudeDropFrames = AMPLITUDE_DROP_THRESHOLD; // trigger the drop detection
				} else {
					// It recovered - was just a fluctuation
					amplitudeDropFrames = 0;
				}
			}
		}

		// Only consider it a permanent drop if sustained long enough
		const hasAmplitudeDrop = amplitudeDropFrames >= AMPLITUDE_DROP_THRESHOLD;

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
				hasHighFreqBurst ||
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
			if (gainNode) gainNode.gain.value = clamped;
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
		set instrument(value: 'violin' | 'guitar' | 'flute' | 'generic') {
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
