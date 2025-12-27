import FFT from 'fft.js';

/**
 * High-quality FFT analysis module using fft.js
 * Provides magnitude spectrum, phase information, and spectral analysis
 */

export interface FFTResult {
	magnitudes: Float32Array; // Magnitude spectrum (linear scale)
	phases: Float32Array; // Phase angles in radians
	complexSpectrum: Float32Array; // Raw complex output [real0, imag0, real1, imag1, ...]
	binCount: number; // Number of frequency bins
	sampleRate: number;
}

/**
 * Apply Hann window to time-domain signal
 * Reduces spectral leakage and improves frequency resolution
 */
export function applyHannWindow(signal: Float32Array): Float32Array {
	const windowed = new Float32Array(signal.length);
	const N = signal.length;

	for (let i = 0; i < N; i++) {
		const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
		windowed[i] = signal[i] * window;
	}

	return windowed;
}

/**
 * Apply Hamming window to time-domain signal
 * Alternative to Hann, slightly different frequency response
 */
export function applyHammingWindow(signal: Float32Array): Float32Array {
	const windowed = new Float32Array(signal.length);
	const N = signal.length;

	for (let i = 0; i < N; i++) {
		const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1));
		windowed[i] = signal[i] * window;
	}

	return windowed;
}

/**
 * Perform FFT on time-domain signal and extract magnitude + phase
 *
 * @param timeDomain Time-domain samples (must be power of 2 length)
 * @param sampleRate Sample rate in Hz
 * @param applyWindow Whether to apply Hann window (recommended for onset detection)
 */
export function performFFT(
	timeDomain: Float32Array,
	sampleRate: number,
	applyWindow: boolean = true
): FFTResult {
	const fftSize = timeDomain.length;

	// Ensure power of 2
	if ((fftSize & (fftSize - 1)) !== 0) {
		throw new Error(`FFT size must be power of 2, got ${fftSize}`);
	}

	// Apply window function to reduce spectral leakage
	const windowed = applyWindow ? applyHannWindow(timeDomain) : timeDomain;

	// Create FFT instance and output buffer
	const fft = new FFT(fftSize);
	const complexSpectrum = new Float32Array(fftSize * 2); // Real and imaginary interleaved

	// Perform forward FFT
	// fft.js expects input as regular array or Float32Array
	const input = Array.from(windowed);
	const output = fft.createComplexArray();
	fft.realTransform(output, input);
	fft.completeSpectrum(output);

	// Copy to our buffer
	for (let i = 0; i < output.length; i++) {
		complexSpectrum[i] = output[i];
	}

	// Extract magnitudes and phases
	const binCount = fftSize / 2; // Only use positive frequencies
	const magnitudes = new Float32Array(binCount);
	const phases = new Float32Array(binCount);

	for (let i = 0; i < binCount; i++) {
		const real = complexSpectrum[i * 2];
		const imag = complexSpectrum[i * 2 + 1];

		// Magnitude: sqrt(real^2 + imag^2)
		magnitudes[i] = Math.sqrt(real * real + imag * imag);

		// Phase: atan2(imag, real)
		phases[i] = Math.atan2(imag, real);
	}

	return {
		magnitudes,
		phases,
		complexSpectrum,
		binCount,
		sampleRate
	};
}

/**
 * Convert magnitude spectrum to decibels
 * Useful for visualization and dynamic range compression
 */
export function magnitudesToDecibels(magnitudes: Float32Array, minDb: number = -100): Float32Array {
	const db = new Float32Array(magnitudes.length);

	for (let i = 0; i < magnitudes.length; i++) {
		// 20 * log10(magnitude), with floor at minDb
		const dbValue = 20 * Math.log10(Math.max(magnitudes[i], 1e-10));
		db[i] = Math.max(dbValue, minDb);
	}

	return db;
}

/**
 * Get frequency in Hz for a given FFT bin index
 */
export function binToFrequency(binIndex: number, fftSize: number, sampleRate: number): number {
	return (binIndex * sampleRate) / fftSize;
}

/**
 * Get FFT bin index for a given frequency in Hz
 */
export function frequencyToBin(frequency: number, fftSize: number, sampleRate: number): number {
	return Math.round((frequency * fftSize) / sampleRate);
}

/**
 * Calculate spectral centroid (center of mass of spectrum)
 * Higher values = brighter sound
 */
export function calculateSpectralCentroid(
	magnitudes: Float32Array,
	fftSize: number,
	sampleRate: number
): number {
	let weightedSum = 0;
	let sum = 0;

	for (let i = 0; i < magnitudes.length; i++) {
		const freq = binToFrequency(i, fftSize, sampleRate);
		const magnitude = magnitudes[i];
		weightedSum += freq * magnitude;
		sum += magnitude;
	}

	return sum > 0 ? weightedSum / sum : 0;
}

/**
 * Calculate spectral rolloff (frequency below which X% of energy is contained)
 * Common threshold: 0.85 (85% of energy)
 */
export function calculateSpectralRolloff(
	magnitudes: Float32Array,
	fftSize: number,
	sampleRate: number,
	threshold: number = 0.85
): number {
	// Calculate total energy
	let totalEnergy = 0;
	for (let i = 0; i < magnitudes.length; i++) {
		totalEnergy += magnitudes[i] * magnitudes[i];
	}

	// Find bin where cumulative energy exceeds threshold
	const targetEnergy = totalEnergy * threshold;
	let cumulativeEnergy = 0;

	for (let i = 0; i < magnitudes.length; i++) {
		cumulativeEnergy += magnitudes[i] * magnitudes[i];
		if (cumulativeEnergy >= targetEnergy) {
			return binToFrequency(i, fftSize, sampleRate);
		}
	}

	return binToFrequency(magnitudes.length - 1, fftSize, sampleRate);
}
