/**
 * Onset Detection Configuration
 *
 * All thresholds for the multi-rule onset detection algorithm.
 * Adjust these values to tune detection behavior for different instruments.
 */

export const onsetDetectionConfig = {
	// ========================================================================
	// RULE A: Pitch change with high confidence
	// ========================================================================
	pitchChangeThresholdCents: 25, // Pitch change > 25 cents = new note
	minPitchConfidenceForChange: 0.6, // Confidence must be > 0.6

	// ========================================================================
	// RULE B1: Both excitation + phase cues moderate
	// ========================================================================
	b1_minNormalizedExcitation: 1.6, // Excitation must be > 1.6 sigma
	b1_minNormalizedPhase: 1.3, // Phase must be > 1.3 sigma

	// ========================================================================
	// RULE B2: Asymmetric - phase dominant with weak excitation
	// ========================================================================
	b2_minNormalizedPhase: 1.5, // Strong phase (> 1.5 sigma)
	b2_minNormalizedExcitation: -0.6, // Allow weaker/negative excitation (> -0.6 sigma)

	// ========================================================================
	// RULE B3: Very strong excitation alone
	// ========================================================================
	b3_minNormalizedExcitation: 3.2, // Very strong excitation (> 3.2 sigma)

	// ========================================================================
	// RULE B4: Harmonic-focused excitation (bow direction changes)
	// ========================================================================
	b4_minNormalizedHarmonicFlux: 1.4, // Harmonic flux > 1.4 sigma

	// ========================================================================
	// RULE B5: Legato rebound (dip then rise on harmonic stack)
	// ========================================================================
	b5_minNormalizedHarmonicFlux: 0.9, // Harmonic flux must rise above 0.9 sigma (slightly easier)
	b5_minAmplitudeSlope: 0.4, // Allow gentler positive slope for slow attacks
	b5_maxPrevNormalizedAmplitude: -0.2, // Shallower dips are acceptable
	b5_minDipBelow: -0.2, // Dip threshold (normalized amplitude)
	b5_minRiseFrames: 2, // Require fewer consecutive rising frames
	b5_riseWindowMs: 450, // Allow slower rises within ~0.45s
	b5_minRisePercent: 0.1, // Require at least a 10% rise from dip minimum
	b5_minAvgSlope: 0.2, // Gentler average slope for slow attacks

	// ========================================================================
	// RULE C: Raw phase threshold (bypasses normalization)
	// ========================================================================
	c_minRawPhase: 1.45, // Raw phase deviation > 1.45 triggers onset

	// ========================================================================
	// RULE D: Very strong normalized phase alone
	// ========================================================================
	d_minNormalizedPhase: 3.0, // Very strong phase (> 3.0 sigma)

	// ========================================================================
	// COOLDOWN & AMPLITUDE
	// ========================================================================
	cooldownMs: 80, // Refractory period after onset (80ms)
	minAmplitudeRequired: true, // Require minimum amplitude for all rules

	// ========================================================================
	// PITCH TRACKING
	// ========================================================================
	pitchStabilityThresholdCents: 30, // Max drift to consider pitch stable
	pitchConfidenceIncrement: 0.15, // How much to increase confidence per stable frame
	pitchConfidenceDecrement: 0.2, // How much to decrease on unstable frame
	minPitchConfidenceForDetection: 0.3, // Minimum confidence for basic detection

	// ========================================================================
	// NORMALIZATION
	// ========================================================================
	historyLength: 30, // ~300ms of history for local normalization (at ~100fps)
	minHistoryForNormalization: 10, // Need at least 10 samples before normalizing
	madMultiplier: 1.4826, // MAD * 1.4826 ≈ std dev for normal distributions

	// ========================================================================
	// FEATURE EXTRACTION
	// ========================================================================
	minMagnitudeForPhaseAnalysis: 0.01 // Ignore phase in quiet bins
};

export type OnsetDetectionConfig = typeof onsetDetectionConfig;
