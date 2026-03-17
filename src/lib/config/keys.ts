export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export type Mode = 'major' | 'natural_minor';
export type Accidental = 'natural' | 'sharp' | 'flat';

export interface KeySignature {
	note: string; // Base note (e.g., 'C', 'G', 'F')
	mode: Mode;
	preferredAccidental: 'sharp' | 'flat'; // Preferred accidental for this key
	sharps: string[]; // Notes that are sharp in this key (e.g., ['F#', 'C#', 'G#'])
	flats: string[]; // Notes that are flat in this key (e.g., ['B♭', 'E♭', 'A♭'])
}

export const modeIntervals: Record<Mode, number[]> = {
	major: [2, 2, 1, 2, 2, 2, 1],
	natural_minor: [2, 1, 2, 2, 1, 2, 2]
};

export const keySignatures: KeySignature[] = [
	// Major keys
	{
		note: 'C',
		mode: 'major',
		preferredAccidental: 'sharp',
		sharps: [],
		flats: []
	},
	{
		note: 'G',
		mode: 'major',
		preferredAccidental: 'sharp',
		sharps: ['F#'],
		flats: []
	},
	{
		note: 'D',
		mode: 'major',
		preferredAccidental: 'sharp',
		sharps: ['F#', 'C#'],
		flats: []
	},
	{
		note: 'A',
		mode: 'major',
		preferredAccidental: 'sharp',
		sharps: ['F#', 'C#', 'G#'],
		flats: []
	},
	{
		note: 'E',
		mode: 'major',
		preferredAccidental: 'sharp',
		sharps: ['F#', 'C#', 'G#', 'D#'],
		flats: []
	},
	{
		note: 'B',
		mode: 'major',
		preferredAccidental: 'sharp',
		sharps: ['F#', 'C#', 'G#', 'D#', 'A#'],
		flats: []
	},
	{
		note: 'F#',
		mode: 'major',
		preferredAccidental: 'sharp',
		sharps: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
		flats: []
	},
	{
		note: 'C#',
		mode: 'major',
		preferredAccidental: 'sharp',
		sharps: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'],
		flats: []
	},
	{
		note: 'F',
		mode: 'major',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭']
	},
	{
		note: 'B♭',
		mode: 'major',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭', 'E♭']
	},
	{
		note: 'E♭',
		mode: 'major',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭']
	},
	{
		note: 'A♭',
		mode: 'major',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭']
	},
	{
		note: 'D♭',
		mode: 'major',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭']
	},
	{
		note: 'G♭',
		mode: 'major',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭']
	},
	{
		note: 'C♭',
		mode: 'major',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭', 'F♭']
	},

	// Natural minor keys (relative to their major)
	{
		note: 'A',
		mode: 'natural_minor',
		preferredAccidental: 'sharp',
		sharps: [],
		flats: []
	},
	{
		note: 'E',
		mode: 'natural_minor',
		preferredAccidental: 'sharp',
		sharps: ['F#'],
		flats: []
	},
	{
		note: 'B',
		mode: 'natural_minor',
		preferredAccidental: 'sharp',
		sharps: ['F#', 'C#'],
		flats: []
	},
	{
		note: 'F#',
		mode: 'natural_minor',
		preferredAccidental: 'sharp',
		sharps: ['F#', 'C#', 'G#'],
		flats: []
	},
	{
		note: 'C#',
		mode: 'natural_minor',
		preferredAccidental: 'sharp',
		sharps: ['F#', 'C#', 'G#', 'D#'],
		flats: []
	},
	{
		note: 'G#',
		mode: 'natural_minor',
		preferredAccidental: 'sharp',
		sharps: ['F#', 'C#', 'G#', 'D#', 'A#'],
		flats: []
	},
	{
		note: 'D#',
		mode: 'natural_minor',
		preferredAccidental: 'sharp',
		sharps: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
		flats: []
	},
	{
		note: 'A#',
		mode: 'natural_minor',
		preferredAccidental: 'sharp',
		sharps: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'],
		flats: []
	},
	{
		note: 'D',
		mode: 'natural_minor',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭']
	},
	{
		note: 'G',
		mode: 'natural_minor',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭', 'E♭']
	},
	{
		note: 'C',
		mode: 'natural_minor',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭']
	},
	{
		note: 'F',
		mode: 'natural_minor',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭']
	},
	{
		note: 'B♭',
		mode: 'natural_minor',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭']
	},
	{
		note: 'E♭',
		mode: 'natural_minor',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭']
	},
	{
		note: 'A♭',
		mode: 'natural_minor',
		preferredAccidental: 'flat',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭', 'F♭']
	}
];

