import type { Piece } from '$lib/config/types';
import type { MelodyItem, NoteLength } from '$lib/config/melody';
import { noteNameToMidi } from '$lib/util/noteNames';
import { noteNameFromMidi } from '$lib/tuner/tune';

const CHUNK_LENGTHS: NoteLength[] = [16, 12, 8, 6, 4, 3, 2, 1];

type NoteChangeAction = { type: 'set-length'; length: NoteLength } | { type: 'remove' };

export function createInitialRests(barLengthSixteenths: NoteLength, bars = 4): MelodyItem[][] {
	const restsPerBar = Math.max(1, Math.floor(barLengthSixteenths / 4));
	const barTemplate: MelodyItem[] = Array.from({ length: restsPerBar }, () => ({
		note: null,
		length: 4 as NoteLength
	}));

	return Array.from({ length: bars }, () => barTemplate.map((item) => ({ ...item })));
}

export function slugifyPieceCode(label: string): string {
	const transliterated = label
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/ß/g, 'ss')
		.replace(/æ/gi, 'ae')
		.replace(/œ/gi, 'oe')
		.replace(/ø/gi, 'o')
		.replace(/å/gi, 'a')
		.replace(/ł/gi, 'l')
		.replace(/đ/gi, 'd')
		.replace(/þ/gi, 'th');

	return label
		? transliterated
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, '')
				.replace(/\s+/g, '-')
				.replace(/-+/g, '-')
				.replace(/^-+|-+$/g, '')
		: '';
}

export function getPitchPalette(
	bottom: string,
	top: string,
	accidental: 'sharp' | 'flat' = 'sharp'
): string[] {
	const bottomMidi = noteNameToMidi(bottom);
	const topMidi = noteNameToMidi(top);
	if (bottomMidi === null || topMidi === null || topMidi < bottomMidi) {
		return ['d/4'];
	}

	const result: string[] = [];
	for (let midi = bottomMidi; midi <= topMidi; midi++) {
		result.push(noteNameFromMidi(midi, accidental));
	}
	return result;
}

export function normalizeMelodyToBars(items: MelodyItem[], barSixteenths: number): MelodyItem[][] {
	if (items.length === 0) return [];
	const safeBarLength = Math.max(1, Number(barSixteenths) || 16);

	const bars: MelodyItem[][] = [];
	let currentBar: MelodyItem[] = [];
	let currentLength = 0;

	for (const item of items) {
		if (currentLength + item.length > safeBarLength && currentBar.length > 0) {
			bars.push(currentBar);
			currentBar = [];
			currentLength = 0;
		}

		currentBar.push(item);
		currentLength += item.length;

		if (currentLength === safeBarLength) {
			bars.push(currentBar);
			currentBar = [];
			currentLength = 0;
		}
	}

	if (currentBar.length > 0) {
		bars.push(currentBar);
	}

	return bars;
}

export function groupBarsToPhrases(bars: MelodyItem[][], barsPerPhrase = 2): MelodyItem[][] {
	if (bars.length === 0) return [];
	const safeBarsPerPhrase = Math.max(1, Math.floor(barsPerPhrase));
	const grouped: MelodyItem[][] = [];

	for (let i = 0; i < bars.length; i += safeBarsPerPhrase) {
		grouped.push(bars.slice(i, i + safeBarsPerPhrase).flat());
	}

	return grouped;
}

export function rearrangeNotesForTimeSignatureChange(
	bars: MelodyItem[][],
	fromBarLength: NoteLength,
	toBarLength: NoteLength
): MelodyItem[][] {
	if (bars.length === 0) return createInitialRests(toBarLength);
	if (fromBarLength === toBarLength) return bars;

	const items = bars.flat();
	const rearranged: MelodyItem[] = [];
	let barFill = 0;

	for (const item of items) {
		let remaining = item.length;

		while (remaining > 0) {
			const remainingInBar = toBarLength - barFill;
			const chunkLimit = Math.min(remaining, remainingInBar);
			const chunkLength = CHUNK_LENGTHS.find((length) => length <= chunkLimit) ?? 1;

			rearranged.push({
				...item,
				length: chunkLength
			});

			remaining -= chunkLength;
			barFill += chunkLength;

			if (barFill === toBarLength) {
				barFill = 0;
			}
		}
	}

	return normalizeMelodyToBars(rearranged, toBarLength);
}

export function getCurrentBarFill(barItems: MelodyItem[], barSixteenths: number): number {
	const safeBarLength = Math.max(1, Number(barSixteenths) || 16);
	return barItems.reduce((sum, item) => sum + item.length, 0) % safeBarLength;
}

function fitLengthToRemaining(requested: NoteLength, remaining: number): NoteLength {
	const allowed = Math.max(1, Math.min(Number(requested) || 1, Math.floor(remaining)));
	return CHUNK_LENGTHS.find((length) => length <= allowed) ?? 1;
}

function expandItemsToUnits(items: MelodyItem[]): MelodyItem[] {
	const units: MelodyItem[] = [];

	for (const item of items) {
		for (let i = 0; i < item.length; i++) {
			units.push({
				note: item.note,
				length: 1,
				finger: item.finger
			});
		}
	}

	return units;
}

