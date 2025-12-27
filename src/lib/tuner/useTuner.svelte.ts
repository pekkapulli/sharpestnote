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
	getDetectionConfig,
	isFrequencyStable
} from './analysis';
import { performFFT, type FFTResult } from './fftAnalysis';
import { calculateSpectralFluxWeighted, calculatePhaseDeviationFocused } from './spectralAnalysis';
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
		spectrum: null,
		phases: null
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
	let previousFFT: FFTResult | null = null; // for spectral analysis (magnitudes + phases)
	let lastOnsetTime = 0; // timestamp of last detected onset (for refractory period)
	let peakAmplitudeSinceOnset = 0; // track peak amplitude since last onset for drop detection
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
		peakAmplitudeSinceOnset = 0;
		previousFFT = null;
		spectrumBuffer = null;
		state.spectrum = null;
		state.phases = null;

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

		// Perform custom FFT with phase information for high-quality onset detection
		const fftResult = performFFT(tempData, audioContext.sampleRate, true);

		// Convert magnitudes to byte range for visualization (0-255)
		spectrumBuffer = new Uint8Array(fftResult.magnitudes.length);
		const maxMag = Math.max(...Array.from(fftResult.magnitudes));
		if (maxMag > 0) {
			for (let i = 0; i < fftResult.magnitudes.length; i++) {
				spectrumBuffer[i] = Math.floor((fftResult.magnitudes[i] / maxMag) * 255);
			}
		}
		state.spectrum = spectrumBuffer;
		state.phases = fftResult.phases; // Expose phase information for visualization

		state.amplitude = amplitude;
		const instrumentType = untrack(() => instrument.value as InstrumentKind);
		const tuning = getDetectionConfig(instrumentType, instrumentMap, genericDetectionConfig);

		// Calculate high-frequency weighted, positive-only spectral flux for onset detection
		// Now using custom FFT with magnitude and phase information
		const spectralFlux = calculateSpectralFluxWeighted(fftResult, previousFFT);
		// Use frequency-focused phase deviation for monophonic instruments (better repeat note detection)
		const phaseDeviation = calculatePhaseDeviationFocused(
			fftResult,
			previousFFT,
			analyser.fftSize / 4,
			freq, // Focus on detected note's harmonics
			audioContext.sampleRate,
			analyser.fftSize
		);

		// Track frequency, amplitude, and flux history
		frequencyHistory.push(freq);
		amplitudeHistory.push(amplitude);
		fluxHistory.push(spectralFlux);
		if (frequencyHistory.length > 20) frequencyHistory.shift();
		if (amplitudeHistory.length > 20) amplitudeHistory.shift();
		if (fluxHistory.length > 30) fluxHistory.shift(); // Keep more for statistical reliability

		// Dynamic threshold adapts to signal level and background noise
		const dynamicFluxThreshold = calculateDynamicThreshold(fluxHistory, 10, 2.5);

		// ============================================================================
		// ONSET DETECTION
		// ============================================================================
		// Professional approach: detect new note starts using spectral flux + phase deviation
		// - Spectral flux spike = sudden energy increase (especially in upper harmonics)
		// - Phase deviation = sudden phase reset across bins (even without energy change)
		// - Refractory period prevents false retriggering from vibrato/tremolo
		// - Works even when previous notes are sustaining

		const timeSinceLastOnset = now - lastOnsetTime;
		const canTriggerOnset = timeSinceLastOnset > tuning.onsetRefractoryMs;

		// Combine spectral flux and phase deviation for robust detection
		// Phase deviation catches repeat notes that flux might miss
		const normalizedPhase = phaseDeviation / Math.PI; // 0-1 range
		const onsetStrength = tuning.usePhaseDeviation
			? (1 - tuning.phaseWeight) * spectralFlux + tuning.phaseWeight * normalizedPhase
			: spectralFlux;

		// Detect quick amplitude changes (bow direction change in legato playing)
		// Use peak amplitude since last onset as reference for more reliable detection
		let hasQuickAmplitudeChange = false;

		// Track peak amplitude since last onset
		if (amplitude > peakAmplitudeSinceOnset) {
			peakAmplitudeSinceOnset = amplitude;
		}

		if (amplitudeHistory.length >= 3 && peakAmplitudeSinceOnset > 0.03) {
			const current = amplitude;
			const recent2Min = Math.min(...amplitudeHistory.slice(-2));

			// Significant drop from peak: current/recent dropped below 50% of peak
			const significantDrop = recent2Min < peakAmplitudeSinceOnset * 0.5;
			// Quick recovery: amplitude rising from minimum
			const isRising = current > recent2Min * 1.1;
			// Near-zero dip: amplitude dropped very low (close to zero as user mentioned)
			const nearZeroDip = recent2Min < 0.02 && peakAmplitudeSinceOnset > 0.1;

			hasQuickAmplitudeChange =
				(significantDrop && isRising) || (nearZeroDip && current > recent2Min * 1.2);
		}

		// Detect slow vs fast pitch changes
		// Slow drift (vibrato/correction) should not trigger onset
		let hasFastPitchChange = false;
		if (frequencyHistory.length >= 5 && freq > 0) {
			const recent3 = frequencyHistory.slice(-3);
			const older2 = frequencyHistory.slice(-5, -3);
			const recent3Avg = recent3.reduce((a, b) => a + b) / recent3.length;
			const older2Avg = older2.reduce((a, b) => a + b) / older2.length;

			// Fast pitch change: >50 cents (~3% frequency change) in last ~100ms
			const pitchDiffCents = Math.abs(1200 * Math.log2(recent3Avg / older2Avg));
			hasFastPitchChange = pitchDiffCents > 50; // Sudden pitch jump = likely new note
		}

		// For repeat notes on sustaining instruments with valid pitch:
		// Use configurable phase thresholds from instrument config
		const hasPitch = freq > 0 && frequencyHistory.length >= 3;
		const hasStrongPhaseReset = normalizedPhase > tuning.strongPhaseThreshold; // Configurable strong threshold
		const hasModeratePhaseReset = normalizedPhase > tuning.moderatePhaseThreshold; // Configurable moderate threshold

		// Detection paths (all require pitch + minimum amplitude)
		const strongPhaseOnset = hasPitch && hasStrongPhaseReset;
		const legatoOnset = hasPitch && hasModeratePhaseReset && hasQuickAmplitudeChange;
		const amplitudeOnset =
			hasPitch && hasQuickAmplitudeChange && amplitude > tuning.onsetMinAmplitude * 1.5;
		// New: fast pitch change can indicate string crossing or new note start
		const pitchChangeOnset = hasPitch && hasFastPitchChange && hasModeratePhaseReset;

		// Onset detection requires valid pitch for ALL paths
		const meetsFrequency = hasPitch && isFrequencyStable(freq, frequencyHistory);
		const hasOnsetSpike = onsetStrength > dynamicFluxThreshold;
		const hasMinAmplitude = amplitude > tuning.onsetMinAmplitude;

		// Combine all detection methods - ALL paths now require hasPitch
		// Traditional onset respects refractory period
		const traditionalOnset =
			canTriggerOnset && hasOnsetSpike && hasMinAmplitude && meetsFrequency && hasPitch;
		// Phase/amplitude-based detection: more lenient refractory override
		const veryStrongPhase = normalizedPhase > tuning.strongPhaseThreshold * 0.8; // 80% of strong threshold for override
		const canOverrideRefractory = veryStrongPhase || hasQuickAmplitudeChange;
		const phaseBasedOnset =
			(strongPhaseOnset || legatoOnset || amplitudeOnset || pitchChangeOnset) &&
			hasMinAmplitude &&
			(canTriggerOnset || canOverrideRefractory);

		const onsetDetected = traditionalOnset || phaseBasedOnset;

		if (onsetDetected) {
			lastOnsetTime = now;
			state.isNoteActive = true;
			peakAmplitudeSinceOnset = amplitude; // Reset peak for next note
			console.log(
				`Onset: phase=${normalizedPhase.toFixed(3)} flux=${spectralFlux.toFixed(3)} amp=${amplitude.toFixed(3)} peak=${peakAmplitudeSinceOnset.toFixed(3)} ampChange=${hasQuickAmplitudeChange} pitchChange=${hasFastPitchChange} freq=${freq.toFixed(1)}`
			);
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

		// Store FFT result for next frame
		previousFFT = fftResult;

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
