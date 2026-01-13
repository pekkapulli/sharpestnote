import { noteNameFromMidi } from '$lib/tuner/tune';
import type { Accidental } from '$lib/tuner/tune';

export const LETTER_TO_SEMITONE: Record<string, number> = {
	c: 0,
	C: 0,
	d: 2,
	D: 2,
	e: 4,
	E: 4,
	f: 5,
	F: 5,
	g: 7,
	G: 7,
	a: 9,
	A: 9,
	b: 11,
	B: 11
};

export function noteNameToMidi(n: string): number | null {
	// Support both "C4" and "c/4" formats
	const upperMatch = /^([A-G])([#b]?)(\d)$/.exec(n);
	const vexMatch = /^([a-g])([#b]?)\/(\d)$/.exec(n);
	const m = upperMatch || vexMatch;
	if (!m) return null;
	const [, letter, accidental, octaveStr] = m;
	let semitone = LETTER_TO_SEMITONE[letter];
	if (accidental === '#') semitone += 1;
	if (accidental === 'b') semitone -= 1;
	const octave = Number(octaveStr);
	return (octave + 1) * 12 + semitone;
}

export function midiToNoteName(midi: number, accidental: Accidental): string {
	return noteNameFromMidi(midi, accidental);
}

export function transposeNoteName(
	note: string,
	semitones: number,
	accidental: Accidental
): string | null {
	const midi = noteNameToMidi(note);
	if (midi === null) return null;
	return midiToNoteName(midi + semitones, accidental);
}

export function transposeForTransposition(
	note: string | null,
	transpositionSemitones: number,
	accidental: Accidental
): string | null {
	if (!note) return null;
	return transposeNoteName(note, transpositionSemitones, accidental);
}

export function transposeDetectedNoteForDisplay(
	note: string | null,
	transpositionSemitones: number,
	accidental: Accidental
): string | null {
	if (!note) return null;
	return transposeForTransposition(note, -transpositionSemitones, accidental) ?? note;
}
