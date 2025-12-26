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
	calculateDynamicThreshold,
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
	const fluxHistory: number[] = []; // Track flux for dynamic threshold
	let spectrumBuffer: Uint8Array | null = null; // Latest magnitude spectrum (byte values)

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
		heldSixteenths: 0,
		spectrum: null
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
	let previousSpectrum: Float32Array | null = null; // for spectral flux calculation
	let lastOnsetTime = 0; // timestamp of last detected onset (for refractory period)
	let endCandidateStart: number | null = null; // when a potential note end started

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
		lastOnsetTime = 0;
		previousSpectrum = null;
		spectrumBuffer = null;
		state.spectrum = null;

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
		// Keep a copy for visualization (bytes 0-255)
		spectrumBuffer = new Uint8Array(fftData);
		state.spectrum = spectrumBuffer;

		state.amplitude = amplitude;
		const instrumentType = untrack(() => instrument.value as InstrumentKind);
		const tuning = getDetectionConfig(instrumentType, instrumentMap, genericDetectionConfig);

		// Calculate high-frequency weighted, positive-only spectral flux for onset detection
		const spectralFlux = calculateSpectralFlux(spectrum, previousSpectrum);

		// Track frequency, amplitude, and flux history
		frequencyHistory.push(freq);
		amplitudeHistory.push(amplitude);
		fluxHistory.push(spectralFlux);
		if (frequencyHistory.length > 20) frequencyHistory.shift();
		if (amplitudeHistory.length > 20) amplitudeHistory.shift();
		if (fluxHistory.length > 30) fluxHistory.shift(); // Keep more for statistical reliability

		// Dynamic threshold adapts to signal level and background noise
		const dynamicFluxThreshold = calculateDynamicThreshold(fluxHistory, 10, 3.0);

		// ============================================================================
		// ONSET DETECTION
		// ============================================================================
		// Professional approach: detect new note starts, don't worry about endings
		// - Spectral flux spike = sudden energy increase (especially in upper harmonics)
		// - Refractory period prevents false retriggering from vibrato/tremolo
		// - Works even when previous notes are sustaining

		const timeSinceLastOnset = now - lastOnsetTime;
		const canTriggerOnset = timeSinceLastOnset > tuning.onsetRefractoryMs;

		// Onset = flux spike above dynamic threshold + minimum amplitude + stable pitch
		const meetsFrequency = freq > 0 && isFrequencyStable(freq, frequencyHistory);
		const hasFluxSpike = spectralFlux > dynamicFluxThreshold;
		const hasMinAmplitude = amplitude > tuning.onsetMinAmplitude;

		const onsetDetected = canTriggerOnset && hasFluxSpike && hasMinAmplitude && meetsFrequency;

		if (onsetDetected) {
			lastOnsetTime = now;
			state.isNoteActive = true;
			// console.log(`Onset detected: flux=${spectralFlux.toFixed(4)}, threshold=${dynamicFluxThreshold.toFixed(4)}, freq=${freq.toFixed(1)}`);
		}

		// Gentle note end hysteresis: require low amplitude or lost pitch
		// sustained for a short period before ending the note
		if (state.isNoteActive) {
			const lowAmplitude = amplitude < tuning.onsetMinAmplitude * tuning.endMinAmplitudeRatio;
			const pitchLost = !(freq > 0 && isFrequencyStable(freq, frequencyHistory));
			const endCondition = lowAmplitude || pitchLost;

			if (endCondition) {
				if (endCandidateStart === null) endCandidateStart = now;
				const elapsed = now - endCandidateStart;
				if (elapsed >= tuning.endHoldMs) {
					state.isNoteActive = false;
					endCandidateStart = null;
				}
			} else {
				endCandidateStart = null;
			}
		}

		previousSpectrum = new Float32Array(spectrum);

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
			const hasSignal = smoothedAmplitude > amplitudeThreshold.value * 0.5;
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
