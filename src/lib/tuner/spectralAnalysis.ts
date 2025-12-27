import type { FFTResult } from './fftAnalysis';

/**
 * High-quality spectral analysis for onset detection
 * Uses custom FFT with phase information for professional-grade detection
 */

/**
 * High-frequency weighted, positive-only spectral flux
 *
 * This is the core onset detector:
 * - Only positive changes (energy increases)
 * - Higher frequencies weighted more (attacks show up in upper harmonics first)
 * - Ignores vibrato, tremolo, and slow timbral drift
 *
 * @param current Current frame FFT result
 * @param previous Previous frame FFT result (null on first frame)
 */
export function calculateSpectralFluxWeighted(
	current: FFTResult,
	previous: FFTResult | null
): number {
	if (!previous || previous.magnitudes.length !== current.magnitudes.length) {
		return 0;
	}

	const length = current.magnitudes.length;
	let weightedFlux = 0;

	// Weight higher frequencies more heavily
	// Upper harmonics show attack transients more clearly
	for (let i = 0; i < length; i++) {
		// Frequency weight: emphasize upper bins
		// Linear ramp from 1.0 at bin 0 to 3.0 at highest bin
		const freqWeight = 1.0 + (i / length) * 2.0;

		// Only count positive changes (energy increases)
		const increase = Math.max(0, current.magnitudes[i] - previous.magnitudes[i]);

		weightedFlux += freqWeight * increase;
	}

	// Normalize by number of bins
	return weightedFlux / length;
}

/**
 * Harmonic-focused spectral flux
 *
 * Measures positive energy increases specifically around the detected fundamental
 * and its early harmonics. This is useful for bow-direction changes where the
 * harmonic stack brightens without a clear broadband attack.
 */
export function calculateHarmonicFlux(
	current: FFTResult,
	previous: FFTResult | null,
	fundamentalFreq: number | null,
	toleranceBins: number = 2,
	maxHarmonic: number = 10,
	startHarmonic: number = 2 // ignore fundamental by default
): number {
	if (!previous || !fundamentalFreq || fundamentalFreq <= 0) return 0;

	const fftSize = current.magnitudes.length * 2;
	const freqToBin = (freq: number) => Math.round((freq * fftSize) / current.sampleRate);

	let flux = 0;
	let binsCounted = 0;

	for (let h = Math.max(1, startHarmonic); h <= maxHarmonic; h++) {
		const centerBin = freqToBin(fundamentalFreq * h);
		for (let offset = -toleranceBins; offset <= toleranceBins; offset++) {
			const k = centerBin + offset;
			if (k < 0 || k >= current.magnitudes.length) continue;
			const increase = Math.max(0, current.magnitudes[k] - previous.magnitudes[k]);
			// Slightly emphasize higher harmonics where re-bows brighten first
			const harmonicWeight = 1 + 0.12 * h;
			flux += increase * harmonicWeight;
			binsCounted++;
		}
	}

	return binsCounted > 0 ? flux / binsCounted : 0;
}

/**
 * Phase deviation onset detector
 *
 * Detects sudden phase incoherence across frequency bins.
 * A new pluck/bow causes phase to reset suddenly, even if amplitude barely changes.
 * This makes repeat notes pop out clearly even under sustain.
 *
 * @param current Current frame FFT result
 * @param previous Previous frame FFT result
 * @param hopSize Number of samples between frames (for phase prediction)
 */
export function calculatePhaseDeviation(
	current: FFTResult,
	previous: FFTResult | null,
	hopSize: number
): number {
	if (!previous || previous.phases.length !== current.phases.length) {
		return 0;
	}

	const length = current.phases.length;
	let totalDeviation = 0;
	let count = 0;

	for (let k = 0; k < length; k++) {
		// Skip DC bin and very low frequencies (unreliable phase)
		if (k < 2) continue;

		// Expected phase advance for this bin
		// Phase should advance by (2π * bin * hopSize) / fftSize per frame
		const expectedDelta = (2 * Math.PI * k * hopSize) / (length * 2);

		// Actual phase change
		let actualDelta = current.phases[k] - previous.phases[k];

		// Wrap to [-π, π]
		while (actualDelta > Math.PI) actualDelta -= 2 * Math.PI;
		while (actualDelta < -Math.PI) actualDelta += 2 * Math.PI;

		// Deviation from expected
		let deviation = actualDelta - expectedDelta;
		while (deviation > Math.PI) deviation -= 2 * Math.PI;
		while (deviation < -Math.PI) deviation += 2 * Math.PI;

		// Weight by magnitude (ignore phase noise in quiet bins)
		const magnitude = current.magnitudes[k];
		if (magnitude > 0.01) {
			totalDeviation += Math.abs(deviation) * magnitude;
			count += magnitude;
		}
	}

	return count > 0 ? totalDeviation / count : 0;
}

/**
 * Frequency-focused phase deviation detector for monophonic instruments
 *
 * Only analyzes phase coherence in bins that match the detected note's harmonic series.
 * This makes repeat note detection much more sensitive by ignoring noise and overtones
 * from other sources. Falls back to full-spectrum if no frequency is provided.
 *
 * @param current Current frame FFT result
 * @param previous Previous frame FFT result
 * @param hopSize Number of samples between frames
 * @param fundamentalFreq The detected fundamental frequency (Hz), or null for full-spectrum
 * @param sampleRate Audio sample rate (Hz)
 * @param fftSize FFT size (for bin-to-frequency conversion)
 */
