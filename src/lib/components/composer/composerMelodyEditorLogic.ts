import type { KeySignature } from '$lib/config/keys';
import type { MelodyItem, NoteLength } from '$lib/config/melody';
import type { Clef } from '$lib/config/types';

export const LENGTH_SHORTCUT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
export const REST_CHUNK_LENGTHS: NoteLength[] = [16, 12, 8, 6, 4, 3, 2, 1];
export const MAX_MELODY_BARS = 16;

const BOTTOM_STAFF_LINE_NOTE_BY_CLEF: Record<Clef, string> = {
	treble: 'e/4',
	alto: 'f/4',
	bass: 'g/2'
};

export function toBarAndItemIndex(
	melody: MelodyItem[][],
	flatIndex: number
): { barIndex: number; itemIndex: number } | null {
	if (flatIndex < 0) return null;
	let cursor = 0;
	for (let barIndex = 0; barIndex < melody.length; barIndex++) {
		const bar = melody[barIndex] ?? [];
		if (flatIndex < cursor + bar.length) {
			return { barIndex, itemIndex: flatIndex - cursor };
		}
		cursor += bar.length;
	}
	return null;
}

export function getItemAtFlatIndex(melody: MelodyItem[][], flatIndex: number): MelodyItem | null {
	const mapped = toBarAndItemIndex(melody, flatIndex);
	if (!mapped) return null;
	return melody[mapped.barIndex]?.[mapped.itemIndex] ?? null;
}

export function getKeySignatureAccidentalForLetter(
	keySignature: KeySignature,
	letter: string
): '' | '#' | 'b' {
	const normalizedLetter = letter.toLowerCase();
	const sharpLetters = new Set(
		keySignature.sharps
			.map((note) => note.replace('♭', 'b').replace('♯', '#').toLowerCase())
			.filter((note) => note.endsWith('#'))
			.map((note) => note[0])
	);
	if (sharpLetters.has(normalizedLetter)) return '#';

	const flatLetters = new Set(
		keySignature.flats
			.map((note) => note.replace('♭', 'b').replace('♯', '#').toLowerCase())
			.filter((note) => note.endsWith('b'))
			.map((note) => note[0])
	);
	if (flatLetters.has(normalizedLetter)) return 'b';

	return '';
}

export function applyKeySignatureToNaturalNote(keySignature: KeySignature, note: string): string {
	const match = /^([a-gA-G])([#b]?)\/(\d+)$/.exec(note);
	if (!match) return note;

	const [, letter, accidental, octave] = match;
	if (accidental) return note;

	const signatureAccidental = getKeySignatureAccidentalForLetter(keySignature, letter);
	if (!signatureAccidental) return note;

	return `${letter.toLowerCase()}${signatureAccidental}/${octave}`;
}

export function getBottomStaffLinePitch({
	clef,
	keySignature,
	availablePitches
}: {
	clef: Clef;
	keySignature: KeySignature;
	availablePitches: string[];
}): string {
	const naturalBottomLineNote = BOTTOM_STAFF_LINE_NOTE_BY_CLEF[clef] ?? 'e/4';
	const keyAdjustedBottomLineNote = applyKeySignatureToNaturalNote(
		keySignature,
		naturalBottomLineNote
	);

	if (availablePitches.includes(keyAdjustedBottomLineNote)) {
		return keyAdjustedBottomLineNote;
	}

	if (availablePitches.includes(naturalBottomLineNote)) {
		return naturalBottomLineNote;
	}

	const bottomLineMatch = /^([a-g])(?:[#b])?\/(\d+)$/.exec(naturalBottomLineNote);
	if (bottomLineMatch) {
		const [, letter, octave] = bottomLineMatch;
		const sameLineCandidates = availablePitches.filter((pitch) => {
			const candidateMatch = /^([a-g])([#b]?)\/(\d+)$/.exec(pitch);
			return candidateMatch ? candidateMatch[1] === letter && candidateMatch[3] === octave : false;
		});

		const preferredAccidental = keySignature.preferredAccidental === 'sharp' ? '#' : 'b';
		const preferredCandidate = sameLineCandidates.find((candidate) =>
			candidate.includes(preferredAccidental)
		);
		if (preferredCandidate) {
			return preferredCandidate;
		}

		if (sameLineCandidates.length > 0) {
			return sameLineCandidates[0];
		}
	}

	return availablePitches[0] ?? naturalBottomLineNote;
}

export function getRemainingInBarAtFlatIndex(
	melody: MelodyItem[][],
	barLength: number,
	flatIndex: number
): number {
	if (flatIndex < 0) return barLength;
	let cursor = 0;

	for (const bar of melody) {
		for (let i = 0; i < bar.length; i++) {
			if (cursor === flatIndex) {
				const startOffset = bar.slice(0, i).reduce((sum, item) => sum + item.length, 0);
				return barLength - startOffset;
			}
			cursor += 1;
		}
	}

	return barLength;
}

export function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tagName = target.tagName;
	return (
		target.isContentEditable ||
		tagName === 'INPUT' ||
		tagName === 'TEXTAREA' ||
		tagName === 'SELECT'
	);
}

export function chunkRestLength(totalLength: number): MelodyItem[] {
	const chunks: MelodyItem[] = [];
	let remaining = Math.max(0, Math.floor(totalLength));

	while (remaining > 0) {
		const chunkLength = REST_CHUNK_LENGTHS.find((length) => length <= remaining) ?? 1;
		chunks.push({ note: null, length: chunkLength });
		remaining -= chunkLength;
	}

	return chunks;
}

export function tidyRestsInBar(bar: MelodyItem[]): MelodyItem[] {
	const tidied: MelodyItem[] = [];
	let pendingRestLength = 0;

	for (const item of bar) {
		if (item.note === null) {
			pendingRestLength += item.length;
			continue;
		}

		if (pendingRestLength > 0) {
			tidied.push(...chunkRestLength(pendingRestLength));
			pendingRestLength = 0;
		}

		tidied.push({ ...item });
	}

	if (pendingRestLength > 0) {
		tidied.push(...chunkRestLength(pendingRestLength));
	}

	return tidied;
}

export function getSequenceOffsetAtIndex(items: MelodyItem[], index: number): number {
	if (index <= 0) return 0;
	return items.slice(0, index).reduce((sum, item) => sum + item.length, 0);
}

export function getIndexAtSequenceOffset(items: MelodyItem[], offset: number): number {
	if (items.length === 0) return -1;
	if (offset <= 0) return 0;

	let cursor = 0;
	for (let index = 0; index < items.length; index++) {
		const itemLength = items[index]?.length ?? 0;
		if (offset < cursor + itemLength) {
			return index;
		}
		cursor += itemLength;
	}

	return items.length - 1;
}
