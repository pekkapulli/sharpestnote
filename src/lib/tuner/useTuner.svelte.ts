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
	getDetectionConfig,
	isFrequencyStable,
	isFrequencyInInstrumentRange
} from './analysis';
import { performFFT, type FFTResult } from './fftAnalysis';
import {
	calculateSpectralFluxWeighted,
	calculatePhaseDeviationFocused,
	calculateHarmonicFlux,
	calculateHighFrequencyBurst,
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
	const frequencyHistory: number[] = [];
	const amplitudeHistory: number[] = [];
	const debug = options.debug ?? false; // Capture debug flag
	const onOnsetCallback = options.onOnset; // Callback for onset events

	// Detect Safari for browser-specific handling
	const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
	const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

	// ========================================================================
	// ONSET DETECTION STATE (Step 0 - Analysis setup)
	// ========================================================================
	// Sliding history windows for local normalization (300-500ms ~= 30-50 frames at 100fps)
	const excitationHistory: number[] = []; // HF spectral flux history
	const harmonicFluxHistory: number[] = []; // Harmonic-focused flux history
	const amplitudeDeltaHistory: number[] = []; // Amplitude slope history
	const phaseHistory: number[] = []; // Phase deviation history
	const onsetFunctionHistory: number[] = []; // Combined onset function for adaptive thresholding
	const HISTORY_LENGTH = onsetDetectionConfig.historyLength;

	// Spectral whitening state
	let magnitudeAverages: Float32Array | null = null; // Running average per frequency bin
	let previousWhitenedMagnitudes: Float32Array | null = null; // For flux calculation

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
		phases: null,
		lastOnsetRule: null,
		spectralFlux: 0,
		phaseDeviation: 0
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

	// Track when analysis session started (for latency measurement)
	let sessionStartTime: number | null = null;
	let firstAmplitudeTime: number | null = null;
	let firstPitchLockTime: number | null = null;
	let lastOnsetTime_latency: number | null = null; // Track for latency measurement
	let firstNoteOutputTime: number | null = null; // Track when note first appears

	const a4 = $state({ value: options.a4 ?? 442 });
	const accidental = $state({ value: options.accidental ?? 'sharp' });
	const debounceTime = $state({ value: options.debounceTime ?? 200 });
	const amplitudeThreshold = $state({ value: options.amplitudeThreshold ?? 0.02 });
	const instrument = $state({ value: options.instrument ?? 'generic' });
	const tempoBPM = $state({ value: options.tempoBPM ?? 120 });
	const maxGain = $state({ value: options.maxGain ?? 500 });
	const minGain = $state({ value: options.minGain ?? 0.1 });
	const gain = $state({ value: options.gain ?? 2 });
	const autoGainEnabled = $state({ value: options.autoGain ?? true });
	const targetAmplitude = $state({ value: options.targetAmplitude ?? 0.7 });
	const gainAdjustRate = $state({ value: options.gainAdjustRate ?? 0.3 });
	const autoGainInterval = $state({ value: options.autoGainInterval ?? 150 });

	// Internal tracking for note hold duration
	let lastTickAt: number | null = null;
	let holdMs = 0;
	let heldNote: string | null = null;
	let autoGainElapsed = 0;

	// Note end tracking (separate from onset detection - Step 6)
	let peakAmplitudeSinceOnset = 0;
	let endCandidateStart: number | null = null;

	// Auto gain: track peak amplitude over rolling window
	let recentPeakAmplitude = 0;
	let peakAmplitudeWindow: number[] = [];

	function clampGain(value: number): number {
		return Math.max(minGain.value, Math.min(maxGain.value, value));
	}

	function debugLog(...args: unknown[]): void {
		if (debug) {
			console.log('[Tuner]', ...args);
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
		lastOnsetTime = 0;
		peakAmplitudeSinceOnset = 0;
		previousFFT = null;
		previousPitch = null;
		stablePitch = null;
		pitchConfidence = 0;
		excitationHistory.length = 0;
		harmonicFluxHistory.length = 0;
		amplitudeDeltaHistory.length = 0;
		phaseHistory.length = 0;
		endCandidateStart = null;
		recentPeakAmplitude = 0;
		peakAmplitudeWindow = [];
		magnitudeAverages = null;
		previousWhitenedMagnitudes = null;
		onsetFunctionHistory.length = 0;

		// Reset latency tracking
		sessionStartTime = null;
		firstAmplitudeTime = null;
		firstPitchLockTime = null;
		lastOnsetTime_latency = null;
		firstNoteOutputTime = null;
		lastOnsetTime_latency = null;
		firstNoteOutputTime = null;

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
		const gainNode = chain.gainNode;

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

		// Store previous log-grouped magnitudes for flux calculation
		let previousLogMagnitudes: Float32Array | null = null;

		// 1.1b: Apply spectral whitening (if enabled)
		// Normalize each frequency bin by its running average to enhance transients
		stepStart = performance.now();
		let whitenedMagnitudes: Float32Array | null = null;
		if (onsetDetectionConfig.spectralWhiteningEnabled) {
			// Initialize magnitude averages on first frame
			if (magnitudeAverages === null) {
				magnitudeAverages = new Float32Array(fftResult.magnitudes.length);
				// Initialize with first frame magnitudes
				magnitudeAverages.set(fftResult.magnitudes);
			}

			// Apply whitening and update averages
			whitenedMagnitudes = applySpectralWhitening(
				fftResult.magnitudes,
				magnitudeAverages,
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
		frequencyHistory.push(freq);
		amplitudeHistory.push(amplitude);

		// Track amplitude slope for legato dip/rise detection
		const previousAmplitude =
			amplitudeHistory.length > 1 ? amplitudeHistory[amplitudeHistory.length - 2] : amplitude;
		const amplitudeDelta = amplitude - previousAmplitude;
		amplitudeDeltaHistory.push(amplitudeDelta);

		if (frequencyHistory.length > 10) frequencyHistory.shift();
		if (amplitudeHistory.length > 10) amplitudeHistory.shift();
		if (amplitudeDeltaHistory.length > 10) amplitudeDeltaHistory.shift();

		// Check frequency stability first
		const isStable = freq > 0 && isFrequencyStable(freq, frequencyHistory);

		// Then check if it's in the instrument's range (if instrument specified)
		const currentInstrument =
			instrument.value !== 'generic' ? instrumentMap[instrument.value] : null;
		const currentA4 = untrack(() => a4.value);

		let inRange = true;
		if (currentInstrument) {
			inRange = isFrequencyInInstrumentRange(freq, currentInstrument, currentA4);

			// Additional octave error check: only reject if there's evidence the lower octave
			// is the actual fundamental (check if it was recently stable or has strong energy)
			if (inRange && freq > 0 && frequencyHistory.length > 5) {
				const halfFreq = freq / 2;
				const halfInRange = isFrequencyInInstrumentRange(halfFreq, currentInstrument, currentA4);

				// Only reject if the half frequency was recently detected as stable
				// (meaning it's likely the real fundamental and current freq is a harmonic)
				if (halfInRange) {
					const recentFrequencies = frequencyHistory.slice(-5);
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
		if (sessionStartTime === null && amplitude > tuning.onsetMinAmplitude * 0.3) {
			sessionStartTime = now; // First meaningful signal
		}
		if (firstAmplitudeTime === null && amplitude > tuning.onsetMinAmplitude) {
			firstAmplitudeTime = now; // Reached minimum amplitude
			// Clear stale history from silence/noise so stability check works on fresh note data
			frequencyHistory.length = 0;
			amplitudeHistory.length = 0;
			amplitudeDeltaHistory.length = 0;
		}
		if (firstPitchLockTime === null && hasPitch) {
			firstPitchLockTime = now; // First stable pitch lock
		}

		// Calculate milestone gaps (one-time measurements)
		if (sessionStartTime !== null && firstAmplitudeTime !== null) {
			performanceMetrics.timeSinceFirstAmplitude = firstAmplitudeTime - sessionStartTime;
		}
		if (firstAmplitudeTime !== null && firstPitchLockTime !== null) {
			performanceMetrics.timeSincePitchLocked = firstPitchLockTime - firstAmplitudeTime;
		}

		// 1.3: Compute excitation cue (HF spectral flux)
		// High-frequency weighted, positive-only spectral flux
		// Use whitened magnitudes if enabled, otherwise use log-grouped magnitudes from SuperFlux
		const excitationCue = whitenedMagnitudes
			? calculateSpectralFluxWeighted(whitenedMagnitudes, previousWhitenedMagnitudes)
			: calculateSpectralFluxWeighted(logMagnitudes, previousLogMagnitudes);

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
		performanceMetrics.pitchDetectionMs = performance.now() - stepStart;

		// Expose analysis metrics for visualization
		state.spectralFlux = excitationCue;
		state.phaseDeviation = phaseCue;

		// Track pitch confidence: stable pitch over multiple frames
		if (hasPitch) {
			if (previousPitch === null) {
				pitchConfidence = 0.3; // Initial confidence
				stablePitch = freq;
			} else {
				const pitchDiffCents = Math.abs(1200 * Math.log2(freq / previousPitch));
				if (pitchDiffCents < onsetDetectionConfig.pitchStabilityThresholdCents) {
					// Stable: increase confidence
					pitchConfidence = Math.min(
						1.0,
						pitchConfidence + onsetDetectionConfig.pitchConfidenceIncrement
					);
					// Update stable pitch with smoothing
					stablePitch = stablePitch ? stablePitch * 0.7 + freq * 0.3 : freq;
				} else {
					// Unstable: reduce confidence
					pitchConfidence = Math.max(
						0,
						pitchConfidence - onsetDetectionConfig.pitchConfidenceDecrement
					);
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
		stepStart = performance.now();
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
		performanceMetrics.normalizationMs = performance.now() - stepStart;

		// Track combined onset function for SuperFlux adaptive thresholding
		// Combine excitation and phase as a unified onset detection function
		const combinedOnsetFunction = normalizedExcitation + normalizedPhase * 0.5;
		onsetFunctionHistory.push(combinedOnsetFunction);
		if (onsetFunctionHistory.length > 200) onsetFunctionHistory.shift(); // Keep ~2 seconds

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
		if (
			hasPitch &&
			stablePitch &&
			pitchConfidence > onsetDetectionConfig.minPitchConfidenceForChange
		) {
			const pitchChangeCents = Math.abs(1200 * Math.log2(freq / stablePitch));
			// Pitch change threshold from config
			if (pitchChangeCents > onsetDetectionConfig.pitchChangeThresholdCents) {
				pitchChangeDetected = true;
			}
		}

		// ========================================================================
		// STEP 4 — ONSET DECISION RULES
		// ========================================================================
		stepStart = performance.now();

		const timeSinceLastOnset = now - lastOnsetTime;

		let onsetDetected = false;

		// Check cooldown FIRST (Step 5 enforcement)
		const cooldownMs = Math.max(0, onsetDetectionConfig.cooldownMs);
		const cooldownActive = timeSinceLastOnset < cooldownMs;

		// Minimum amplitude check for all rules
		const hasMinAmplitude = amplitude > tuning.onsetMinAmplitude;

		// Compute adaptive threshold using SuperFlux technique
		// This adjusts sensitivity based on local context
		const adaptiveThreshold =
			onsetFunctionHistory.length > 10
				? computeAdaptiveThreshold(
						onsetFunctionHistory,
						onsetFunctionHistory.length - 1,
						onsetDetectionConfig.adaptiveWindowFrames,
						onsetDetectionConfig.adaptiveDeltaMultiplier
					)
				: 0;

		// B-rules only fire for re-articulation of the same note (pitch coherence check)
		// Allow ±50 cents deviation from stable pitch (half a semitone) for repeat note detection
		const frequencyCoherent =
			stablePitch && freq > 0 && Math.abs(1200 * Math.log2(freq / stablePitch)) < 50; // Within ±50 cents

		if (!cooldownActive && hasMinAmplitude) {
			// Rule A — Guaranteed onset: pitch change with high confidence
			if (pitchChangeDetected) {
				onsetDetected = true;
				state.lastOnsetRule = 'A';
				debugLog(
					`✓ Onset: Rule A (pitch change) - ${freq.toFixed(1)}Hz, confidence=${pitchConfidence.toFixed(2)}`
				);
			}
			// Rule B1 — Re-articulation: excitation cue (sufficient for detecting attacks)
			// Enhanced with SuperFlux adaptive threshold
			// Only fires if frequency matches established pitch (same note re-articulation)
			else if (
				hasPitch &&
				frequencyCoherent &&
				normalizedExcitation > onsetDetectionConfig.b1_minNormalizedExcitation && // Moderate excitation
				(onsetFunctionHistory.length < 10 || combinedOnsetFunction > adaptiveThreshold) // Adaptive check
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
					state.lastOnsetRule = 'B5';
					legatoDipActive = false;
					legatoRiseFrames = 0;
					legatoSlopeSumNorm = 0;
					legatoSlopeCount = 0;
					debugLog(
						`✓ Onset: Rule B5 (legato rebound) - hFlux=${normalizedHarmonicFlux.toFixed(1)}σ avgSlope=${avgSlope.toFixed(2)} rise=${(percentRise * 100).toFixed(0)}% window=${Math.round(legatoRiseElapsedMs)}ms freq=${freq.toFixed(1)}Hz`
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
			lastOnsetTime = now;
			lastOnsetTime_latency = now; // Track for latency measurement
			performanceMetrics.lastOnsetTimestamp = now;
			// Track time from first amplitude to onset
			if (firstAmplitudeTime !== null) {
				performanceMetrics.timeSinceOnset = now - firstAmplitudeTime;
			}
			state.isNoteActive = true;
			peakAmplitudeSinceOnset = amplitude;
			// Only update stable pitch if confidence is high (after pitch change onset)
			// Otherwise let it build naturally through the tracking above
			if (pitchChangeDetected && hasPitch) {
				stablePitch = freq;
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
		performanceMetrics.onsetDecisionMs = performance.now() - stepStart;

		// ========================================================================
		// STEP 6 — NOTE END TRACKING (separate path, no feed into onset detection)
		// ========================================================================
		stepStart = performance.now();

		// Track rolling peak amplitude for auto-gain (whether note is active or not)
		peakAmplitudeWindow.push(amplitude);
		if (peakAmplitudeWindow.length > 10) peakAmplitudeWindow.shift(); // Keep last ~100-150ms
		recentPeakAmplitude = Math.max(...peakAmplitudeWindow);

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
		previousFFT = fftResult;
		previousWhitenedMagnitudes = whitenedMagnitudes;
		previousLogMagnitudes = logMagnitudes;

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
					if (firstNoteOutputTime === null && lastOnsetTime_latency !== null) {
						firstNoteOutputTime = performance.now();
						performanceMetrics.timeSinceNoteOutput = firstNoteOutputTime - lastOnsetTime_latency;
					}
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

		autoGainElapsed += dt;
		// Auto gain: continuously adapt input level based on recent peak amplitude
		// This works even when no notes are detected, helping bootstrap low signals
		if (autoGainEnabled.value && gainNode && autoGainElapsed > autoGainInterval.value) {
			autoGainElapsed = 0;
			const target = targetAmplitude.value;
			// Wider tolerance range for smoother operation
			const lower = target * 0.5; // Allow drops to 50% of target
			const upper = target * 1.8; // Allow peaks up to 180% of target
			const rate = Math.max(0.05, Math.min(0.5, gainAdjustRate.value));
			const adjustStep = 1 + rate;
			const currentGain = gain.value;

			// Use recent peak amplitude from rolling window
			// This includes both notes and silence, allowing gain to increase even with weak signal
			const peak = recentPeakAmplitude;

			// Only adjust if we have some signal (avoid boosting pure silence)
			if (peak > 0.001) {
				if (peak < lower) {
					// Signal too quiet - increase gain more aggressively
					const ratio = peak / target;
					const boost = ratio < 0.1 ? adjustStep * 1.5 : adjustStep; // Extra boost for very weak signals
					const newGain = clampGain(currentGain * boost);
					gain.value = newGain;
					gainNode.gain.value = newGain;
					// debugLog(
					// 	`Auto-gain: ${currentGain.toFixed(2)} → ${newGain.toFixed(2)} (peak ${peak.toFixed(3)} < target ${target.toFixed(2)})`
					// );
				} else if (peak > upper) {
					// Signal too loud - decrease gain
					const newGain = clampGain(currentGain / adjustStep);
					gain.value = newGain;
					gainNode.gain.value = newGain;
					// debugLog(
					// 	`Auto-gain: ${currentGain.toFixed(2)} → ${newGain.toFixed(2)} (peak ${peak.toFixed(3)} > target ${target.toFixed(2)})`
					// );
				}
			}
		}
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
			sessionStartTime = null;
			firstAmplitudeTime = null;
			firstPitchLockTime = null;
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
			targetAmplitude.value = Math.max(0.001, Math.min(0.8, value));
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
