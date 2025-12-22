// Rhythm utilities based on 16th-note units

// 1 = sixteenth, 2 = eighth, 4 = quarter, 8 = half, 16 = whole
export type SixteenthCount = number;
export type NoteLength = 1 | 2 | 4 | 8 | 16;
export type RhythmTemplate = SixteenthCount[];

// Common 4/4 bar rhythm templates (sum of values = 16 sixteenths)
export const RHYTHM_TEMPLATES: Record<string, RhythmTemplate> = {
	whole: [16],
	halves: [8, 8],
	quarters: [4, 4, 4, 4],
	eighths: [2, 2, 2, 2, 2, 2, 2, 2],
	sixteenths: Array(16).fill(1),

	// Some mixed and syncopated patterns
	dotted8_and_16: [3, 1, 3, 1, 3, 1, 3, 1],
	pop_syncop: [4, 2, 2, 4, 4],
	syncop_3_1_pairs: [3, 1, 2, 2, 3, 1, 4],
	salsa_like: [3, 3, 2, 3, 3, 2],
	backbeat_push: [4, 3, 1, 4, 4]
};

// Convert a length (in 16th-note units) to milliseconds for a given tempo (BPM)
export function lengthToMs(lengthInSixteenths: number, tempoBPM: number): number {
	if (!Number.isFinite(tempoBPM) || tempoBPM <= 0) {
		throw new Error('tempoBPM must be a positive number');
	}
	const sixteenthMs = 60000 / tempoBPM / 4; // quarter has 4 sixteenths
	return lengthInSixteenths * sixteenthMs;
}

// Convert an entire rhythm template to an array of durations in ms
export function templateToDurationsMs(template: RhythmTemplate, tempoBPM: number): number[] {
	return template.map((len) => lengthToMs(len, tempoBPM));
}

// Validate that a template fits in a bar of given time signature (default 4/4)
export function isValidTemplate(template: RhythmTemplate, numerator = 4, denominator = 4): boolean {
	if (
		!Number.isFinite(numerator) ||
		!Number.isFinite(denominator) ||
		numerator <= 0 ||
		denominator <= 0
	) {
		return false;
	}
	const sixteenthsPerBeat = 16 / denominator; // e.g., denom 4 -> 4 sixteenths per beat
	const expected = numerator * sixteenthsPerBeat;
	const actual = template.reduce((a, b) => a + b, 0);
	return Math.abs(actual - expected) < 1e-6;
}

export const lengthNoteMap: Record<number, string> = {
	16: '\u{1D15D}', // double whole note symbol
	8: '\u{1D15E}', // half note symbol
	4: '\u{1D15F}', // quarter note symbol
	2: '\u{1D160}', // eighth note symbol
	1: '\u{1D161}' // beamed eighth note symbol
};
