import type { InstrumentId } from './types';
import { noteNameToMidi, midiToNoteName } from '../util/noteNames';
import { instrumentMap } from './instruments';

export interface FingerMarking {
	note: string;
	midiNote: number;
	finger: number; // 0 = open string, 1-4 = fingers
	semitones: number; // semitones from open string
	string: number; // 0-indexed from lowest string
	stringNote: string;
}

export interface StringInstrumentFingermarkings {
	[instrumentId: string]: FingerMarking[];
}

/**
 * Get the finger-to-semitone mapping for a specific instrument
 */
function getSemitoneToFingerMapping(instrumentId: string): (semitones: number) => number | null {
	if (instrumentId === 'cello') {
		// Cello fingering pattern
		return (semitones: number): number | null => {
			if (semitones === 0) return 0;
			if (semitones <= 2) return 1;
			if (semitones === 3) return 2;
			if (semitones === 4) return 3;
			if (semitones >= 5) return 4;
			return null;
		};
	}

	// Default pattern for violin, viola, guitar
	return (semitones: number): number | null => {
		if (semitones === 0) return 0;
		if (semitones <= 2) return 1;
		if (semitones <= 4) return 2;
		if (semitones <= 6) return 3;
		if (semitones <= 10) return 4; // Extended reach in first position
		return null;
	};
}

/**
 * Generate finger markings for a stringed instrument
 * Creates a map for first position fingering (fingers 0-4)
 * Maps semitone distances to finger numbers following classical fingering patterns
 */
function generateFingerMarkings(openStrings: string[], instrumentId: string): FingerMarking[] {
	const markings: FingerMarking[] = [];
	const semitoneToFinger = getSemitoneToFingerMapping(instrumentId);

	openStrings.forEach((stringNote, stringIndex) => {
		const openMidi = noteNameToMidi(stringNote);
		if (openMidi === null) return;

		// Generate notes for first position (0-10 semitones from open string)
		for (let semitones = 0; semitones <= 10; semitones++) {
			const midiNote = openMidi + semitones;
			const note = midiToNoteName(midiNote, 'sharp');
			const finger = semitoneToFinger(semitones);

			if (note && finger !== null) {
				markings.push({
					note,
					midiNote,
					finger,
					semitones,
					string: stringIndex,
					stringNote
				});
			}
		}
	});

	return markings;
}

/**
 * Default finger markings by instrument
 * Includes first position fingerings (fingers 0-4) for all stringed instruments
 */
export const defaultFingerMarkings: StringInstrumentFingermarkings = {
	violin: generateFingerMarkings(instrumentMap.violin.strings!, 'violin'),
	viola: generateFingerMarkings(instrumentMap.viola.strings!, 'viola'),
	cello: generateFingerMarkings(instrumentMap.cello.strings!, 'cello'),
	guitar: generateFingerMarkings(instrumentMap.guitar.strings!, 'guitar')
};

/**
 * Get finger markings for a specific instrument
 */
export function getFingerMarkings(instrumentId: InstrumentId): FingerMarking[] {
	const markings = defaultFingerMarkings[instrumentId as string];
	return markings || [];
}

/**
 * Get a specific finger marking by note and instrument
 */
export function getFingerMarking(
	instrumentId: InstrumentId,
	note: string
): FingerMarking | undefined {
	const markings = getFingerMarkings(instrumentId);
	return markings.find((m) => m.note === note);
}

/**
 * Get all possible fingerings for a specific note on an instrument
 * (a note can be played on multiple strings at different fingers/positions)
 */
export function getAlternativeFingerings(
	instrumentId: InstrumentId,
	note: string
): FingerMarking[] {
	const markings = getFingerMarkings(instrumentId);
	const midiNote = noteNameToMidi(note);
	if (midiNote === null) return [];

	return markings.filter((m) => m.midiNote === midiNote);
}

/**
 * Get the best fingering (lowest finger number) for a note on an instrument
 * When multiple strings can play the note, prefer lower string and lower finger numbers
 */
export function getOptimalFingering(
	instrumentId: InstrumentId,
	note: string,
	preference: 'lowest' | 'highest' = 'lowest'
): FingerMarking | undefined {
	const alternatives = getAlternativeFingerings(instrumentId, note);
	if (alternatives.length === 0) return undefined;

	if (preference === 'lowest') {
		// Prefer higher string (lower pitch/lower position), lower finger numbers
		return alternatives.reduce((best, current) =>
			current.string > best.string ||
			(current.string === best.string && current.finger < best.finger)
				? current
				: best
		);
	} else {
		// Prefer lower string (higher pitch), higher finger numbers
		return alternatives.reduce((best, current) =>
			current.string < best.string ||
			(current.string === best.string && current.finger > best.finger)
				? current
				: best
		);
	}
}
