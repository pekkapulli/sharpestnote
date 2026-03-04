import type { DetectionConfig, InstrumentConfig } from '$lib/config/instruments';
import { frequencyFromNoteNumber } from './tune';
import { noteNameToMidi } from '$lib/util/noteNames';
import type { FFTResult } from './fftAnalysis';
import { hasSignificantEnergyAtLowerOctave } from './spectralAnalysis';

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

/**
 * Detect and correct octave errors in detected frequency.
 *
 * Autocorrelation-based pitch detection can sometimes lock onto a harmonic (typically
 * the 2nd harmonic, double the fundamental). This function checks if the lower octave
 * has significant spectral energy or was recently detected as stable, indicating the
 * detected frequency is likely a harmonic and should be halved.
 *
 * @param freq Detected fundamental frequency (Hz)
 * @param fftResult Current FFT result (for spectral energy analysis)
 * @param instrument Instrument configuration (for range validation)
 * @param sampleRate Audio sample rate (Hz)
 * @param frequencyHistory Recent frequency detections for secondary validation
 * @param a4 A4 reference frequency (default 442 Hz)
 * @returns Corrected frequency (either original or halved if octave error detected)
 */
export function correctOctaveErrors(
	freq: number,
	fftResult: FFTResult,
	instrument: InstrumentConfig,
	sampleRate: number,
	frequencyHistory: number[],
	a4: number = 442,
	expectedMidi: number | null = null
): number {
	if (freq <= 0 || frequencyHistory.length < 5) {
		return freq;
	}

	const halfFreq = freq / 2;
	const halfInRange = isFrequencyInInstrumentRange(halfFreq, instrument, a4);

	// Only consider octave correction if the lower octave is also in the instrument's range
	if (!halfInRange) {
		return freq;
	}

	const centsDistance = (a: number, b: number): number => 1200 * Math.abs(Math.log2(a / b));

	const recentHistory = frequencyHistory.slice(-5).filter((f) => f > 0);
	const recentAverage =
		recentHistory.length > 0
			? recentHistory.reduce((sum, value) => sum + value, 0) / recentHistory.length
			: 0;
	const looksLikeUpwardOctaveJump =
		recentAverage > 0 &&
		centsDistance(freq, recentAverage * 2) < 45 &&
		centsDistance(halfFreq, recentAverage) < 45;
	const looksLikeDownwardOctaveJump =
		recentAverage > 0 &&
		centsDistance(freq, recentAverage / 2) < 45 &&
		centsDistance(freq * 2, recentAverage) < 45;

	const openStringFrequencies = (instrument.strings ?? [])
		.map((note) => noteNameToMidi(note))
		.filter((midi): midi is number => midi !== null)
		.map((midi) => frequencyFromNoteNumber(midi + instrument.transpositionSemitones, a4));

	const halfNearOpenString = openStringFrequencies.some(
		(openFreq) => centsDistance(halfFreq, openFreq) < 35
	);

	// Primary check: Look for significant energy at the lower octave in the FFT
	// Use adaptive thresholds for weak fundamentals and open-string regions on small instruments
	const useRelaxedThresholds = halfFreq < 330 || halfNearOpenString || looksLikeUpwardOctaveJump;
	const lowerOctaveEnergyThreshold = useRelaxedThresholds ? 0.12 : 0.2;
	const lowerOctaveBandwidthCents = useRelaxedThresholds ? 90 : 50;
	const lowerOctaveEnergyFloorFactor = useRelaxedThresholds ? 1.3 : 2.0;

	const hasLowerOctaveEnergy = hasSignificantEnergyAtLowerOctave(
		fftResult,
		freq,
		sampleRate,
		lowerOctaveEnergyThreshold,
		lowerOctaveBandwidthCents,
		lowerOctaveEnergyFloorFactor
	);

	// Secondary checks: prefer octave continuity from recent history
	const nearHalfCount = recentHistory.filter(
		(f) => Math.abs(f - halfFreq) / halfFreq < 0.02
	).length;
	const nearFreqCount = recentHistory.filter((f) => Math.abs(f - freq) / freq < 0.02).length;
	const nearDoubleCount = recentHistory.filter(
		(f) => Math.abs(f - freq * 2) / (freq * 2) < 0.02
	).length;
	const wasHalfFreqStable = nearHalfCount > 0;
	const favorsLowerOctaveHistory = nearHalfCount >= 2 && nearHalfCount >= nearFreqCount;
	const favorsUpperOctaveHistory = nearDoubleCount >= 2 && nearDoubleCount >= nearFreqCount;
	const strongLowerOctaveJumpContinuity = looksLikeUpwardOctaveJump && nearFreqCount <= 1;
	const strongUpperOctaveJumpContinuity = looksLikeDownwardOctaveJump && nearFreqCount <= 1;

	const candidateFrequencies = [halfFreq, freq, freq * 2].filter((candidate) =>
		isFrequencyInInstrumentRange(candidate, instrument, a4)
	);

	const chooseExpectedBiasedFrequency = (): number | null => {
		if (expectedMidi === null || candidateFrequencies.length === 0) {
			return null;
		}

		const expectedFreq = frequencyFromNoteNumber(expectedMidi, a4);
		const centsFromExpected = (candidate: number) =>
			1200 * Math.abs(Math.log2(candidate / expectedFreq));
		const centsFromRecent = (candidate: number) =>
			recentAverage > 0 ? 1200 * Math.abs(Math.log2(candidate / recentAverage)) : 0;

		let bestCandidate = candidateFrequencies[0];
		let bestScore = Number.NEGATIVE_INFINITY;

		for (const candidate of candidateFrequencies) {
			const expectedPenalty = Math.min(120, centsFromExpected(candidate));
			const continuityPenalty = recentAverage > 0 ? Math.min(90, centsFromRecent(candidate)) : 0;

			const isHalf = Math.abs(candidate - halfFreq) < 1e-6;
			const isDouble = Math.abs(candidate - freq * 2) < 1e-6;

			// Bonuses for lower octave (f → f/2)
			const lowerSpectralBonus = isHalf && hasLowerOctaveEnergy ? 30 : 0;
			const lowerHistoryBonus = isHalf && favorsLowerOctaveHistory ? 20 : 0;
			const lowerJumpBonus = isHalf && strongLowerOctaveJumpContinuity ? 20 : 0;

			// Bonuses for upper octave (f → 2f)
			const upperHistoryBonus = isDouble && favorsUpperOctaveHistory ? 20 : 0;
			const upperJumpBonus = isDouble && strongUpperOctaveJumpContinuity ? 20 : 0;

			const score =
				lowerSpectralBonus +
				lowerHistoryBonus +
				lowerJumpBonus +
				upperHistoryBonus +
				upperJumpBonus -
				expectedPenalty -
				continuityPenalty;

			if (score > bestScore) {
				bestScore = score;
				bestCandidate = candidate;
			}
		}

		return bestScore > -90 ? bestCandidate : null;
	};

	const expectedBiasedFreq = chooseExpectedBiasedFrequency();
	if (expectedBiasedFreq !== null) {
		return expectedBiasedFreq;
	}

	// Fallback: correct to lower octave when spectral evidence exists,
	// or when history strongly indicates we should stay in the lower octave
	if (
		hasLowerOctaveEnergy ||
		(wasHalfFreqStable && favorsLowerOctaveHistory) ||
		strongLowerOctaveJumpContinuity
	) {
		return halfFreq;
	}

	return freq;
}
