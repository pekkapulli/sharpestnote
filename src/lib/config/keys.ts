export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export type Mode = 'major' | 'natural_minor';
export type Accidental = 'natural' | 'sharp' | 'flat';

export interface KeySignature {
	note: string; // Base note (e.g., 'C', 'G', 'F')
	mode: Mode;
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
		sharps: [],
		flats: []
	},
	{
		note: 'G',
		mode: 'major',
		sharps: ['F#'],
		flats: []
	},
	{
		note: 'D',
		mode: 'major',
		sharps: ['F#', 'C#'],
		flats: []
	},
	{
		note: 'A',
		mode: 'major',
		sharps: ['F#', 'C#', 'G#'],
		flats: []
	},
	{
		note: 'E',
		mode: 'major',
		sharps: ['F#', 'C#', 'G#', 'D#'],
		flats: []
	},
	{
		note: 'B',
		mode: 'major',
		sharps: ['F#', 'C#', 'G#', 'D#', 'A#'],
		flats: []
	},
	{
		note: 'F#',
		mode: 'major',
		sharps: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
		flats: []
	},
	{
		note: 'C#',
		mode: 'major',
		sharps: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'],
		flats: []
	},
	{
		note: 'F',
		mode: 'major',
		sharps: [],
		flats: ['B♭']
	},
	{
		note: 'B♭',
		mode: 'major',
		sharps: [],
		flats: ['B♭', 'E♭']
	},
	{
		note: 'E♭',
		mode: 'major',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭']
	},
	{
		note: 'A♭',
		mode: 'major',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭']
	},
	{
		note: 'D♭',
		mode: 'major',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭']
	},
	{
		note: 'G♭',
		mode: 'major',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭']
	},
	{
		note: 'C♭',
		mode: 'major',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭', 'F♭']
	},

	// Natural minor keys (relative to their major)
	{
		note: 'A',
		mode: 'natural_minor',
		sharps: [],
		flats: []
	},
	{
		note: 'E',
		mode: 'natural_minor',
		sharps: ['F#'],
		flats: []
	},
	{
		note: 'B',
		mode: 'natural_minor',
		sharps: ['F#', 'C#'],
		flats: []
	},
	{
		note: 'F#',
		mode: 'natural_minor',
		sharps: ['F#', 'C#', 'G#'],
		flats: []
	},
	{
		note: 'C#',
		mode: 'natural_minor',
		sharps: ['F#', 'C#', 'G#', 'D#'],
		flats: []
	},
	{
		note: 'G#',
		mode: 'natural_minor',
		sharps: ['F#', 'C#', 'G#', 'D#', 'A#'],
		flats: []
	},
	{
		note: 'D#',
		mode: 'natural_minor',
		sharps: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
		flats: []
	},
	{
		note: 'A#',
		mode: 'natural_minor',
		sharps: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'],
		flats: []
	},
	{
		note: 'D',
		mode: 'natural_minor',
		sharps: [],
		flats: ['B♭']
	},
	{
		note: 'G',
		mode: 'natural_minor',
		sharps: [],
		flats: ['B♭', 'E♭']
	},
	{
		note: 'C',
		mode: 'natural_minor',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭']
	},
	{
		note: 'F',
		mode: 'natural_minor',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭']
	},
	{
		note: 'B♭',
		mode: 'natural_minor',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭']
	},
	{
		note: 'E♭',
		mode: 'natural_minor',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭']
	},
	{
		note: 'A♭',
		mode: 'natural_minor',
		sharps: [],
		flats: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭', 'F♭']
	}
];

// Helper function to get key signature
export function getKeySignature(note: string, mode: Mode): KeySignature {
	return keySignatures.find((key) => key.note === note && key.mode === mode) ?? keySignatures[0];
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
	{ note: 'C', label: 'C' },
	{ note: 'C#', label: 'C#' },
	{ note: 'D', label: 'D' },
	{ note: 'D#', label: 'D#' },
	{ note: 'E', label: 'E' },
	{ note: 'F', label: 'F' },
	{ note: 'F#', label: 'F#' },
	{ note: 'G', label: 'G' },
	{ note: 'G#', label: 'G#' },
	{ note: 'A', label: 'A' },
	{ note: 'A#', label: 'A#' },
	{ note: 'B', label: 'B' }
];

export const modeOptions = [
	{ mode: 'major', label: 'Major' },
	{ mode: 'natural_minor', label: 'Natural Minor' }
];
