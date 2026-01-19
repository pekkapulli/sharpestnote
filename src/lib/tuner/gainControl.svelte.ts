/**
 * Auto-gain control for managing microphone input levels.
 * Adapts gain to maintain consistent amplitude across different input levels.
 */

export interface GainState {
	gain: number;
	autoGainEnabled: boolean;
	targetAmplitude: number;
	maxGain: number;
	minGain: number;
	gainAdjustRate: number;
	autoGainInterval: number;
	autoGainElapsed: number;
	recentPeakAmplitude: number;
	peakAmplitudeWindow: number[];
}

export function createGainState(options: {
	gain?: number;
	autoGain?: boolean;
	targetAmplitude?: number;
	maxGain?: number;
	minGain?: number;
	gainAdjustRate?: number;
	autoGainInterval?: number;
}) {
	const state: GainState = {
		gain: options.gain ?? 2,
		autoGainEnabled: options.autoGain ?? true,
		targetAmplitude: options.targetAmplitude ?? 0.7,
		maxGain: options.maxGain ?? 500,
		minGain: options.minGain ?? 0.1,
		gainAdjustRate: options.gainAdjustRate ?? 0.3,
		autoGainInterval: options.autoGainInterval ?? 150,
		autoGainElapsed: 0,
		recentPeakAmplitude: 0,
		peakAmplitudeWindow: []
	};

	function clampGain(value: number): number {
		return Math.max(state.minGain, Math.min(state.maxGain, value));
	}

	function updatePeakAmplitude(amplitude: number) {
		state.peakAmplitudeWindow.push(amplitude);
		if (state.peakAmplitudeWindow.length > 10) {
			state.peakAmplitudeWindow.shift(); // Keep last ~100-150ms
		}
		state.recentPeakAmplitude = Math.max(...state.peakAmplitudeWindow);
	}

	function updateAutoGain(dt: number, gainNode: GainNode | null): boolean {
		let adjusted = false;

		state.autoGainElapsed += dt;
		if (state.autoGainEnabled && gainNode && state.autoGainElapsed > state.autoGainInterval) {
			state.autoGainElapsed = 0;
			const target = state.targetAmplitude;
			// Wider tolerance range for smoother operation
			const lower = target * 0.5; // Allow drops to 50% of target
			const upper = target * 1.8; // Allow peaks up to 180% of target
			const rate = Math.max(0.05, Math.min(0.5, state.gainAdjustRate));
			const adjustStep = 1 + rate;
			const currentGain = state.gain;

			// Use recent peak amplitude from rolling window
			const peak = state.recentPeakAmplitude;

			// Only adjust if we have some signal (avoid boosting pure silence)
			if (peak > 0.001) {
				if (peak < lower) {
					// Signal too quiet - increase gain more aggressively
					const ratio = peak / target;
					const boost = ratio < 0.1 ? adjustStep * 1.5 : adjustStep; // Extra boost for very weak signals
					const newGain = clampGain(currentGain * boost);
					state.gain = newGain;
					gainNode.gain.value = newGain;
					adjusted = true;
				} else if (peak > upper) {
					// Signal too loud - decrease gain
					const newGain = clampGain(currentGain / adjustStep);
					state.gain = newGain;
					gainNode.gain.value = newGain;
					adjusted = true;
				}
			}
		}

		return adjusted;
	}

	function setGain(value: number) {
		const clamped = clampGain(value);
		state.gain = clamped;
		return clamped;
	}

	function reset() {
		state.autoGainElapsed = 0;
		state.recentPeakAmplitude = 0;
		state.peakAmplitudeWindow = [];
	}

	return {
		state,
		clampGain,
		updatePeakAmplitude,
		updateAutoGain,
		setGain,
		reset
	};
}
