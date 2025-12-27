import { untrack } from 'svelte';
import {
	autoCorrelate,
	centsOff,
	frequencyFromNoteNumber,
	noteFromPitch,
	noteNameFromMidi,
	type Accidental
} from '$lib/tuner/tune';
import { calculateAmplitude, getDetectionConfig, isFrequencyStable } from './analysis';
import { performFFT, type FFTResult } from './fftAnalysis';
import {
	calculateSpectralFluxWeighted,
	calculatePhaseDeviationFocused,
	calculateHarmonicFlux,
	calculateHighFrequencyBurst
} from './spectralAnalysis';
import {
	createAudioChain,
	createAudioChainFromFile,
	teardownAudioChain,
	type AudioChain
} from './audioGraph';
import { genericDetectionConfig, instrumentMap } from '$lib/config/instruments';
import { onsetDetectionConfig } from '$lib/config/onset';
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

	// ========================================================================
	// ONSET DETECTION STATE (Step 0 - Analysis setup)
	// ========================================================================
	// Sliding history windows for local normalization (300-500ms ~= 30-50 frames at 100fps)
	const excitationHistory: number[] = []; // HF spectral flux history
	const harmonicFluxHistory: number[] = []; // Harmonic-focused flux history
	const amplitudeDeltaHistory: number[] = []; // Amplitude slope history
	const phaseHistory: number[] = []; // Phase deviation history
	const HISTORY_LENGTH = onsetDetectionConfig.historyLength;

	// Legato rebound tracking (dip→rise state)
	let legatoDipActive = false;
	let legatoRiseFrames = 0;
	let legatoDipMinAmp = 0;
	let legatoRiseElapsedMs = 0;
	let legatoSlopeSumNorm = 0;
	let legatoSlopeCount = 0;

	// State from previous frames
	let previousFFT: FFTResult | null = null;
	let previousPitch: number | null = null;
	let stablePitch: number | null = null; // Recent stable pitch for change detection
	let pitchConfidence = 0;

	// Cooldown enforcement (refractory period)
	let lastOnsetTime = 0;
	const COOLDOWN_MS = onsetDetectionConfig.cooldownMs;

	let spectrumBuffer: Uint8Array | null = null; // Latest magnitude spectrum (byte values)

	const state = $state<TunerState>({
		isListening: false,
		frequency: null,
		cents: null,
		note: null,
		error: null,
		needsUserGesture: false,
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

	// Note end tracking (separate from onset detection - Step 6)
	let peakAmplitudeSinceOnset = 0;
	let endCandidateStart: number | null = null;

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
			state.needsUserGesture = false;
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
			if (err instanceof DOMException && err.name === 'NotAllowedError') {
				state.error = 'Tap to enable audio (browser blocked autoplay).';
				state.needsUserGesture = true;
			} else {
				state.error = 'Unable to start microphone. Please check permissions.';
			}
			stop();
		}
	}

	async function startWithFile(audioUrl: string) {
		try {
			state.error = null;
			state.needsUserGesture = false;
			stop();

			audioContext = audioContext ?? new AudioContext();
			await audioContext.resume();

			gain.value = clampGain(gain.value);
			audioChain = await createAudioChainFromFile(audioContext, audioUrl, gain.value);
			buffer = audioChain.buffer;

			state.isListening = true;
			tick();
		} catch (err) {
			console.error(err);
			if (err instanceof DOMException && err.name === 'NotAllowedError') {
				state.error = 'Tap to enable audio (browser blocked autoplay).';
				state.needsUserGesture = true;
			} else {
				state.error = 'Unable to start audio file playback.';
			}
			stop();
		}
	}

	async function resumeAfterGesture(audioUrl?: string) {
		try {
			if (!audioContext) {
				audioContext = new AudioContext();
			}
			await audioContext.resume();
			state.needsUserGesture = false;
			if (audioUrl) {
				await startWithFile(audioUrl);
			} else if (audioChain?.sourceType === 'microphone') {
				await start();
			} else {
				await startWithFile('/test-audio.wav');
			}
		} catch (err) {
			console.error(err);
			state.error = 'Audio still blocked; please try again.';
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

		// Reset onset detection state
		lastOnsetTime = 0;
		peakAmplitudeSinceOnset = 0;
		previousFFT = null;
		previousPitch = null;
		stablePitch = null;
		pitchConfidence = 0;
		excitationHistory.length = 0;
		phaseHistory.length = 0;
		endCandidateStart = null;

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
		const amplitude = calculateAmplitude(tempData);

		// ========================================================================
		// STEP 1 — PER-FRAME FEATURE EXTRACTION
		// ========================================================================

		// 1.1: Compute spectrum (magnitudes + phases)
		const fftResult = performFFT(tempData, audioContext.sampleRate, true);

		// 1.2: Estimate pitch (with confidence)
		// Update history BEFORE stability check
		const freq = autoCorrelate(tempData, audioContext.sampleRate);
		frequencyHistory.push(freq);
		amplitudeHistory.push(amplitude);

		// Track amplitude slope for legato dip/rise detection
		const previousAmplitude =
			amplitudeHistory.length > 1 ? amplitudeHistory[amplitudeHistory.length - 2] : amplitude;
		const amplitudeDelta = amplitude - previousAmplitude;
		amplitudeDeltaHistory.push(amplitudeDelta);

		if (frequencyHistory.length > 20) frequencyHistory.shift();
		if (amplitudeHistory.length > 20) amplitudeHistory.shift();
		if (amplitudeDeltaHistory.length > 20) amplitudeDeltaHistory.shift();

		const hasPitch = freq > 0 && isFrequencyStable(freq, frequencyHistory);

		// 1.3: Compute excitation cue (HF spectral flux)
		// High-frequency weighted, positive-only spectral flux
		const excitationCue = calculateSpectralFluxWeighted(fftResult, previousFFT);

		// 1.3b: Harmonic-focused flux (tracks bursts on harmonic stack)
		// If pitch is not locked, fall back to high-frequency burst detector
		const harmonicFluxCue = hasPitch
			? calculateHarmonicFlux(fftResult, previousFFT, freq, 2, 10, 2)
			: calculateHighFrequencyBurst(fftResult, previousFFT, 0.35);

		// 1.4: Compute phase disruption cue
		// Measure phase deviation (predicts phase advance, measures deviation)
		const phaseCueFundamental = hasPitch ? freq : null;
		const phaseCue = calculatePhaseDeviationFocused(
			fftResult,
			previousFFT,
			analyser.fftSize / 4, // hop size
			phaseCueFundamental, // Focus on detected pitch harmonics when stable
			audioContext.sampleRate,
			analyser.fftSize
		);

		// Track pitch confidence: stable pitch over multiple frames
		if (hasPitch) {
			if (previousPitch === null) {
				pitchConfidence = 0.3; // Initial confidence
				stablePitch = freq;
			} else {
				const pitchDiffCents = Math.abs(1200 * Math.log2(freq / previousPitch));
				if (pitchDiffCents < 30) {
					// Stable: increase confidence
					pitchConfidence = Math.min(1.0, pitchConfidence + 0.15);
					// Update stable pitch with smoothing
					stablePitch = stablePitch ? stablePitch * 0.7 + freq * 0.3 : freq;
				} else {
					// Unstable: reduce confidence
					pitchConfidence = Math.max(0, pitchConfidence - 0.2);
				}
			}
			previousPitch = freq;
		} else {
			pitchConfidence = Math.max(0, pitchConfidence - 0.1);
			previousPitch = null;
		}

		// ========================================================================
		// STEP 2 — LOCAL NORMALIZATION
		// ========================================================================

		// Maintain sliding history for excitation and phase cues
		excitationHistory.push(excitationCue);
		harmonicFluxHistory.push(harmonicFluxCue);
		phaseHistory.push(phaseCue);
		if (excitationHistory.length > HISTORY_LENGTH) excitationHistory.shift();
		if (harmonicFluxHistory.length > HISTORY_LENGTH) harmonicFluxHistory.shift();
		if (phaseHistory.length > HISTORY_LENGTH) phaseHistory.shift();

		// Compute local baseline (median) and spread (MAD - median absolute deviation)
		const computeNormalized = (value: number, history: number[]) => {
			if (history.length < 10) return 0; // Need minimum history

			const sorted = [...history].sort((a, b) => a - b);
			const median = sorted[Math.floor(sorted.length / 2)];

			// Median absolute deviation for robust spread estimation
			const deviations = history.map((v) => Math.abs(v - median));
			const sortedDev = deviations.sort((a, b) => a - b);
			const mad = sortedDev[Math.floor(sortedDev.length / 2)];

			// Express current value as relative deviation from baseline
			// MAD * 1.4826 approximates standard deviation for normal distributions
			const spread = mad * 1.4826;
			if (spread < 0.0001) return 0; // Avoid division by zero

			return (value - median) / spread;
		};

		const normalizedExcitation = computeNormalized(excitationCue, excitationHistory);
		const normalizedHarmonicFlux = computeNormalized(harmonicFluxCue, harmonicFluxHistory);
		const prevHarmonicFlux =
			harmonicFluxHistory.length > 1 ? harmonicFluxHistory[harmonicFluxHistory.length - 2] : 0;
		const relativeHarmonicIncrease =
			prevHarmonicFlux > 0 ? (harmonicFluxCue - prevHarmonicFlux) / prevHarmonicFlux : Infinity;
		const normalizedAmplitudeSlope = computeNormalized(amplitudeDelta, amplitudeDeltaHistory);
		const normalizedPhase = computeNormalized(phaseCue, phaseHistory);
		const normalizedAmplitude = computeNormalized(amplitude, amplitudeHistory);

		// Update dip→rise state for legato detection
		if (normalizedAmplitude < onsetDetectionConfig.b5_minDipBelow) {
			legatoDipActive = true;
			legatoRiseFrames = 0;
			legatoDipMinAmp = amplitude;
			legatoRiseElapsedMs = 0;
			legatoSlopeSumNorm = 0;
			legatoSlopeCount = 0;
		} else if (legatoDipActive) {
			// Accumulate rise metrics
			legatoRiseElapsedMs += dt;
			legatoSlopeSumNorm += Math.max(0, normalizedAmplitudeSlope);
			legatoSlopeCount += 1;
			if (normalizedAmplitudeSlope > onsetDetectionConfig.b5_minAmplitudeSlope) {
				legatoRiseFrames++;
			}
			// If amplitude falls again significantly, cancel rebound tracking
			if (normalizedAmplitude < onsetDetectionConfig.b5_minDipBelow - 0.1) {
				legatoDipActive = false;
				legatoRiseFrames = 0;
			}
		}

		// ========================================================================
		// STEP 3 — PITCH CHANGE DETECTION
		// ========================================================================

		let pitchChangeDetected = false;
		if (hasPitch && stablePitch && pitchConfidence > 0.6) {
			const pitchChangeCents = Math.abs(1200 * Math.log2(freq / stablePitch));
			// Pitch change > 25 cents (~1/4 semitone) = new note
			if (pitchChangeCents > 25) {
				pitchChangeDetected = true;
			}
		}

		// ========================================================================
		// STEP 4 — ONSET DECISION RULES
		// ========================================================================

		const timeSinceLastOnset = now - lastOnsetTime;
		const instrumentType = untrack(() => instrument.value as InstrumentKind);
		const tuning = getDetectionConfig(instrumentType, instrumentMap, genericDetectionConfig);

		let onsetDetected = false;

		// Check cooldown FIRST (Step 5 enforcement)
		const cooldownActive = timeSinceLastOnset < COOLDOWN_MS;

		// Minimum amplitude check for all rules
		const hasMinAmplitude = amplitude > tuning.onsetMinAmplitude;

		// DEBUG: Log detection state every 30 frames (~300ms)
		if (Math.random() < 0.033) {
			console.log('[DEBUG]', {
				excitationCue: excitationCue.toFixed(4),
				phaseCue: phaseCue.toFixed(4),
				normalizedExcitation: normalizedExcitation.toFixed(2),
				normalizedPhase: normalizedPhase.toFixed(2),
				historyLength: excitationHistory.length,
				hasPitch,
				pitchConfidence: pitchConfidence.toFixed(2),
				hasMinAmplitude,
				amplitude: amplitude.toFixed(3),
				minRequired: tuning.onsetMinAmplitude.toFixed(3),
				cooldownActive,
				timeSinceLastOnset: Math.round(timeSinceLastOnset)
			});
		}

		if (!cooldownActive && hasMinAmplitude) {
			// Rule A — Guaranteed onset: pitch change with high confidence
			if (pitchChangeDetected) {
				onsetDetected = true;
				console.log(
					`✓ Onset: Rule A (pitch change) - ${freq.toFixed(1)}Hz, confidence=${pitchConfidence.toFixed(2)}`
				);
			}
			// Rule B1 — Re-articulation: both excitation + phase cues (relaxed thresholds)
			else if (
				hasPitch &&
				normalizedExcitation > onsetDetectionConfig.b1_minNormalizedExcitation && // Moderate excitation
				normalizedPhase > onsetDetectionConfig.b1_minNormalizedPhase // Moderate phase disruption
			) {
				onsetDetected = true;
				console.log(
					`✓ Onset: Rule B1 (both cues) - exc=${normalizedExcitation.toFixed(1)}σ phase=${normalizedPhase.toFixed(1)}σ freq=${freq.toFixed(1)}Hz`
				);
			}
			// Rule B2 — Asymmetric: strong phase + weak/negative excitation (require pitch lock)
			else if (
				hasPitch &&
				normalizedPhase > onsetDetectionConfig.b2_minNormalizedPhase && // Strong phase
				normalizedExcitation > onsetDetectionConfig.b2_minNormalizedExcitation // Allow negative excitation
			) {
				onsetDetected = true;
				console.log(
					`✓ Onset: Rule B2 (phase-dominant) - phase=${normalizedPhase.toFixed(1)}σ exc=${normalizedExcitation.toFixed(1)}σ freq=${freq.toFixed(1)}Hz`
				);
			}
			// Rule B3 — Very strong excitation alone (for attacks with clear energy spike)
			else if (hasPitch && normalizedExcitation > onsetDetectionConfig.b3_minNormalizedExcitation) {
				onsetDetected = true;
				console.log(
					`✓ Onset: Rule B3 (strong excitation) - exc=${normalizedExcitation.toFixed(1)}σ freq=${freq.toFixed(1)}Hz`
				);
			}
			// Rule B4 — Harmonic flux burst (bow direction change / re-bow)
			else if (
				hasPitch &&
				normalizedHarmonicFlux > onsetDetectionConfig.b4_minNormalizedHarmonicFlux &&
				relativeHarmonicIncrease >= onsetDetectionConfig.b4_minRelativeIncrease
			) {
				onsetDetected = true;
				console.log(
					`✓ Onset: Rule B4 (harmonic flux) - hFlux=${normalizedHarmonicFlux.toFixed(1)}σ rel+${(relativeHarmonicIncrease * 100).toFixed(0)}% freq=${freq.toFixed(1)}Hz`
				);
			}
			// Rule B5 — Legato rebound: dip then rise with harmonic brightening
			else if (
				hasPitch &&
				legatoDipActive &&
				legatoRiseFrames >= onsetDetectionConfig.b5_minRiseFrames &&
				normalizedHarmonicFlux > onsetDetectionConfig.b5_minNormalizedHarmonicFlux
			) {
				const avgSlope = legatoSlopeCount > 0 ? legatoSlopeSumNorm / legatoSlopeCount : 0;
				const percentRise =
					legatoDipMinAmp > 0 ? (amplitude - legatoDipMinAmp) / legatoDipMinAmp : 0;
				const withinWindow = legatoRiseElapsedMs <= onsetDetectionConfig.b5_riseWindowMs;
				if (
					withinWindow &&
					avgSlope >= onsetDetectionConfig.b5_minAvgSlope &&
					percentRise >= onsetDetectionConfig.b5_minRisePercent
				) {
					onsetDetected = true;
					legatoDipActive = false;
					legatoRiseFrames = 0;
					legatoSlopeSumNorm = 0;
					legatoSlopeCount = 0;
					console.log(
						`✓ Onset: Rule B5 (legato rebound) - hFlux=${normalizedHarmonicFlux.toFixed(1)}σ avgSlope=${avgSlope.toFixed(2)} rise=${(percentRise * 100).toFixed(0)}% window=${Math.round(legatoRiseElapsedMs)}ms freq=${freq.toFixed(1)}Hz`
					);
				}
			}
			// Rule B6 — Burst-on-rise without pitch lock (fallback)
			else if (
				!hasPitch &&
				normalizedHarmonicFlux > onsetDetectionConfig.b6_minNormalizedHarmonicFlux &&
				relativeHarmonicIncrease >= onsetDetectionConfig.b6_minRelativeIncrease &&
				normalizedAmplitudeSlope > onsetDetectionConfig.b6_minAmplitudeSlope &&
				amplitude > tuning.onsetMinAmplitude * onsetDetectionConfig.b6_minAmplitudeGateMultiplier
			) {
				onsetDetected = true;
				console.log(
					`✓ Onset: Rule B6 (burst-on-rise) - hFlux=${normalizedHarmonicFlux.toFixed(1)}σ rel+${(relativeHarmonicIncrease * 100).toFixed(0)}% ampSlope=${normalizedAmplitudeSlope.toFixed(2)}`
				);
			}
			// Rule C — Raw phase threshold: very reliable for phase-based attacks
			else if (hasPitch && phaseCue > onsetDetectionConfig.c_minRawPhase) {
				// Raw phase alone (no excitation requirement)
				// Catches all plucks/attacks where phase disruption is clear
				onsetDetected = true;
				console.log(
					`✓ Onset: Rule C (raw phase) - rawPhase=${phaseCue.toFixed(2)} freq=${freq.toFixed(1)}Hz`
				);
			}
			// Rule D — Soft-attack fallback: very strong normalized phase disruption alone
			else if (normalizedPhase > onsetDetectionConfig.d_minNormalizedPhase) {
				// Very strong phase
				onsetDetected = true;
				console.log(`✓ Onset: Rule D (soft-attack) - phase=${normalizedPhase.toFixed(1)}σ`);
			}
			// DEBUG: Log near-misses
			else if (
				hasPitch &&
				(normalizedExcitation > 1.2 || normalizedPhase > 1.2 || phaseCue > 1.3)
			) {
				console.log(
					`✗ Near-miss: exc=${normalizedExcitation.toFixed(1)}σ phase=${normalizedPhase.toFixed(1)}σ rawPhase=${phaseCue.toFixed(2)} rawExc=${excitationCue.toFixed(3)}`
				);
			}
		} else {
			// Log why we couldn't check rules
			if (cooldownActive && Math.random() < 0.1) {
				console.log(`⏸ Cooldown active: ${timeSinceLastOnset.toFixed(0)}ms / ${COOLDOWN_MS}ms`);
			}
			if (!hasMinAmplitude && Math.random() < 0.1) {
				console.log(
					`⏸ Below min amplitude: ${amplitude.toFixed(3)} < ${tuning.onsetMinAmplitude.toFixed(3)}`
				);
			}
		}

		// Apply onset if detected
		if (onsetDetected) {
			lastOnsetTime = now;
			state.isNoteActive = true;
			peakAmplitudeSinceOnset = amplitude;
			// Only update stable pitch if confidence is high (after pitch change onset)
			// Otherwise let it build naturally through the tracking above
			if (pitchChangeDetected && hasPitch) {
				stablePitch = freq;
			}
		}

		// ========================================================================
		// STEP 6 — NOTE END TRACKING (separate path, no feed into onset detection)
		// ========================================================================

		if (state.isNoteActive) {
			// Track peak amplitude for decay detection
			if (amplitude > peakAmplitudeSinceOnset) {
				peakAmplitudeSinceOnset = amplitude;
			}

			// Note end conditions (independent of onset logic)
			const lowAmplitude = amplitude < tuning.onsetMinAmplitude * tuning.endMinAmplitudeRatio;
			// End when amplitude dips significantly relative to the post-onset peak
			const relativeDrop = amplitude < peakAmplitudeSinceOnset * tuning.endRelativeDropRatio;
			const pitchLost = !hasPitch || pitchConfidence < 0.3;
			const endCondition = lowAmplitude || pitchLost || relativeDrop;

			if (endCondition) {
				if (endCandidateStart === null) endCandidateStart = now;
				const elapsed = now - endCandidateStart;
				// Require sustained end condition before ending note
				if (elapsed >= tuning.endHoldMs) {
					state.isNoteActive = false;
					endCandidateStart = null;
					peakAmplitudeSinceOnset = 0;
					// Gradually decay confidence rather than instant reset
					// This helps maintain pitch tracking across quick note sequences
					pitchConfidence *= 0.5;
					console.log(
						`• End: amplitude=${amplitude.toFixed(3)} low=${lowAmplitude} relDrop=${relativeDrop} elapsed=${Math.round(elapsed)}ms`
					);
				}
			} else {
				endCandidateStart = null;
			}
		}

		// ========================================================================
		// STEP 7 — STATE UPDATE
		// ========================================================================

		// Store current frame data for next iteration
		previousFFT = fftResult;

		// Convert magnitudes to byte range for visualization (0-255)
		spectrumBuffer = new Uint8Array(fftResult.magnitudes.length);
		const maxMag = Math.max(...Array.from(fftResult.magnitudes));
		if (maxMag > 0) {
			for (let i = 0; i < fftResult.magnitudes.length; i++) {
				spectrumBuffer[i] = Math.floor((fftResult.magnitudes[i] / maxMag) * 255);
			}
		}
		state.spectrum = spectrumBuffer;
		state.phases = fftResult.phases;
		state.amplitude = amplitude;

		// ========================================================================
		// PITCH TRACKING & NOTE OUTPUT
		// ========================================================================

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
		startWithFile,
		stop,
		refreshDevices,
		checkSupport,
		resetHoldDuration,
		destroy: stop,
		resumeAfterGesture,
		get sourceType() {
			return audioChain?.sourceType ?? null;
		}
	};
}
