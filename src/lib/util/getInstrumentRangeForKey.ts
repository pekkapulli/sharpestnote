import { noteNameFromMidi } from '$lib/tuner/tune';
import { instrumentMap } from '$lib/config/instruments';
import { getKeySignature, type Mode } from '$lib/config/keys';
import type { InstrumentId } from '$lib/config/types';

const letterToSemitone: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11
};

function normalizeAccidental(s: string): string {
	return s.replace('♭', 'b').replace('♯', '#');
}

function noteNameToMidi(note: string): number | null {
	const m = /^([A-G])([#b♭♯]?)(\d)$/.exec(note);
	if (!m) return null;
	const [, letter, accidentalRaw, octaveStr] = m;
	const accidental = normalizeAccidental(accidentalRaw || '');
	let semitone = letterToSemitone[letter];
	if (accidental === '#') semitone += 1;
	if (accidental === 'b') semitone -= 1;
	const octave = Number(octaveStr);
	return (octave + 1) * 12 + semitone;
}

function noteToPitchClass(note: string): number | null {
	const m = /^([A-G])([#b♭♯]?)/.exec(note);
	if (!m) return null;
	const [, letter, accidentalRaw] = m;
	const accidental = normalizeAccidental(accidentalRaw || '');
	let semitone = letterToSemitone[letter];
	if (accidental === '#') semitone += 1;
	if (accidental === 'b') semitone -= 1;
	return ((semitone % 12) + 12) % 12;
}

function buildScalePitchClasses(root: number, mode: Mode): Set<number> {
	const intervals = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
	return new Set(intervals.map((i) => (root + i) % 12));
}

export function getInstrumentRangeForKey(
	instrumentId: InstrumentId,
	keyNote: string,
	mode: Mode
): string[] {
	const cfg = instrumentMap[instrumentId];
	if (!cfg) return [];

	const keySig = getKeySignature(keyNote, mode);
	const preferAccidental = keySig && keySig.flats.length > 0 ? 'flat' : 'sharp';

	const rootPc = noteToPitchClass(keyNote);
	if (rootPc === null) return [];
	const scale = buildScalePitchClasses(rootPc, mode);

	const bottomMidi = noteNameToMidi(cfg.bottomNote);
	const topMidi = noteNameToMidi(cfg.topNote);
	if (bottomMidi === null || topMidi === null) return [];

	const result: string[] = [];
	for (let midi = bottomMidi; midi <= topMidi; midi += 1) {
		if (scale.has(midi % 12)) {
			result.push(noteNameFromMidi(midi, preferAccidental));
		}
	}

	return result;
}