function pushChunkedRun(
	target: MelodyItem[],
	note: string | null,
	finger: number | undefined,
	total: number
) {
	let remaining = total;

	while (remaining > 0) {
		const chunkLength = CHUNK_LENGTHS.find((length) => length <= remaining) ?? 1;
		target.push({ note, length: chunkLength, finger });
		remaining -= chunkLength;
	}
}

function compressUnitsToItems(units: MelodyItem[]): MelodyItem[] {
	if (units.length === 0) return [];

	const result: MelodyItem[] = [];
	let runNote = units[0].note;
	let runFinger = units[0].finger;
	let runLength = 0;

	for (const unit of units) {
		if (unit.note === runNote && unit.finger === runFinger) {
			runLength += 1;
			continue;
		}

		pushChunkedRun(result, runNote, runFinger, runLength);
		runNote = unit.note;
		runFinger = unit.finger;
		runLength = 1;
	}

	pushChunkedRun(result, runNote, runFinger, runLength);
	return result;
}

export function resolveBarAfterNoteChange(
	barItems: MelodyItem[],
	itemIndex: number,
	barSixteenths: number,
	action: NoteChangeAction
): MelodyItem[] {
	if (barItems.length === 0) return [];
	if (itemIndex < 0 || itemIndex >= barItems.length) return [...barItems];

	const safeBarLength = Math.max(1, Number(barSixteenths) || 16);
	const prefix = barItems.slice(0, itemIndex).map((item) => ({ ...item }));
	const original = barItems[itemIndex];
	const startOffset = prefix.reduce((sum, item) => sum + item.length, 0);
	const remainingInBar = Math.max(1, safeBarLength - startOffset);
	const tail = barItems.slice(itemIndex + 1).map((item) => ({ ...item }));
	const originalLength = original.length;

	const replacement =
		action.type === 'set-length'
			? [{ ...original, length: fitLengthToRemaining(action.length, remainingInBar) }]
			: [];
	const replacementLength = action.type === 'set-length' ? (replacement[0]?.length ?? 0) : 0;
	const reflowTargetLength = Math.max(0, safeBarLength - startOffset);
	const growBy =
		action.type === 'set-length' && replacementLength > originalLength
			? replacementLength - originalLength
			: 0;
	const shrinkBy =
		action.type === 'set-length' && replacementLength < originalLength
			? originalLength - replacementLength
			: 0;

	if (growBy > 0) {
		let remainingGrowth = growBy;
		const adjustedTail: MelodyItem[] = [];

		for (const item of tail) {
			if (remainingGrowth > 0 && item.note === null) {
				const consumed = Math.min(item.length, remainingGrowth);
				remainingGrowth -= consumed;
				const nextLength = item.length - consumed;

				if (nextLength > 0) {
					adjustedTail.push({ ...item, length: nextLength as NoteLength });
				}
				continue;
			}

			adjustedTail.push(item);
		}

		if (remainingGrowth === 0) {
			return [...prefix, ...replacement, ...adjustedTail];
		}
	}

	if (shrinkBy > 0) {
		const insertedRests: MelodyItem[] = [];
		pushChunkedRun(insertedRests, null, undefined, shrinkBy);
		const stableItems = [...replacement, ...insertedRests, ...tail];
		const stableLength = stableItems.reduce((sum, item) => sum + item.length, 0);

		if (stableLength === reflowTargetLength) {
			return [...prefix, ...stableItems];
		}

		if (stableLength < reflowTargetLength) {
			const paddedRests: MelodyItem[] = [];
			pushChunkedRun(paddedRests, null, undefined, reflowTargetLength - stableLength);
			return [...prefix, ...stableItems, ...paddedRests];
		}
	}

	const reflowed = [...replacement, ...tail];
	let units = expandItemsToUnits(reflowed);

	if (units.length > reflowTargetLength) {
		units = units.slice(0, reflowTargetLength);
	} else if (units.length < reflowTargetLength) {
		const restUnits = Array.from({ length: reflowTargetLength - units.length }, () => ({
			note: null,
			length: 1 as NoteLength
		}));
		units = [...units, ...restUnits];
	}

	return [...prefix, ...compressUnitsToItems(units)];
}

export function roundToEven(value: number): number {
	return Math.max(2, Math.round(value / 2) * 2);
}

export function inferPracticeTempiFromFastTempo(
	fastTempoValue: string
): Piece['practiceTempi'] | undefined {
	const fast = Number(fastTempoValue);
	if (!Number.isFinite(fast) || fast <= 0) return undefined;

	const roundedFast = roundToEven(fast);
	return {
		slow: roundToEven(roundedFast * 0.6),
		medium: roundToEven(roundedFast * 0.8),
		fast: roundedFast
	};
}

export function buildScaleFromMelody(items: MelodyItem[]): MelodyItem[] {
	const seen = new Set<string>();
	const sorted = [...items]
		.filter((item): item is MelodyItem & { note: string } => item.note !== null)
		.sort((a, b) => {
			const midiA = noteNameToMidi(a.note) ?? -Infinity;
			const midiB = noteNameToMidi(b.note) ?? -Infinity;
			return midiA - midiB;
		});

	const scale: MelodyItem[] = [];
	for (const item of sorted) {
		if (seen.has(item.note)) continue;
		seen.add(item.note);
		scale.push({
			note: item.note,
			length: 4,
			finger: item.finger
		});
	}

	return scale;
}
