import type { DetectionConfig, InstrumentConfig } from '$lib/config/instruments';
import { frequencyFromNoteNumber } from './tune';
import { noteNameToMidi } from '$lib/util/noteNames';

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
 * Get the sounding range of an instrument in Hz, accounting for transposition
 */
export function getInstrumentSoundingRange(
	instrument: InstrumentConfig,
	a4: number = 442
): { minFreq: number; maxFreq: number } {
	const bottomMidi = noteNameToMidi(instrument.bottomNote);
	const topMidi = noteNameToMidi(instrument.topNote);

	if (bottomMidi === null || topMidi === null) {
		return { minFreq: 0, maxFreq: Infinity };
	}

	// Apply transposition to the written range to get sounding range
	const soundingBottomMidi = bottomMidi + instrument.transpositionSemitones;
	const soundingTopMidi = topMidi + instrument.transpositionSemitones;

	const minFreq = frequencyFromNoteNumber(soundingBottomMidi, a4);
	const maxFreq = frequencyFromNoteNumber(soundingTopMidi, a4);

	return { minFreq, maxFreq };
}

/**
 * Check if frequency is stable over recent history
 */
export function isFrequencyStable(
	freq: number,
	frequencyHistory: number[],
	windowSize: number = 3
): boolean {
	if (frequencyHistory.length < windowSize) return false;
	const recent = frequencyHistory.slice(-windowSize);
	const avg = recent.reduce((a, b) => a + b) / recent.length;
	const variance = recent.reduce((sum, f) => sum + Math.abs(f - avg), 0) / recent.length;
	const tolerancePercent = freq < 100 ? 0.06 : 0.05; // 6% for low freq, 5% otherwise
	return variance < avg * tolerancePercent;
}

/**
 * Check if a frequency is within an instrument's sounding range (with tolerance)
 */
export function isFrequencyInInstrumentRange(
	freq: number,
	instrument: InstrumentConfig,
	a4: number = 442
): boolean {
	const { minFreq, maxFreq } = getInstrumentSoundingRange(instrument, a4);
	// Add small margins: 1% below minimum, 2% above maximum
	// This accounts for slight pitch deviations while preventing octave errors
	const lowerMargin = minFreq * 0.01;
	const upperMargin = maxFreq * 0.02;
	return freq >= minFreq - lowerMargin && freq <= maxFreq + upperMargin;
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
