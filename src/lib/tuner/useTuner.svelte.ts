import { untrack } from 'svelte';
import { SvelteDate } from 'svelte/reactivity';
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
	getDetectionConfig,
	isFrequencyStable,
	isFrequencyInInstrumentRange
} from './analysis';
import { performFFT } from './fftAnalysis';
import {
	calculateSpectralFluxWeighted,
	calculatePhaseDeviationFocused,
	calculateHarmonicFlux,
	calculateHighFrequencyBurst,
	calculateHighFrequencyEnergy,
	applySpectralWhitening,
	applyMaximumFilter,
	applyLogFrequencyGrouping,
	computeAdaptiveThreshold
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
import { createMLState } from './mlState.svelte';
import { createGainState } from './gainControl.svelte';
import {
	createLatencyTracking,
	updateLatencyMilestones,
	recordOnset,
	recordNoteOutput,
	resetLatencyTracking
} from './latencyTracking.svelte';
import {
	createOnsetAnalysisState,
	computeNormalized,
	updateOnsetHistories,
	updateOnsetFunction,
	updateLegatoState,
	updatePhaseCue,
	resetOnsetAnalysis
} from './onsetAnalysis.svelte';
import type { InstrumentKind, TunerOptions, TunerState } from './types';
export type { InstrumentKind, TunerOptions, TunerState } from './types';

/**
 * Create a tuner instance for pitch detection and audio analysis.
 *
 * IMPORTANT FOR SAFARI COMPATIBILITY:
 * - The start() method must be called directly from a user gesture event (click, touch)
 * - Do NOT call start() from within an async callback or after any awaits
 * - Safari (especially iOS) requires getUserMedia to be in the direct call stack of user interaction
 * - Example: onclick={tuner.start} ✓   onclick={() => setTimeout(tuner.start, 0)} ✗
 */
export function createTuner(options: TunerOptions = {}) {
	let audioContext: AudioContext | null = null;
	let audioChain: AudioChain | null = null;
	// Track the user's intended source between blocked autoplay and resume
	let desiredSourceType: 'microphone' | 'file' | null = null;
	let rafId: number | null = null;
	let buffer: Float32Array | null = null;
	let noteDebounceId: number | null = null;
	let debouncedNote: string | null = null;
	let pendingNote: string | null = null;
	let isPaused = false; // Track if tuner is paused
	const amplitudeHistory: number[] = [];
	const debug = options.debug ?? false; // Capture debug flag
	const onOnsetCallback = options.onOnset; // Callback for onset events

	// Detect Safari for browser-specific handling
	const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
	const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

	// ========================================================================
	// MODULARIZED STATE
	// ========================================================================
	const mlState = createMLState(options.basePath ?? '');
	const gainState = createGainState({
		gain: options.gain ?? 2,
		autoGain: options.autoGain ?? true,
		targetAmplitude: options.targetAmplitude ?? 0.7,
		maxGain: options.maxGain ?? 500,
		minGain: options.minGain ?? 0.1,
		gainAdjustRate: options.gainAdjustRate ?? 0.3,
		autoGainInterval: options.autoGainInterval ?? 150
	});
	const latencyTracking = createLatencyTracking();
	const onsetAnalysis = createOnsetAnalysisState();

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
		hasPitch: false,
		heldSixteenths: 0,
		spectrum: null,
		phases: null,
		lastOnsetRule: null,
		spectralFlux: 0,
		phaseDeviation: 0,
		highFrequencyEnergy: 0,
		mlOnsetDetected: false,
		mlOnsetProbability: 0
	});

	// Performance monitoring
	const performanceMetrics = $state({
		timeDomainMs: 0,
		fftMs: 0,
		whitteningMs: 0,
		pitchDetectionMs: 0,
		normalizationMs: 0,
		onsetDecisionMs: 0,
		noteEndMs: 0,
		pitchTrackingMs: 0,
		autoGainMs: 0,
		totalMs: 0,
		frameCount: 0,
		// Latency tracking (end-to-end from synth start to onset)
		timeSinceFirstAmplitude: 0, // ms since amplitude first exceeded threshold
		timeSincePitchLocked: 0, // ms since hasPitch became true
		timeSinceOnset: 0, // ms since last onset fired
		timeSinceNoteOutput: 0, // ms from onset to note appearing (includes debounce)
		lastOnsetTimestamp: 0
	});

	const a4 = $state({ value: options.a4 ?? 442 });
	const accidental = $state({ value: options.accidental ?? 'sharp' });
	const debounceTime = $state({ value: options.debounceTime ?? 200 });
	const amplitudeThreshold = $state({ value: options.amplitudeThreshold ?? 0.02 });
	const instrument = $state({ value: options.instrument ?? 'generic' });
	const tempoBPM = $state({ value: options.tempoBPM ?? 120 });

	// Create gain state wrappers for svelte reactivity
	const gain = $state({ value: gainState.state.gain });
	const autoGainEnabled = $state({ value: gainState.state.autoGainEnabled });
	const targetAmplitude = $state({ value: gainState.state.targetAmplitude });
	const autoGainInterval = $state({ value: gainState.state.autoGainInterval });

	// Internal tracking for note hold duration
	let lastTickAt: number | null = null;
	let holdMs = 0;
	let heldNote: string | null = null;

	// Note end tracking (separate from onset detection - Step 6)
	let peakAmplitudeSinceOnset = 0;
	let endCandidateStart: number | null = null;

	// Spectrum visualization buffer
	let spectrumBuffer: Uint8Array | null = null; // Latest magnitude spectrum (byte values)

	function clampGain(value: number): number {
		return gainState.clampGain(value);
	}

	function debugLog(...args: unknown[]): void {
		if (debug) {
			const timestamp = new SvelteDate().toISOString().split('T')[1].slice(0, -1); // HH:MM:SS.mmm
			console.log(`[Tuner ${timestamp}]`, ...args);
		}
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
			desiredSourceType = 'microphone';
			stop();

			// CRITICAL FOR SAFARI: Create AudioContext and start getUserMedia synchronously
			// within the user gesture event handler. Any awaits here break Safari's gesture chain.
			if (!audioContext) {
				audioContext = new AudioContext();
			}

			// Start getUserMedia immediately (synchronously) - do NOT await anything first
			gain.value = clampGain(gain.value);
			const chainPromise = createAudioChain(audioContext, state.selectedDeviceId, gain.value);

			// Resume audio context (can be done in parallel with getUserMedia)
			const resumePromise =
				audioContext.state === 'suspended' ? audioContext.resume() : Promise.resolve();

			// Now we can await both promises
			const [chain] = await Promise.all([chainPromise, resumePromise]);
			audioChain = chain;
			buffer = audioChain.buffer;

			state.isListening = true;
			refreshDevices();

			// Load ML model asynchronously (non-blocking)
			mlState.ensureMlModelLoad();

			tick();
		} catch (err) {
			console.error('[Tuner] Start failed:', err);
			if (err instanceof DOMException) {
				if (err.name === 'NotAllowedError') {
					if (isIOS || isSafari) {
						state.error = 'Microphone access denied. Please check Settings > Safari > Microphone.';
					} else {
						state.error = 'Tap to enable audio (browser blocked autoplay).';
					}
					state.needsUserGesture = true;
				} else if (err.name === 'NotFoundError') {
					state.error = 'No microphone found. Please connect a microphone.';
				} else if (err.name === 'NotReadableError') {
					state.error = 'Microphone is already in use by another application.';
				} else {
					state.error = `Microphone error: ${err.message}`;
				}
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
			desiredSourceType = 'file';
			stop();

			if (!audioContext) {
				audioContext = new AudioContext();
			}

			gain.value = clampGain(gain.value);
			const chainPromise = createAudioChainFromFile(audioContext, audioUrl, gain.value);
			const resumePromise =
				audioContext.state === 'suspended' ? audioContext.resume() : Promise.resolve();

			const [chain] = await Promise.all([chainPromise, resumePromise]);
			audioChain = chain;
			buffer = audioChain.buffer;

			state.isListening = true;
			tick();
		} catch (err) {
			console.error('[Tuner] Start file failed:', err);
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
			// DON'T await here - just ensure context exists
			// The actual resume will happen in start() or startWithFile()
			state.needsUserGesture = false;

			// Call start/startWithFile directly from user gesture (no awaits before this)
			// Prefer the user's intended source if known, regardless of audioUrl
			if (desiredSourceType === 'microphone') {
				await start();
			} else if (desiredSourceType === 'file') {
				await startWithFile(audioUrl ?? '/test-audio.wav');
			} else if (audioUrl) {
				await startWithFile(audioUrl);
			} else {
				await start();
			}
		} catch (err) {
			console.error('[Tuner] Resume after gesture failed:', err);
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
		peakAmplitudeSinceOnset = 0;
		endCandidateStart = null;
		resetOnsetAnalysis(onsetAnalysis);
		resetLatencyTracking(latencyTracking);

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

		// Skip processing if paused
		if (isPaused) {
			rafId = requestAnimationFrame(tick);
			return;
		}

		const analyser = chain.analyser;

		// Performance timing
		const tickStart = performance.now();
		let stepStart: number;

		const now = performance.now();
		if (lastTickAt === null) lastTickAt = now;
		const dt = now - lastTickAt;

		// Get instrument tuning parameters early (needed for latency tracking)
		const instrumentType = untrack(() => instrument.value as InstrumentKind);
		const tuning = getDetectionConfig(instrumentType, instrumentMap, genericDetectionConfig);

		// ========================================================================
		// TIME DOMAIN DATA
		// ========================================================================
		stepStart = performance.now();
		const tempData = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>;
		analyser.getFloatTimeDomainData(tempData);
		const amplitude = calculateAmplitude(tempData);
		performanceMetrics.timeDomainMs = performance.now() - stepStart;

		// ========================================================================
		// STEP 1 — PER-FRAME FEATURE EXTRACTION
		// ========================================================================

		// 1.1: Compute spectrum (magnitudes + phases)
		stepStart = performance.now();
		const fftResult = performFFT(tempData, audioContext.sampleRate, true);

		// 1.1a: Apply SuperFlux preprocessing (maximum filter + log-frequency grouping)
		// This reduces tonal components while preserving transients, and groups frequencies logarithmically
		const maxFiltered = applyMaximumFilter(fftResult.magnitudes, 3);
		const logMagnitudes = applyLogFrequencyGrouping(
			maxFiltered,
			audioContext.sampleRate,
			analyser.fftSize,
			3 // bands per octave
		);
		performanceMetrics.fftMs = performance.now() - stepStart;

		// 1.1b: Apply spectral whitening (if enabled)
		// Normalize each frequency bin by its running average to enhance transients
		stepStart = performance.now();
		let whitenedMagnitudes: Float32Array | null = null;
		if (onsetDetectionConfig.spectralWhiteningEnabled) {
			// Initialize magnitude averages on first frame
			if (onsetAnalysis.magnitudeAverages === null) {
				onsetAnalysis.magnitudeAverages = new Float32Array(fftResult.magnitudes.length);
				// Initialize with first frame magnitudes
				onsetAnalysis.magnitudeAverages.set(fftResult.magnitudes);
			}

			// Apply whitening and update averages
			whitenedMagnitudes = applySpectralWhitening(
				fftResult.magnitudes,
				onsetAnalysis.magnitudeAverages,
				onsetDetectionConfig.whiteningAlpha,
				onsetDetectionConfig.whiteningEpsilon,
				onsetDetectionConfig.whiteningMinClamp,
				onsetDetectionConfig.whiteningMaxClamp
			);
		}
		performanceMetrics.whitteningMs = performance.now() - stepStart;

		// 1.2: Estimate pitch (with confidence)
		// Update history BEFORE stability check
		stepStart = performance.now();
		const freq = autoCorrelate(tempData, audioContext.sampleRate);
		onsetAnalysis.frequencyHistory.push(freq);
		amplitudeHistory.push(amplitude);

		// Track amplitude slope for legato dip/rise detection
		const previousAmplitude =
			amplitudeHistory.length > 1 ? amplitudeHistory[amplitudeHistory.length - 2] : amplitude;
		const amplitudeDelta = amplitude - previousAmplitude;
		onsetAnalysis.amplitudeDeltaHistory.push(amplitudeDelta);

		if (onsetAnalysis.frequencyHistory.length > 10) onsetAnalysis.frequencyHistory.shift();
		if (amplitudeHistory.length > 10) amplitudeHistory.shift();
		if (onsetAnalysis.amplitudeDeltaHistory.length > 10)
			onsetAnalysis.amplitudeDeltaHistory.shift();

		// Check frequency stability first
		const isStable = freq > 0 && isFrequencyStable(freq, onsetAnalysis.frequencyHistory);

		// Then check if it's in the instrument's range (if instrument specified)
		const currentInstrument =
			instrument.value !== 'generic' ? instrumentMap[instrument.value] : null;
		const currentA4 = untrack(() => a4.value);

		let inRange = true;
		if (currentInstrument) {
			inRange = isFrequencyInInstrumentRange(freq, currentInstrument, currentA4);

			// Additional octave error check: only reject if there's evidence the lower octave
			// is the actual fundamental (check if it was recently stable or has strong energy)
			if (inRange && freq > 0 && onsetAnalysis.frequencyHistory.length > 5) {
				const halfFreq = freq / 2;
				const halfInRange = isFrequencyInInstrumentRange(halfFreq, currentInstrument, currentA4);

				// Only reject if the half frequency was recently detected as stable
				// (meaning it's likely the real fundamental and current freq is a harmonic)
				if (halfInRange) {
					const recentFrequencies = onsetAnalysis.frequencyHistory.slice(-5);
					const wasHalfFreqStable = recentFrequencies.some(
						(f) => f > 0 && Math.abs(f - halfFreq) / halfFreq < 0.02
					);

					if (wasHalfFreqStable) {
						// The lower octave was stable recently, so this is likely an octave error
						inRange = false;
					}
				}
			}
		}

		const hasPitch = isStable && inRange;

		// Track latency milestones
		updateLatencyMilestones(latencyTracking, now, amplitude, tuning.onsetMinAmplitude, hasPitch);

		// Calculate milestone gaps (one-time measurements)
		if (latencyTracking.sessionStartTime !== null && latencyTracking.firstAmplitudeTime !== null) {
			performanceMetrics.timeSinceFirstAmplitude =
				latencyTracking.firstAmplitudeTime - latencyTracking.sessionStartTime;
		}
		if (
			latencyTracking.firstAmplitudeTime !== null &&
			latencyTracking.firstPitchLockTime !== null
		) {
			performanceMetrics.timeSincePitchLocked =
				latencyTracking.firstPitchLockTime - latencyTracking.firstAmplitudeTime;
		}

		// 1.3: Compute excitation cue (HF spectral flux)
		// High-frequency weighted, positive-only spectral flux
		// Use whitened magnitudes if enabled, otherwise use log-grouped magnitudes from SuperFlux
		const excitationCue = whitenedMagnitudes
			? calculateSpectralFluxWeighted(whitenedMagnitudes, onsetAnalysis.previousWhitenedMagnitudes)
			: calculateSpectralFluxWeighted(logMagnitudes, onsetAnalysis.previousLogMagnitudes);

		// 1.3b: Harmonic-focused flux (tracks bursts on harmonic stack)
		// If pitch is not locked, fall back to high-frequency burst detector
		const harmonicFluxCue = hasPitch
			? calculateHarmonicFlux(fftResult, onsetAnalysis.previousFFT, freq, 2, 10, 2)
			: calculateHighFrequencyBurst(fftResult, onsetAnalysis.previousFFT, 0.35);

		// 1.4: Compute phase disruption cue
		// Measure phase deviation (predicts phase advance, measures deviation)
		const phaseCueFundamental = hasPitch ? freq : null;
		const rawPhaseCueAbs = calculatePhaseDeviationFocused(
			fftResult,
			onsetAnalysis.previousFFT,
			analyser.fftSize / 4, // hop size
			phaseCueFundamental, // Focus on detected pitch harmonics when stable
			audioContext.sampleRate,
			analyser.fftSize
		);

		// Smooth absolute phase deviation (good for visualization; reduces single-frame spikes)
		const phaseCueAbsSmoothed = updatePhaseCue(onsetAnalysis, rawPhaseCueAbs);
		const phaseCueForDetection = Math.max(
			0,
			phaseCueAbsSmoothed - onsetAnalysis.previousPhaseCueEma
		);

		performanceMetrics.pitchDetectionMs = performance.now() - stepStart;

		// Expose analysis metrics for visualization
		state.spectralFlux = excitationCue;
		state.phaseDeviation = phaseCueAbsSmoothed;
		state.hasPitch = hasPitch;
		state.highFrequencyEnergy = calculateHighFrequencyEnergy(fftResult, audioContext.sampleRate);

		// Track pitch confidence: stable pitch over multiple frames
		if (hasPitch) {
			if (onsetAnalysis.previousPitch === null) {
				onsetAnalysis.pitchConfidence = 0.3; // Initial confidence
				onsetAnalysis.stablePitch = freq;
			} else {
				const pitchDiffCents = Math.abs(1200 * Math.log2(freq / onsetAnalysis.previousPitch));
				if (pitchDiffCents < onsetDetectionConfig.pitchStabilityThresholdCents) {
					// Stable: increase confidence
					onsetAnalysis.pitchConfidence = Math.min(
						1.0,
						onsetAnalysis.pitchConfidence + onsetDetectionConfig.pitchConfidenceIncrement
					);
					// Update stable pitch with smoothing
					onsetAnalysis.stablePitch = onsetAnalysis.stablePitch
						? onsetAnalysis.stablePitch * 0.7 + freq * 0.3
						: freq;
				} else {
					// Unstable: reduce confidence
					onsetAnalysis.pitchConfidence = Math.max(
						0,
						onsetAnalysis.pitchConfidence - onsetDetectionConfig.pitchConfidenceDecrement
					);
				}
			}
			onsetAnalysis.previousPitch = freq;
		} else {
			onsetAnalysis.pitchConfidence = Math.max(0, onsetAnalysis.pitchConfidence - 0.1);
			onsetAnalysis.previousPitch = null;
		}

		// ========================================================================
		// STEP 2 — LOCAL NORMALIZATION
		// ========================================================================
		stepStart = performance.now();
		// ========================================================================

		// Maintain sliding history for excitation and phase cues
		updateOnsetHistories(onsetAnalysis, excitationCue, harmonicFluxCue, phaseCueForDetection);

		// Compute local baseline (median) and spread (MAD - median absolute deviation)
		const normalizedExcitation = computeNormalized(excitationCue, onsetAnalysis.excitationHistory);
		const normalizedHarmonicFlux = computeNormalized(
			harmonicFluxCue,
			onsetAnalysis.harmonicFluxHistory
		);
		const prevHarmonicFlux =
			onsetAnalysis.harmonicFluxHistory.length > 1
				? onsetAnalysis.harmonicFluxHistory[onsetAnalysis.harmonicFluxHistory.length - 2]
				: 0;
		// Avoid Infinity% when previous harmonic flux is ~0
		const relDen = Math.max(prevHarmonicFlux, 1e-6);
		const relativeHarmonicIncrease = (harmonicFluxCue - prevHarmonicFlux) / relDen;
		const normalizedAmplitudeSlope = computeNormalized(
			amplitudeDelta,
			onsetAnalysis.amplitudeDeltaHistory
		);
		const normalizedPhase = computeNormalized(phaseCueForDetection, onsetAnalysis.phaseHistory);
		const normalizedAmplitude = computeNormalized(amplitude, amplitudeHistory);
		performanceMetrics.normalizationMs = performance.now() - stepStart;

		// Track combined onset function for SuperFlux adaptive thresholding
		const combinedOnsetFunction = updateOnsetFunction(
			onsetAnalysis,
			normalizedExcitation,
			normalizedPhase
		);

		// Update dip→rise state for legato detection
		updateLegatoState(
			onsetAnalysis,
			normalizedAmplitude,
			normalizedAmplitudeSlope,
			dt,
			onsetDetectionConfig.b5_minDipBelow,
			onsetDetectionConfig.b5_minAmplitudeSlope
		);
		if (onsetAnalysis.legatoDipActive) {
			onsetAnalysis.legatoDipMinAmp = amplitude;
		}

		// ========================================================================
		// STEP 3 — PITCH CHANGE DETECTION
		// ========================================================================

		let pitchChangeDetected = false;
		if (
			hasPitch &&
			onsetAnalysis.stablePitch &&
			onsetAnalysis.pitchConfidence > onsetDetectionConfig.minPitchConfidenceForChange
		) {
			const pitchChangeCents = Math.abs(1200 * Math.log2(freq / onsetAnalysis.stablePitch));
			// Pitch change threshold from config
			if (pitchChangeCents > onsetDetectionConfig.pitchChangeThresholdCents) {
				pitchChangeDetected = true;
			}
		}

		// ========================================================================
		// STEP 4 — ONSET DECISION RULES
		// ========================================================================
		stepStart = performance.now();

		const timeSinceLastOnset = now - (latencyTracking.lastOnsetTime ?? 0);

		let onsetDetected = false;

		// Check cooldown FIRST (Step 5 enforcement)
		const cooldownMs = Math.max(0, onsetDetectionConfig.cooldownMs);
		const cooldownActive = timeSinceLastOnset < cooldownMs;

		// Minimum amplitude check for all rules
		const hasMinAmplitude = amplitude > tuning.onsetMinAmplitude;

		// Compute adaptive threshold using SuperFlux technique
		// This adjusts sensitivity based on local context
		const adaptiveThreshold =
			onsetAnalysis.onsetFunctionHistory.length > 10
				? computeAdaptiveThreshold(
						onsetAnalysis.onsetFunctionHistory,
						onsetAnalysis.onsetFunctionHistory.length - 1,
						onsetDetectionConfig.adaptiveWindowFrames,
						onsetDetectionConfig.adaptiveDeltaMultiplier
					)
				: 0;

		// B-rules only fire for re-articulation of the same note (pitch coherence check)
		// Allow ±20 cents deviation from stable pitch for repeat note detection (stricter)
		const frequencyCoherent =
			onsetAnalysis.stablePitch &&
			freq > 0 &&
			Math.abs(1200 * Math.log2(freq / onsetAnalysis.stablePitch)) < 20; // Within ±20 cents

		if (!cooldownActive && hasMinAmplitude) {
			// Rule A — Guaranteed onset: pitch change with high confidence
			if (pitchChangeDetected) {
				onsetDetected = true;
				state.lastOnsetRule = 'A';
				debugLog(
					`✓ Onset: Rule A (pitch change) - ${freq.toFixed(1)}Hz, confidence=${onsetAnalysis.pitchConfidence.toFixed(2)}`
				);
			}
			// Rule B1 — Re-articulation: excitation cue (sufficient for detecting attacks)
			// Enhanced with SuperFlux adaptive threshold
			// Only fires if frequency matches established pitch (same note re-articulation)
			else if (
				hasPitch &&
				frequencyCoherent &&
				normalizedExcitation > onsetDetectionConfig.b1_minNormalizedExcitation && // Moderate excitation
				(onsetAnalysis.onsetFunctionHistory.length < 10 ||
					combinedOnsetFunction > adaptiveThreshold) // Adaptive check
			) {
				onsetDetected = true;
				state.lastOnsetRule = 'B1';
				debugLog(
					`✓ Onset: Rule B1 (excitation-only) - exc=${normalizedExcitation.toFixed(1)}σ freq=${freq.toFixed(1)}Hz`
				);
			}
			// Rule B2 — Asymmetric: strong phase + weak/negative excitation (require pitch lock)
			// Only fires if frequency matches established pitch (same note re-articulation)
			else if (
				hasPitch &&
				frequencyCoherent &&
				normalizedPhase > onsetDetectionConfig.b2_minNormalizedPhase && // Strong phase
				normalizedExcitation > onsetDetectionConfig.b2_minNormalizedExcitation // Allow negative excitation
			) {
				onsetDetected = true;
				state.lastOnsetRule = 'B2';
				debugLog(
					`✓ Onset: Rule B2 (phase-dominant) - phase=${normalizedPhase.toFixed(1)}σ exc=${normalizedExcitation.toFixed(1)}σ freq=${freq.toFixed(1)}Hz`
				);
			}
			// Rule B3 — Very strong excitation alone (for attacks with clear energy spike)
			// Only fires if frequency matches established pitch (same note re-articulation)
			else if (
				hasPitch &&
				frequencyCoherent &&
				normalizedExcitation > onsetDetectionConfig.b3_minNormalizedExcitation
			) {
				onsetDetected = true;
				state.lastOnsetRule = 'B3';
				debugLog(
					`✓ Onset: Rule B3 (strong excitation) - exc=${normalizedExcitation.toFixed(1)}σ freq=${freq.toFixed(1)}Hz`
				);
			}
			// Rule B4 — Harmonic flux burst (bow direction change / re-bow)
			// Only fires if frequency matches established pitch (same note re-articulation)
			else if (
				hasPitch &&
				frequencyCoherent &&
				normalizedHarmonicFlux > onsetDetectionConfig.b4_minNormalizedHarmonicFlux &&
				relativeHarmonicIncrease >= onsetDetectionConfig.b4_minRelativeIncrease
			) {
				onsetDetected = true;
				state.lastOnsetRule = 'B4';
				debugLog(
					`✓ Onset: Rule B4 (harmonic flux) - hFlux=${normalizedHarmonicFlux.toFixed(1)}σ rel+${(relativeHarmonicIncrease * 100).toFixed(0)}% freq=${freq.toFixed(1)}Hz`
				);
			}
			// Rule B5 — Legato rebound: dip then rise with harmonic brightening
			// Only fires if frequency matches established pitch (same note re-articulation)
			else if (
				hasPitch &&
				frequencyCoherent &&
				onsetAnalysis.legatoDipActive &&
				onsetAnalysis.legatoRiseFrames >= onsetDetectionConfig.b5_minRiseFrames &&
				normalizedHarmonicFlux > onsetDetectionConfig.b5_minNormalizedHarmonicFlux
			) {
				const avgSlope =
					onsetAnalysis.legatoSlopeCount > 0
						? onsetAnalysis.legatoSlopeSumNorm / onsetAnalysis.legatoSlopeCount
						: 0;
				const percentRise =
					onsetAnalysis.legatoDipMinAmp > 0
						? (amplitude - onsetAnalysis.legatoDipMinAmp) / onsetAnalysis.legatoDipMinAmp
						: 0;
				const withinWindow =
					onsetAnalysis.legatoRiseElapsedMs <= onsetDetectionConfig.b5_riseWindowMs;
				if (
					withinWindow &&
					avgSlope >= onsetDetectionConfig.b5_minAvgSlope &&
					percentRise >= onsetDetectionConfig.b5_minRisePercent
				) {
					onsetDetected = true;
					state.lastOnsetRule = 'B5';
					onsetAnalysis.legatoDipActive = false;
					onsetAnalysis.legatoRiseFrames = 0;
					onsetAnalysis.legatoSlopeSumNorm = 0;
					onsetAnalysis.legatoSlopeCount = 0;
					debugLog(
						`✓ Onset: Rule B5 (legato rebound) - hFlux=${normalizedHarmonicFlux.toFixed(1)}σ avgSlope=${avgSlope.toFixed(2)} rise=${(percentRise * 100).toFixed(0)}% window=${Math.round(onsetAnalysis.legatoRiseElapsedMs)}ms freq=${freq.toFixed(1)}Hz`
					);
				}
			}
			// Rule D — Soft-attack fallback: very strong normalized phase disruption alone
			// Only fires if frequency matches established pitch (same note re-articulation)
			else if (
				hasPitch &&
				frequencyCoherent &&
				normalizedPhase > onsetDetectionConfig.d_minNormalizedPhase
			) {
				// Very strong phase with pitch lock
				onsetDetected = true;
				state.lastOnsetRule = 'D';
				debugLog(
					`✓ Onset: Rule D (soft-attack) - phase=${normalizedPhase.toFixed(1)}σ freq=${freq.toFixed(1)}Hz`
				);
			}
			// Suppress near-miss logs; only log actual onsets
		} else {
			// Suppress cooldown/low amplitude logs
		}

		// Apply onset if detected
		if (onsetDetected) {
			recordOnset(latencyTracking, now);
			performanceMetrics.lastOnsetTimestamp = now;
			// Track time from first amplitude to onset
			if (latencyTracking.firstAmplitudeTime !== null) {
				performanceMetrics.timeSinceOnset = now - latencyTracking.firstAmplitudeTime;
			}
			state.isNoteActive = true;
			peakAmplitudeSinceOnset = amplitude;
			// Only update stable pitch if confidence is high (after pitch change onset)
			// Otherwise let it build naturally through the tracking above
			if (pitchChangeDetected && hasPitch) {
				onsetAnalysis.stablePitch = freq;
			}
			// Trigger onset callback with current pitch and rule
			if (onOnsetCallback) {
				onOnsetCallback({
					frequency: freq,
					note: state.note,
					rule: state.lastOnsetRule,
					amplitude,
					timestamp: now
				});
			}
		}

		// ========================================================================
		// ML MODEL COMPARISON (Experimental - runs in parallel, no effect on rule-based detection)
		// ========================================================================
		// Minimal diagnostics to surface why ML may be silent
		mlState.updateMLDiagnostics(now);

		if (mlState.state.mlModelReady) {
			const prediction = mlState.predict(
				normalizedAmplitude,
				normalizedExcitation,
				normalizedPhase,
				state.highFrequencyEnergy,
				hasPitch,
				onsetDetected,
				state.frequency
			);
			if (prediction) {
				state.mlOnsetDetected = prediction.isOnset;
				state.mlOnsetProbability = prediction.probability;
				// If ML detects onset but rule-based didn't, trigger callback for logging/analysis
				if (prediction.isOnset && !onsetDetected && onOnsetCallback) {
					onOnsetCallback({
						frequency: state.frequency ?? 0,
						note: state.note,
						rule: 'ML',
						amplitude,
						timestamp: now
					});
				}
			}
		} else {
			state.mlOnsetDetected = false;
			state.mlOnsetProbability = 0;
		}

		performanceMetrics.onsetDecisionMs = performance.now() - stepStart;

		// ========================================================================
		// STEP 6 — NOTE END TRACKING (separate path, no feed into onset detection)
		// ========================================================================
		stepStart = performance.now();

		// Track rolling peak amplitude for auto-gain (whether note is active or not)
		gainState.updatePeakAmplitude(amplitude);

		if (state.isNoteActive) {
			// Track peak amplitude for decay detection
			if (amplitude > peakAmplitudeSinceOnset) {
				peakAmplitudeSinceOnset = amplitude;
			}

			// Note end conditions (independent of onset logic)
			const lowAmplitude = amplitude < tuning.onsetMinAmplitude * tuning.endMinAmplitudeRatio;
			// End when amplitude dips significantly relative to the post-onset peak
			// Use a more forgiving threshold (40% vs 80%) to handle pizzicato decay curves
			const relativeDrop = amplitude < peakAmplitudeSinceOnset * tuning.endRelativeDropRatio;
			const pitchLost = !hasPitch || onsetAnalysis.pitchConfidence < 0.3;
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
					onsetAnalysis.pitchConfidence *= 0.5;
					// Mark that we have a note peak to calibrate from on next auto-gain check
					// Suppress end logs; only log actual onsets
				}
			} else {
				endCandidateStart = null;
			}
		}
		performanceMetrics.noteEndMs = performance.now() - stepStart;

		// ========================================================================
		// STEP 7 — STATE UPDATE
		// ========================================================================
		stepStart = performance.now();

		// Store current frame data for next iteration
		onsetAnalysis.previousFFT = fftResult;
		onsetAnalysis.previousWhitenedMagnitudes = whitenedMagnitudes;
		onsetAnalysis.previousLogMagnitudes = logMagnitudes;

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
					// Track when note actually appears in state
					recordNoteOutput(latencyTracking);
					performanceMetrics.timeSinceNoteOutput = latencyTracking.metrics.timeSinceNoteOutput;
				}, onsetDetectionConfig.noteDebounceMs);
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
		performanceMetrics.pitchTrackingMs = performance.now() - stepStart;

		lastTickAt = now;
		stepStart = performance.now();

		lastTickAt = now;
		stepStart = performance.now();

		// Auto gain: continuously adapt input level based on recent peak amplitude
		// This works even when no notes are detected, helping bootstrap low signals
		gainState.updateAutoGain(dt, audioChain?.gainNode ?? null);

		performanceMetrics.autoGainMs = performance.now() - stepStart;

		// Final timing update
		performanceMetrics.totalMs = performance.now() - tickStart;
		performanceMetrics.frameCount++;

		rafId = requestAnimationFrame(tick);
	}

	async function checkSupport() {
		if (!navigator.mediaDevices?.getUserMedia) {
			state.error = 'Microphone access is not available in this browser.';
			return false;
		}

		// Check if microphone permission was previously denied (helps on Safari)
		if (navigator.permissions && navigator.permissions.query) {
			try {
				const permissionStatus = await navigator.permissions.query({
					name: 'microphone' as PermissionName
				});
				if (permissionStatus.state === 'denied') {
					if (isIOS || isSafari) {
						state.error = 'Microphone blocked. Go to Settings > Safari > Microphone to enable.';
					} else {
						state.error = 'Microphone access denied. Please check browser settings.';
					}
					return false;
				}
			} catch (e) {
				// Permissions API might not be fully supported, continue anyway
				debugLog('Permissions API check failed:', e);
			}
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
		get performanceMetrics() {
			return performanceMetrics;
		},
		resetLatencyTracking() {
			resetLatencyTracking(latencyTracking);
			performanceMetrics.timeSinceFirstAmplitude = 0;
			performanceMetrics.timeSincePitchLocked = 0;
			performanceMetrics.timeSinceOnset = 0;
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
			const clamped = gainState.setGain(value);
			gain.value = clamped;
			if (audioChain) audioChain.gainNode.gain.value = clamped;
		},
		get autoGain() {
			return autoGainEnabled.value;
		},
		set autoGain(value: boolean) {
			autoGainEnabled.value = value;
			gainState.state.autoGainEnabled = value;
		},
		get targetAmplitude() {
			return targetAmplitude.value;
		},
		set targetAmplitude(value: number) {
			const clamped = Math.max(0.001, Math.min(0.8, value));
			targetAmplitude.value = clamped;
			gainState.state.targetAmplitude = clamped;
		},
		get autoGainInterval() {
			return autoGainInterval.value;
		},
		set autoGainInterval(value: number) {
			const validated = Math.max(50, value);
			autoGainInterval.value = validated;
			gainState.state.autoGainInterval = validated;
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
		},
		// Expose desired source for UI logic if needed
		get desiredSource() {
			return desiredSourceType;
		},
		pause() {
			if (!state.isListening) return;
			isPaused = true;
			debugLog('Paused');
		},
		unpause() {
			if (!state.isListening) return;
			isPaused = false;
			debugLog('Unpaused');
		},
		get isPaused() {
			return isPaused;
		}
	};
}
