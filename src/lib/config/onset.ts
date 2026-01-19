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
	pitchChangeThresholdCents: 50, // Require a larger pitch move to treat as a new note
	minPitchConfidenceForChange: 0.6, // Demand higher confidence before reacting to pitch shifts

	// ========================================================================
	// RULE B1: Both excitation + phase cues moderate
	// ========================================================================
	b1_minNormalizedExcitation: 1.8, // Require stronger excitation to trigger
	b1_minNormalizedPhase: 1.2, // Phase cue must also be stronger

	// ========================================================================
	// RULE B2: Asymmetric - phase dominant with weak excitation
	// ========================================================================
	b2_minNormalizedPhase: 2.8, // Stronger phase requirement
	b2_minNormalizedExcitation: -0.2, // Allow only mild negative excitation

	// ========================================================================
	// RULE B3: Very strong excitation alone
	// ========================================================================
	b3_minNormalizedExcitation: 2.3, // Demand a larger excitation spike

	// ========================================================================
	// RULE B4: Harmonic-focused excitation (bow direction changes)
	// ========================================================================
	b4_minNormalizedHarmonicFlux: 3.8, // Higher harmonic flux threshold to avoid cascades
	b4_minRelativeIncrease: 0.9, // Require a steeper relative jump

	// ========================================================================
	// RULE B6: Burst-on-rise without pitch lock (fallback)
	// Triggers when harmonic/high-frequency energy jumps and amplitude is rising,
	// even if pitch tracking temporarily drops during re-articulation.
	// ========================================================================
	b6_minNormalizedHarmonicFlux: 0.8, // Need stronger harmonic flux to consider a burst
	b6_minRelativeIncrease: 0.35, // Require a clearer rise vs previous frame
	b6_minAmplitudeSlope: 0.3, // Amplitude must rise faster
	b6_minAmplitudeGateMultiplier: 1.0, // Amplitude must meet or exceed baseline onset gate

	// ========================================================================
	// RULE B5: Legato rebound (dip then rise on harmonic stack)
	// ========================================================================
	b5_minNormalizedHarmonicFlux: 2.8, // Require a brighter harmonic rebound
	b5_minAmplitudeSlope: 0.9, // Slope must be steeper during rebound
	b5_maxPrevNormalizedAmplitude: -0.8, // Require a deeper pre-rebound dip
	b5_minDipBelow: -0.8, // Dip threshold (normalized amplitude)
	b5_minRiseFrames: 5, // Require more consecutive rising frames
	b5_riseWindowMs: 220, // Slightly tighter window to avoid spurious triggers
	b5_minRisePercent: 0.45, // Require at least a 45% rise from dip minimum
	b5_minAvgSlope: 0.7, // Require steeper average slope

	// ========================================================================
	// RULE C: Raw phase threshold (bypasses normalization)
	// ========================================================================
	c_minRawPhase: 1.6, // Require stronger raw phase deviation to trigger

	// ========================================================================
	// RULE D: Very strong normalized phase alone
	// ========================================================================
	d_minNormalizedPhase: 3.2, // Require even stronger phase-only cue

	// ========================================================================
	// COOLDOWN & AMPLITUDE
	// ========================================================================
	cooldownMs: 200, // Refractory period to prevent spurious double-triggers (at 120 BPM, 8th note = 250ms)
	minAmplitudeRequired: true, // Require minimum amplitude for all rules
	adaptiveWindowFrames: 30, // Faster adaptation for quick dynamics (~0.3s at 100fps)
	adaptiveDeltaMultiplier: 1.25, // Multiplier above local mean for adaptive threshold

	// ========================================================================
	// PITCH TRACKING
	// ========================================================================
	pitchStabilityThresholdCents: 40, // Require tighter drift to lock pitch
	pitchConfidenceIncrement: 0.25, // Increase confidence more gradually
	pitchConfidenceDecrement: 0.18, // Decay confidence slightly faster on instability
	minPitchConfidenceForDetection: 0.25, // Minimum confidence for basic detection

	// ========================================================================
	// NORMALIZATION
	// ========================================================================
	historyLength: 20, // Shorter history (~200ms) for quicker normalization on fast notes
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
	noteDebounceMs: 10, // Reduced from 10ms for faster note reporting

	// ========================================================================
	// SPECTRAL WHITENING
	// ========================================================================
	spectralWhiteningEnabled: true, // Enable spectral whitening for onset detection
	whiteningAlpha: 0.6, // Exponential smoothing factor (higher = slower adaptation)
	whiteningMinClamp: 0.01, // Minimum whitened value (prevent division by near-zero)
	whiteningMaxClamp: 10.0, // Maximum whitened value (prevent extreme spikes)
	whiteningEpsilon: 0.001, // Small constant to prevent division by zero

	// ========================================================================
	// STABLE PITCH VERIFICATION (for ML mode + Rule A)
	// ========================================================================
	stablePitchVerificationMs: 100, // Wait for stable pitch for 100ms after initial onset detection
	stablePitchThresholdCents: 30 // Pitch must remain within ±30 cents to be considered stable
};

export type OnsetDetectionConfig = typeof onsetDetectionConfig;
