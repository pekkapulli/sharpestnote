import { noteNameFromMidi } from '$lib/tuner/tune';
import type { Accidental } from '$lib/tuner/tune';

export const LETTER_TO_SEMITONE: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11
};

export function noteNameToMidi(n: string): number | null {
	const m = /^([A-G])([#b]?)(\d)$/.exec(n);
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