export function calculatePhaseDeviationFocused(
	current: FFTResult,
	previous: FFTResult | null,
	hopSize: number,
	fundamentalFreq: number | null,
	sampleRate: number,
	fftSize: number
): number {
	// Fall back to full-spectrum if no frequency detected
	if (!fundamentalFreq || fundamentalFreq <= 0) {
		return calculatePhaseDeviation(current, previous, hopSize);
	}

	if (!previous || previous.phases.length !== current.phases.length) {
		return 0;
	}

	const length = current.phases.length;
	let totalDeviation = 0;
	let count = 0;

	// Helper: convert frequency to nearest FFT bin
	const freqToBin = (freq: number) => Math.round((freq * fftSize) / sampleRate);

	// Analyze harmonics 1-12 (covers most musical content)
	const maxHarmonic = 12;
	const harmonicTolerance = 2; // Check ±2 bins around each harmonic for energy spread

	for (let h = 1; h <= maxHarmonic; h++) {
		const harmonicFreq = fundamentalFreq * h;
		const centerBin = freqToBin(harmonicFreq);

		// Check bins around this harmonic
		for (let offset = -harmonicTolerance; offset <= harmonicTolerance; offset++) {
			const k = centerBin + offset;

			// Skip out of range bins
			if (k < 2 || k >= length) continue;

			// Expected phase advance for this bin
			const expectedDelta = (2 * Math.PI * k * hopSize) / (length * 2);

			// Actual phase change
			let actualDelta = current.phases[k] - previous.phases[k];

			// Wrap to [-π, π]
			while (actualDelta > Math.PI) actualDelta -= 2 * Math.PI;
			while (actualDelta < -Math.PI) actualDelta += 2 * Math.PI;

			// Deviation from expected
			let deviation = actualDelta - expectedDelta;
			while (deviation > Math.PI) deviation -= 2 * Math.PI;
			while (deviation < -Math.PI) deviation += 2 * Math.PI;

			// Weight by magnitude (ignore phase noise in quiet bins)
			const magnitude = current.magnitudes[k];
			if (magnitude > 0.01) {
				totalDeviation += Math.abs(deviation) * magnitude;
				count += magnitude;
			}
		}
	}

	return count > 0 ? totalDeviation / count : 0;
}

/**
 * High-frequency burst detector
 *
 * Detects sudden energy increase in upper frequency bands.
 * Useful for bow scrapes, pick attacks, and other transient noise.
 *
 * @param current Current frame FFT result
 * @param previous Previous frame FFT result
 * @param startRatio Where to start measuring (0-1, typically 0.3 = upper 70%)
 */
export function calculateHighFrequencyBurst(
	current: FFTResult,
	previous: FFTResult | null,
	startRatio: number = 0.3
): number {
	if (!previous || previous.magnitudes.length !== current.magnitudes.length) {
		return 0;
	}

	const length = current.magnitudes.length;
	const startBin = Math.floor(length * startRatio);

	let currentEnergy = 0;
	let previousEnergy = 0;

	for (let i = startBin; i < length; i++) {
		currentEnergy += current.magnitudes[i];
		previousEnergy += previous.magnitudes[i];
	}

	// Return relative increase
	const increase = (currentEnergy - previousEnergy) / (previousEnergy + 1);
	return Math.max(0, increase);
}

/**
 * Combined onset detector
 *
 * Combines spectral flux and phase deviation for robust onset detection.
 * Returns a weighted combination of both features.
 *
 * @param current Current frame FFT result
 * @param previous Previous frame FFT result
 * @param hopSize Number of samples between frames
 * @param fluxWeight Weight for spectral flux (0-1)
 * @param phaseWeight Weight for phase deviation (0-1)
 */
export function calculateCombinedOnset(
	current: FFTResult,
	previous: FFTResult | null,
	hopSize: number,
	fluxWeight: number = 0.7,
	phaseWeight: number = 0.3
): number {
	const flux = calculateSpectralFluxWeighted(current, previous);
	const phase = calculatePhaseDeviation(current, previous, hopSize);

	// Normalize phase deviation to similar scale as flux
	const normalizedPhase = phase / Math.PI; // Phase deviation ranges 0-π typically

	return fluxWeight * flux + phaseWeight * normalizedPhase;
}

/**
 * Spectral difference (unweighted, bidirectional)
 *
 * Classic spectral flux without weighting or positive-only filtering.
 * Useful for comparison or certain instrument types.
 */
export function calculateSpectralDifference(
	current: FFTResult,
	previous: FFTResult | null
): number {
	if (!previous || previous.magnitudes.length !== current.magnitudes.length) {
		return 0;
	}

	let sum = 0;
	for (let i = 0; i < current.magnitudes.length; i++) {
		const diff = Math.abs(current.magnitudes[i] - previous.magnitudes[i]);
		sum += diff;
	}

	return sum / current.magnitudes.length;
}
