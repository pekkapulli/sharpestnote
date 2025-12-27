import type { DetectionConfig } from '$lib/config/instruments';

/**
 * Calculate RMS amplitude of time-domain signal
 */
export function calculateAmplitude(data: Float32Array): number {
	let sum = 0;
	for (let i = 0; i < data.length; i++) {
		sum += data[i] * data[i];
	}
	return Math.sqrt(sum / data.length);
}

/**
 * Check if frequency is stable over recent history
 */
export function isFrequencyStable(
	freq: number,
	frequencyHistory: number[],
	windowSize: number = 5
): boolean {
	if (frequencyHistory.length < windowSize) return false;
	const recent = frequencyHistory.slice(-windowSize);
	const avg = recent.reduce((a, b) => a + b) / recent.length;
	const variance = recent.reduce((sum, f) => sum + Math.abs(f - avg), 0) / recent.length;
	const tolerancePercent = freq < 100 ? 0.04 : 0.03;
	return variance < avg * tolerancePercent;
}

/**
 * Get detection configuration for an instrument
 */
export function getDetectionConfig(
	instrument: 'generic' | string,
	instrumentMap: Record<string, { detectionConfig: DetectionConfig }>,
	genericDetectionConfig: DetectionConfig
): DetectionConfig {
	return instrument === 'generic'
		? genericDetectionConfig
		: (instrumentMap[instrument]?.detectionConfig ?? genericDetectionConfig);
}

/**
 * Calculate dynamic onset threshold based on recent flux statistics.
 *
 * Uses median + adaptive factor to handle varying signal levels and background noise.
 * This prevents false positives while remaining sensitive to actual onsets.
 *
 * @param fluxHistory Recent flux values
 * @param minHistorySize Minimum history size before using dynamic threshold
 * @param multiplier How many times the median to use as threshold (typically 2-4)
 */
export function calculateDynamicThreshold(
	fluxHistory: number[],
	minHistorySize: number = 10,
	multiplier: number = 3.0
): number {
	if (fluxHistory.length < minHistorySize) {
		// Not enough history, use a reasonable default
		return 0.02;
	}

	// Use median instead of mean to be robust to outliers (actual onsets)
	const sorted = [...fluxHistory].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

	// Threshold = median * multiplier
	// Add small floor to prevent triggering on complete silence
	return Math.max(0.01, median * multiplier);
}
