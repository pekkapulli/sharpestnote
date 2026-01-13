/**
 * Simple note name to MIDI number converter
 * Supports format: C4, D#5, Eb3, c/4, d#/5, etc.
 */
export function noteNameToMidi(note: string): number | null {
	const letterToSemitone: Record<string, number> = {
		C: 0,
		c: 0,
		D: 2,
		d: 2,
		E: 4,
		e: 4,
		F: 5,
		f: 5,
		G: 7,
		g: 7,
		A: 9,
		a: 9,
		B: 11,
		b: 11
	};

	const normalizeAccidental = (s: string): string => {
		return s.replace('♭', 'b').replace('♯', '#');
	};

	// Support both "C4" and "c/4" formats
	const upperMatch = /^([A-G])([#b♭♯]?)(\d)$/.exec(note);
	const vexMatch = /^([a-g])([#b♭♯]?)\/(\d)$/.exec(note);
	const m = upperMatch || vexMatch;
	if (!m) return null;
	const [, letter, accidentalRaw, octaveStr] = m;
	const accidental = normalizeAccidental(accidentalRaw || '');
	let semitone = letterToSemitone[letter];
	if (accidental === '#') semitone += 1;
	if (accidental === 'b') semitone -= 1;
	const octave = Number(octaveStr);
	return (octave + 1) * 12 + semitone;
}
