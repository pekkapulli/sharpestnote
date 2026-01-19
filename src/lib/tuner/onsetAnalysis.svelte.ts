/**
 * Onset analysis state and normalization.
 * Manages the sliding history windows and local normalization (MAD-based) for onset detection.
 */

import type { FFTResult } from './fftAnalysis';

export interface OnsetAnalysisState {
	// Sliding history windows for local normalization (300-500ms ~= 30-50 frames at 100fps)
	excitationHistory: number[];
	harmonicFluxHistory: number[];
	amplitudeDeltaHistory: number[];
	phaseHistory: number[];
	onsetFunctionHistory: number[]; // Combined onset function for adaptive thresholding

	// Spectral whitening state
	magnitudeAverages: Float32Array | null;
	previousWhitenedMagnitudes: Float32Array | null;
	previousLogMagnitudes: Float32Array | null;

	// Legato rebound tracking (dip→rise state)
	legatoDipActive: boolean;
	legatoRiseFrames: number;
	legatoDipMinAmp: number;
	legatoRiseElapsedMs: number;
	legatoSlopeSumNorm: number;
	legatoSlopeCount: number;

	// Phase-cue conditioning
	phaseCueEma: number;
	phaseCueEmaInitialized: boolean;
	previousPhaseCueEma: number;

	// History tracking
	frequencyHistory: number[];
	amplitudeHistory: number[];
	previousFFT: FFTResult | null;
	previousPitch: number | null;
	stablePitch: number | null;
	pitchConfidence: number;
}

const HISTORY_LENGTH = 50; // From onsetDetectionConfig.historyLength
const PHASE_CUE_EMA_ALPHA = 0.2;

export function createOnsetAnalysisState(): OnsetAnalysisState {
	return {
		excitationHistory: [],
		harmonicFluxHistory: [],
		amplitudeDeltaHistory: [],
		phaseHistory: [],
		onsetFunctionHistory: [],
		magnitudeAverages: null,
		previousWhitenedMagnitudes: null,
		previousLogMagnitudes: null,
		legatoDipActive: false,
		legatoRiseFrames: 0,
		legatoDipMinAmp: 0,
		legatoRiseElapsedMs: 0,
		legatoSlopeSumNorm: 0,
		legatoSlopeCount: 0,
		phaseCueEma: 0,
		phaseCueEmaInitialized: false,
		previousPhaseCueEma: 0,
		frequencyHistory: [],
		amplitudeHistory: [],
		previousFFT: null,
		previousPitch: null,
		stablePitch: null,
		pitchConfidence: 0
	};
}

export function computeNormalized(value: number, history: number[]): number {
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
}

export function updateOnsetHistories(
	state: OnsetAnalysisState,
	excitationCue: number,
	harmonicFluxCue: number,
	phaseCueForDetection: number
) {
	state.excitationHistory.push(excitationCue);
	state.harmonicFluxHistory.push(harmonicFluxCue);
	state.phaseHistory.push(phaseCueForDetection);

	if (state.excitationHistory.length > HISTORY_LENGTH) state.excitationHistory.shift();
	if (state.harmonicFluxHistory.length > HISTORY_LENGTH) state.harmonicFluxHistory.shift();
	if (state.phaseHistory.length > HISTORY_LENGTH) state.phaseHistory.shift();
}

export function updateOnsetFunction(
	state: OnsetAnalysisState,
	normalizedExcitation: number,
	normalizedPhase: number
) {
	const combinedOnsetFunction = normalizedExcitation + normalizedPhase * 0.5;
	state.onsetFunctionHistory.push(combinedOnsetFunction);
	if (state.onsetFunctionHistory.length > 200) {
		state.onsetFunctionHistory.shift(); // Keep ~2 seconds
	}
	return combinedOnsetFunction;
}

export function updateLegatoState(
	state: OnsetAnalysisState,
	normalizedAmplitude: number,
	normalizedAmplitudeSlope: number,
	dt: number,
	minDipBelow: number,
	minAmplitudeSlope: number
) {
	if (normalizedAmplitude < minDipBelow) {
		state.legatoDipActive = true;
		state.legatoRiseFrames = 0;
		state.legatoDipMinAmp = 0; // Will be set to current amplitude elsewhere
		state.legatoRiseElapsedMs = 0;
		state.legatoSlopeSumNorm = 0;
		state.legatoSlopeCount = 0;
	} else if (state.legatoDipActive) {
		// Accumulate rise metrics
		state.legatoRiseElapsedMs += dt;
		state.legatoSlopeSumNorm += Math.max(0, normalizedAmplitudeSlope);
		state.legatoSlopeCount += 1;
		if (normalizedAmplitudeSlope > minAmplitudeSlope) {
			state.legatoRiseFrames++;
		}
		// If amplitude falls again significantly, cancel rebound tracking
		if (normalizedAmplitude < minDipBelow - 0.1) {
			state.legatoDipActive = false;
			state.legatoRiseFrames = 0;
		}
	}
}

export function updatePhaseCue(state: OnsetAnalysisState, rawPhaseCueAbs: number): number {
	let phaseCueAbsSmoothed = rawPhaseCueAbs;
	if (!state.phaseCueEmaInitialized) {
		state.phaseCueEmaInitialized = true;
		state.phaseCueEma = rawPhaseCueAbs;
		state.previousPhaseCueEma = rawPhaseCueAbs;
	} else {
		state.phaseCueEma =
			state.phaseCueEma * (1 - PHASE_CUE_EMA_ALPHA) + rawPhaseCueAbs * PHASE_CUE_EMA_ALPHA;
		phaseCueAbsSmoothed = state.phaseCueEma;
	}

	// Use a transient-like phase cue for detection: positive delta of smoothed deviation
	const phaseCueForDetection = Math.max(0, phaseCueAbsSmoothed - state.previousPhaseCueEma);
	state.previousPhaseCueEma = phaseCueAbsSmoothed;

	return phaseCueForDetection;
}

export function resetOnsetAnalysis(state: OnsetAnalysisState) {
	state.excitationHistory.length = 0;
	state.harmonicFluxHistory.length = 0;
	state.amplitudeDeltaHistory.length = 0;
	state.phaseHistory.length = 0;
	state.onsetFunctionHistory.length = 0;
	state.frequencyHistory.length = 0;
	state.amplitudeHistory.length = 0;
	state.previousFFT = null;
	state.previousPitch = null;
	state.stablePitch = null;
	state.pitchConfidence = 0;
	state.magnitudeAverages = null;
	state.previousWhitenedMagnitudes = null;
	state.previousLogMagnitudes = null;
	state.legatoDipActive = false;
	state.legatoRiseFrames = 0;
	state.phaseCueEmaInitialized = false;
	state.phaseCueEma = 0;
	state.previousPhaseCueEma = 0;
}
