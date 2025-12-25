import type { DetectionConfig } from '$lib/config/instruments';

export function calculateAmplitude(data: Float32Array): number {
	let sum = 0;
	for (let i = 0; i < data.length; i++) {
		sum += data[i] * data[i];
	}
	return Math.sqrt(sum / data.length);
}

export function calculateSpectralFlux(
	currentSpectrum: Float32Array,
	previousSpectrum: Float32Array | null
): number {
	if (!previousSpectrum || previousSpectrum.length !== currentSpectrum.length) {
		return 0;
	}

	const normalize = (spec: Float32Array) => {
		let sum = 0;
		for (let i = 0; i < spec.length; i++) {
			sum += spec[i] * spec[i];
		}
		const norm = Math.sqrt(sum);
		return norm > 0 ? Array.from(spec).map((v) => v / norm) : Array.from(spec);
	};

	const currNorm = normalize(currentSpectrum);
	const prevNorm = normalize(previousSpectrum);

	let squaredDist = 0;
	for (let i = 0; i < currNorm.length; i++) {
		const diff = currNorm[i] - prevNorm[i];
		squaredDist += diff * diff;
	}
	return Math.sqrt(squaredDist);
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
