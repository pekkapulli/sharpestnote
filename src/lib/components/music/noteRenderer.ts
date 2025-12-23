import type { KeySignature } from '$lib/config/keys';
import type { Clef } from '$lib/config/types';
import { staffLayouts } from '$lib/config/staffs';

export interface RenderedNote {
	position: number; // Y position based on letter only
	accidental: { symbol: string; yOffset: number } | null; // What accidental to display
}

export function renderNote(
	noteName: string | null,
	keySignature: KeySignature,
	clef: Clef
): RenderedNote | null {
	if (!noteName) return null;
	const match = /^([A-G])([#b]?)(\d)$/.exec(noteName);
	if (!match) return null;

	const [, letter, accidentalSign, octaveStr] = match;
	const layout = staffLayouts[clef] ?? staffLayouts.treble;
	const referenceOctave = clef === 'bass' ? 2 : clef === 'alto' ? 3 : 4;

	// Position is based on letter only, no accidental offset
	const base = layout.basePositions[letter];
	const octave = Number(octaveStr);
	const octaveOffset = (octave - referenceOctave) * 3.5;
	const position = base + octaveOffset;

	// Determine what accidental to display
	const expectedAccidental = getExpectedAccidental(letter, keySignature);

	let accidental: { symbol: string; yOffset: number } | null = null;

	if (accidentalSign) {
		// Note has an explicit accidental
		if (accidentalSign !== expectedAccidental) {
			// It's different from the key signature - show it
			accidental = {
				symbol: accidentalSign === '#' ? '♯' : '♭',
				yOffset: 0
			};
		}
		// If it matches the key signature, don't show it (it's implied)
	} else {
		// Note is natural
		if (expectedAccidental) {
			// Key signature expects an accidental but we're playing natural - show natural symbol
			accidental = {
				symbol: '♮',
				yOffset: 0
			};
		}
	}

	return { position, accidental };
}

function getExpectedAccidental(letter: string, keySignature: KeySignature): string | null {
	if (keySignature.sharps.some((s) => s.startsWith(letter))) {
		return '#';
	}
	if (keySignature.flats.some((f) => f.startsWith(letter))) {
		return 'b';
	}
	return null;
}