// Helper function to get key signature
export function getKeySignature(note: string, mode: Mode): KeySignature {
	return keySignatures.find((key) => key.note === note && key.mode === mode) ?? keySignatures[0];
}

function keyNoteToSemitone(note: string): number | null {
	const normalized = note.replace('♭', 'b');
	const semitoneByNote: Record<string, number> = {
		C: 0,
		'B#': 0,
		'C#': 1,
		Db: 1,
		D: 2,
		'D#': 3,
		Eb: 3,
		E: 4,
		Fb: 4,
		'F#': 6,
		Gb: 6,
		F: 5,
		'E#': 5,
		G: 7,
		'G#': 8,
		Ab: 8,
		A: 9,
		'A#': 10,
		Bb: 10,
		B: 11,
		Cb: 11
	};

	return semitoneByNote[normalized] ?? null;
}

/**
 * Returns the written key signature for a transposing instrument.
 * `transpositionSemitones` follows the instrument config convention (written -> sounding).
 */
export function getTransposedKeySignature(
	note: string,
	mode: Mode,
	transpositionSemitones: number
): KeySignature {
	const baseKeySignature = getKeySignature(note, mode);
	if (transpositionSemitones === 0) {
		return baseKeySignature;
	}

	const baseSemitone = keyNoteToSemitone(baseKeySignature.note);
	if (baseSemitone === null) {
		return baseKeySignature;
	}

	const targetSemitone = (((baseSemitone - transpositionSemitones) % 12) + 12) % 12;
	const candidates = keySignatures.filter((key) => {
		if (key.mode !== mode) return false;
		return keyNoteToSemitone(key.note) === targetSemitone;
	});

	if (!candidates.length) {
		return baseKeySignature;
	}

	const withMatchingAccidental = candidates.find(
		(candidate) => candidate.preferredAccidental === baseKeySignature.preferredAccidental
	);
	if (withMatchingAccidental) {
		return withMatchingAccidental;
	}

	return candidates.reduce((best, candidate) => {
		const bestAccidentals = best.sharps.length + best.flats.length;
		const candidateAccidentals = candidate.sharps.length + candidate.flats.length;
		return candidateAccidentals < bestAccidentals ? candidate : best;
	});
}

// Helper function to get all major keys
export function getMajorKeys(): KeySignature[] {
	return keySignatures.filter((key) => key.mode === 'major');
}

// Helper function to get all natural minor keys
export function getNaturalMinorKeys(): KeySignature[] {
	return keySignatures.filter((key) => key.mode === 'natural_minor');
}

// Get relative minor of a major key
export function getRelativeMinor(majorKey: string): KeySignature | undefined {
	const majorKeyConfig = getKeySignature(majorKey, 'major');
	if (!majorKeyConfig) return undefined;

	// The relative minor is 3 semitones down from the major key
	const relativeNotes: Record<string, string> = {
		C: 'A',
		G: 'E',
		D: 'B',
		A: 'F#',
		E: 'C#',
		B: 'G#',
		'F#': 'D#',
		'C#': 'A#',
		F: 'D',
		'B♭': 'G',
		'E♭': 'C',
		'A♭': 'F',
		'D♭': 'B♭',
		'G♭': 'E♭',
		'C♭': 'A♭'
	};

	return getKeySignature(relativeNotes[majorKey], 'natural_minor');
}

// Get relative major of a natural minor key
export function getRelativeMajor(minorKey: string): KeySignature | undefined {
	// The relative major is 3 semitones up from the minor key
	const relativeMajorNotes: Record<string, string> = {
		A: 'C',
		E: 'G',
		B: 'D',
		'F#': 'A',
		'C#': 'E',
		'G#': 'B',
		'D#': 'F#',
		'A#': 'C#',
		D: 'F',
		G: 'B♭',
		C: 'E♭',
		F: 'A♭',
		'B♭': 'D♭',
		'E♭': 'G♭',
		'A♭': 'C♭'
	};

	return getKeySignature(relativeMajorNotes[minorKey], 'major');
}

export const keyOptions = [
	{ value: 'C', label: 'C' },
	{ value: 'C#', label: 'C#' },
	{ value: 'D', label: 'D' },
	{ value: 'D#', label: 'D#' },
	{ value: 'E', label: 'E' },
	{ value: 'F', label: 'F' },
	{ value: 'F#', label: 'F#' },
	{ value: 'G', label: 'G' },
	{ value: 'G#', label: 'G#' },
	{ value: 'A', label: 'A' },
	{ value: 'A#', label: 'A#' },
	{ value: 'B', label: 'B' }
];

export const modeOptions = [
	{ mode: 'major', label: 'Major' },
	{ mode: 'natural_minor', label: 'Natural Minor' }
];
