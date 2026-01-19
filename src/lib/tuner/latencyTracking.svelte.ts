/**
 * Latency tracking for measuring performance from user interaction to onset detection
 * to note output. Helps diagnose responsiveness issues in real-time scenarios.
 */

export interface LatencyMetrics {
	timeSinceFirstAmplitude: number; // ms since amplitude first exceeded threshold
	timeSincePitchLocked: number; // ms since hasPitch became true
	timeSinceOnset: number; // ms since last onset fired
	timeSinceNoteOutput: number; // ms from onset to note appearing (includes debounce)
	lastOnsetTimestamp: number;
}

export interface LatencyTracking {
	sessionStartTime: number | null;
	firstAmplitudeTime: number | null;
	firstPitchLockTime: number | null;
	lastOnsetTime: number | null;
	firstNoteOutputTime: number | null;
	metrics: LatencyMetrics;
}

export function createLatencyTracking(): LatencyTracking {
	return {
		sessionStartTime: null,
		firstAmplitudeTime: null,
		firstPitchLockTime: null,
		lastOnsetTime: null,
		firstNoteOutputTime: null,
		metrics: {
			timeSinceFirstAmplitude: 0,
			timeSincePitchLocked: 0,
			timeSinceOnset: 0,
			timeSinceNoteOutput: 0,
			lastOnsetTimestamp: 0
		}
	};
}

export function updateLatencyMilestones(
	tracking: LatencyTracking,
	now: number,
	amplitude: number,
	minAmplitudeThreshold: number,
	hasPitch: boolean
) {
	// Track session start (first meaningful signal - 30% of threshold)
	if (tracking.sessionStartTime === null && amplitude > minAmplitudeThreshold * 0.3) {
		tracking.sessionStartTime = now;
	}

	// Track first amplitude crossing threshold
	if (tracking.firstAmplitudeTime === null && amplitude > minAmplitudeThreshold) {
		tracking.firstAmplitudeTime = now;
	}

	// Track first pitch lock
	if (tracking.firstPitchLockTime === null && hasPitch) {
		tracking.firstPitchLockTime = now;
	}

	// Calculate milestone gaps
	if (tracking.sessionStartTime !== null && tracking.firstAmplitudeTime !== null) {
		tracking.metrics.timeSinceFirstAmplitude =
			tracking.firstAmplitudeTime - tracking.sessionStartTime;
	}
	if (tracking.firstAmplitudeTime !== null && tracking.firstPitchLockTime !== null) {
		tracking.metrics.timeSincePitchLocked =
			tracking.firstPitchLockTime - tracking.firstAmplitudeTime;
	}
}

export function recordOnset(tracking: LatencyTracking, now: number) {
	tracking.lastOnsetTime = now;
	tracking.metrics.lastOnsetTimestamp = now;

	// Track time from first amplitude to onset
	if (tracking.firstAmplitudeTime !== null) {
		tracking.metrics.timeSinceOnset = now - tracking.firstAmplitudeTime;
	}
}

export function recordNoteOutput(tracking: LatencyTracking) {
	if (tracking.firstNoteOutputTime === null && tracking.lastOnsetTime !== null) {
		tracking.firstNoteOutputTime = performance.now();
		tracking.metrics.timeSinceNoteOutput = tracking.firstNoteOutputTime - tracking.lastOnsetTime;
	}
}

export function resetLatencyTracking(tracking: LatencyTracking) {
	tracking.sessionStartTime = null;
	tracking.firstAmplitudeTime = null;
	tracking.firstPitchLockTime = null;
	tracking.lastOnsetTime = null;
	tracking.firstNoteOutputTime = null;
	tracking.metrics.timeSinceFirstAmplitude = 0;
	tracking.metrics.timeSincePitchLocked = 0;
	tracking.metrics.timeSinceOnset = 0;
	tracking.metrics.timeSinceNoteOutput = 0;
	tracking.metrics.lastOnsetTimestamp = 0;
}
