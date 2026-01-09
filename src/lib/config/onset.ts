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
	pitchChangeThresholdCents: 15, // Pitch change > 15 cents = new note (faster detection)
	minPitchConfidenceForChange: 0.4, // Confidence must be > 0.4 (more permissive)

	// ========================================================================
	// RULE B1: Both excitation + phase cues moderate
	// ========================================================================
	b1_minNormalizedExcitation: 3.0, // Excitation must be > 3.0 sigma (genuine attack only)
	b1_minNormalizedPhase: 1.0, // Phase must be > 1.0 sigma

	// ========================================================================
	// RULE B2: Asymmetric - phase dominant with weak excitation
	// ========================================================================
	b2_minNormalizedPhase: 2.5, // Strong phase (> 2.5 sigma)
	b2_minNormalizedExcitation: -0.8, // Allow weaker/negative excitation (> -0.8 sigma)

	// ========================================================================
	// RULE B3: Very strong excitation alone
	// ========================================================================
	b3_minNormalizedExcitation: 3.2, // Very strong excitation (> 3.2 sigma)

	// ========================================================================
	// RULE B4: Harmonic-focused excitation (bow direction changes)
	// ========================================================================
	b4_minNormalizedHarmonicFlux: 3.0, // Harmonic flux > 3.0 sigma (genuine re-articulation only)
	b4_minRelativeIncrease: 0.2, // Require ≥20% increase vs previous frame

	// ========================================================================
	// RULE B6: Burst-on-rise without pitch lock (fallback)
	// Triggers when harmonic/high-frequency energy jumps and amplitude is rising,
	// even if pitch tracking temporarily drops during re-articulation.
	// ========================================================================
	b6_minNormalizedHarmonicFlux: 0.6, // Need at least moderate normalized harmonic flux
	b6_minRelativeIncrease: 0.25, // Require ≥25% increase vs previous frame
	b6_minAmplitudeSlope: 0.2, // Amplitude must be rising
	b6_minAmplitudeGateMultiplier: 0.8, // Amplitude must exceed onsetMinAmplitude * multiplier

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
	cooldownMs: 150, // Refractory period after onset (~150ms minimum for string re-articulation)
	minAmplitudeRequired: true, // Require minimum amplitude for all rules
	adaptiveWindowFrames: 50, // Window size (frames) for adaptive threshold (~0.5s at 100fps)
	adaptiveDeltaMultiplier: 1.15, // Multiplier above local mean for adaptive threshold

	// ========================================================================
	// PITCH TRACKING
	// ========================================================================
	pitchStabilityThresholdCents: 40, // Max drift to consider pitch stable (more lenient)
	pitchConfidenceIncrement: 0.2, // How much to increase confidence per stable frame (faster)
	pitchConfidenceDecrement: 0.15, // How much to decrease on unstable frame (slower decay)
	minPitchConfidenceForDetection: 0.2, // Minimum confidence for basic detection (lower)

	// ========================================================================
	// NORMALIZATION
	// ========================================================================
	historyLength: 30, // ~300ms of history for local normalization (at ~100fps)
	minHistoryForNormalization: 10, // Need at least 10 samples before normalizing for robust median/MAD statistics (~100ms)
	madMultiplier: 1.4826, // MAD * 1.4826 ≈ std dev for normal distributions

	// ========================================================================
	// FEATURE EXTRACTION
	// ========================================================================
	minMagnitudeForPhaseAnalysis: 0.01, // Ignore phase in quiet bins

	// ========================================================================
	// NOTE OUTPUT DEBOUNCING
	// ========================================================================
	/**
	 * How long to debounce note changes after onset fires.
	 * Reduces flickering between adjacent notes (C4 ↔ C#4) during attack transients.
	 * Trade-off: Lower = faster note reporting, Higher = cleaner output.
	 */
	noteDebounceMs: 20, // Reduced from 200ms for faster note reporting

	// ========================================================================
	// SPECTRAL WHITENING
	// ========================================================================
	spectralWhiteningEnabled: true, // Enable spectral whitening for onset detection
	whiteningAlpha: 0.6, // Exponential smoothing factor (higher = slower adaptation)
	whiteningMinClamp: 0.01, // Minimum whitened value (prevent division by near-zero)
	whiteningMaxClamp: 10.0, // Maximum whitened value (prevent extreme spikes)
	whiteningEpsilon: 0.001 // Small constant to prevent division by zero
};

export type OnsetDetectionConfig = typeof onsetDetectionConfig;
