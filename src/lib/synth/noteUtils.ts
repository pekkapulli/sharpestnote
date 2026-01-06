/**
 * Simple note name to MIDI number converter
 * Supports format: C4, D#5, Eb3, etc.
 */
export function noteNameToMidi(note: string): number | null {
	const letterToSemitone: Record<string, number> = {
		C: 0,
		D: 2,
		E: 4,
		F: 5,
		G: 7,
		A: 9,
		B: 11
	};

	const normalizeAccidental = (s: string): string => {
		return s.replace('♭', 'b').replace('♯', '#');
	};

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
