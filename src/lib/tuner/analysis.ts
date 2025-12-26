import type { DetectionConfig } from '$lib/config/instruments';

export function calculateAmplitude(data: Float32Array): number {
	let sum = 0;
	for (let i = 0; i < data.length; i++) {
		sum += data[i] * data[i];
	}
	return Math.sqrt(sum / data.length);
}

/**
 * High-frequency weighted, positive-only spectral flux for onset detection.
 *
 * Key improvements over basic flux:
 * - Only counts POSITIVE changes (energy increases = onsets)
 * - Weights higher frequencies more heavily (attacks inject energy into upper harmonics first)
 * - Ignores vibrato, tremolo, and slow timbral drift
 *
 * This makes repeat notes pop out clearly even when previous notes are sustaining.
 */
export function calculateSpectralFlux(
	currentSpectrum: Float32Array,
	previousSpectrum: Float32Array | null
): number {
	if (!previousSpectrum || previousSpectrum.length !== currentSpectrum.length) {
		return 0;
	}

	const length = currentSpectrum.length;
	let weightedFlux = 0;

	// Weight higher frequencies more heavily
	// Upper harmonics show attack transients more clearly
	for (let i = 0; i < length; i++) {
		// Frequency weight: emphasize upper bins
		// Linear ramp from 1.0 at bin 0 to 3.0 at highest bin
		const freqWeight = 1.0 + (i / length) * 2.0;

		// Only count positive changes (energy increases)
		const increase = Math.max(0, currentSpectrum[i] - previousSpectrum[i]);

		weightedFlux += freqWeight * increase;
	}

	// Normalize by number of bins to keep values comparable
	return weightedFlux / length;
}

export function calculateHighFrequencyBurst(
	spectrum: Float32Array,
	previousSpectrum: Float32Array | null
): number {
	if (!previousSpectrum || spectrum.length !== previousSpectrum.length) {
		return 0;
	}

	const highFreqStart = Math.floor(spectrum.length * 0.3);
	let highFreqNow = 0;
	let highFreqPrev = 0;

	for (let i = highFreqStart; i < spectrum.length; i++) {
		highFreqNow += spectrum[i];
		highFreqPrev += previousSpectrum[i];
	}

	const highFreqChange = (highFreqNow - highFreqPrev) / (highFreqPrev + 1);
	return Math.max(0, highFreqChange);
}

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
