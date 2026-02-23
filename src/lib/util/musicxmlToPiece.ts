import type { Mode, NoteName } from '$lib/config/keys';
import type { MelodyItem, NoteLength } from '$lib/config/melody';

const NOTE_LENGTHS_DESC: NoteLength[] = [16, 12, 8, 6, 4, 3, 2, 1];

const MAJOR_KEYS_BY_FIFTHS: Record<number, NoteName> = {
	0: 'C',
	1: 'G',
	2: 'D',
	3: 'A',
	4: 'E',
	5: 'B',
	6: 'F#',
	7: 'C#',
	[-1]: 'F',
	[-2]: 'A#',
	[-3]: 'D#',
	[-4]: 'G#',
	[-5]: 'C#',
	[-6]: 'F#',
	[-7]: 'B'
};

const MINOR_KEYS_BY_FIFTHS: Record<number, NoteName> = {
	0: 'A',
	1: 'E',
	2: 'B',
	3: 'F#',
	4: 'C#',
	5: 'G#',
	6: 'D#',
	7: 'A#',
	[-1]: 'D',
	[-2]: 'G',
	[-3]: 'C',
	[-4]: 'F',
	[-5]: 'A#',
	[-6]: 'D#',
	[-7]: 'G#'
};

export type MusicXmlParseResult = {
	title: string | null;
	composer: string | null;
	arranger: string | null;
	key: NoteName;
	mode: Mode;
	barLength: number;
	tempo: number | null;
	melody: MelodyItem[][];
	scale: MelodyItem[];
	warnings: string[];
};

export function parseMusicXmlToMelody(xmlText: string): MusicXmlParseResult {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xmlText, 'application/xml');
	const parseError = doc.querySelector('parsererror');
	if (parseError) {
		throw new Error('Unable to parse MusicXML.');
	}

	const warnings: string[] = [];

	const title =
		doc.querySelector('movement-title')?.textContent?.trim() ??
		doc.querySelector('work-title')?.textContent?.trim() ??
		null;

	let composer: string | null = null;
	let arranger: string | null = null;
	const creators = Array.from(doc.querySelectorAll('identification creator'));
	for (const creator of creators) {
		const type = creator.getAttribute('type');
		const value = creator.textContent?.trim() ?? '';
		if (!value) continue;
		if (type === 'composer' && !composer) composer = value;
		if (type === 'arranger' && !arranger) arranger = value;
	}

	const part = doc.querySelector('part');
	if (!part) {
		throw new Error('No <part> found in MusicXML.');
	}

	const measures = Array.from(part.querySelectorAll('measure'));
	if (measures.length === 0) {
		throw new Error('No <measure> entries found in MusicXML.');
	}

	let divisions = 1;
	let timeBeats = 4;
	let timeBeatType = 4;

	let inferredKey: NoteName = 'C';
	let inferredMode: Mode = 'major';
	let inferredTempo: number | null = null;

	const melody: MelodyItem[][] = [];

	// Try to extract tempo from the first sound element with a tempo attribute
	const soundElements = Array.from(doc.querySelectorAll('sound[tempo]'));
	if (soundElements.length > 0) {
		const tempoValue = Number(soundElements[0].getAttribute('tempo'));
		if (Number.isFinite(tempoValue) && tempoValue > 0) {
			inferredTempo = Math.round(tempoValue);
		}
	}

	for (const measure of measures) {
		const attributes = measure.querySelector('attributes');
		if (attributes) {
			const divisionsNode = attributes.querySelector('divisions');
			const divisionsValue = divisionsNode ? Number(divisionsNode.textContent) : NaN;
			if (Number.isFinite(divisionsValue) && divisionsValue > 0) {
				divisions = divisionsValue;
			}

			const timeNode = attributes.querySelector('time');
			if (timeNode) {
				const beatsValue = Number(timeNode.querySelector('beats')?.textContent);
				const beatTypeValue = Number(timeNode.querySelector('beat-type')?.textContent);
				if (Number.isFinite(beatsValue) && Number.isFinite(beatTypeValue)) {
					timeBeats = beatsValue;
					timeBeatType = beatTypeValue;
				}
			}

			const keyNode = attributes.querySelector('key');
			if (keyNode) {
				const fifths = Number(keyNode.querySelector('fifths')?.textContent ?? '0');
				const modeRaw = keyNode.querySelector('mode')?.textContent?.trim();
				const mode = modeRaw === 'minor' ? 'natural_minor' : 'major';
				const keyLookup = mode === 'major' ? MAJOR_KEYS_BY_FIFTHS : MINOR_KEYS_BY_FIFTHS;
				if (Number.isFinite(fifths) && keyLookup[fifths]) {
					inferredKey = keyLookup[fifths];
					inferredMode = mode;
				}
			}
		}

		const measureItems: MelodyItem[] = [];
		const notes = Array.from(measure.querySelectorAll('note'));
		for (const note of notes) {
			if (note.querySelector('grace')) continue;

			const durationValue = Number(note.querySelector('duration')?.textContent ?? '0');
			if (!Number.isFinite(durationValue) || durationValue <= 0) {
				continue;
			}

			const lengthSixteenths = (durationValue * 4) / divisions;
			const length = Math.round(lengthSixteenths);
			if (!Number.isFinite(length) || length <= 0) {
				warnings.push('Skipped a note with invalid duration.');
				continue;
			}

			const isRest = note.querySelector('rest') !== null;
			const pitchNote = isRest ? null : parsePitch(note, warnings);

			// Extract slur information
			const notations = note.querySelector('notations');
			const slurs = notations ? Array.from(notations.querySelectorAll('slur')) : [];
			let slurStart = false;
			let slurEnd = false;
			for (const slur of slurs) {
				const type = slur.getAttribute('type');
				if (type === 'start') slurStart = true;
				else if (type === 'stop') slurEnd = true;
			}

			// Extract beam information (beam number="1" for primary beam)
			const beams = Array.from(note.querySelectorAll('beam[number="1"]'));
			let beamStart = false;
			let beamEnd = false;
			for (const beam of beams) {
				const beamType = beam.textContent?.trim();
				if (beamType === 'begin') beamStart = true;
				else if (beamType === 'end') beamEnd = true;
			}

			const tieTypes = Array.from(note.querySelectorAll('tie'))
				.map((tie) => tie.getAttribute('type'))
				.filter((type): type is string => Boolean(type));
			const isTieStop = tieTypes.includes('stop') || tieTypes.includes('continue');

			if (isTieStop && measureItems.length > 0) {
				const last = measureItems.pop();
				if (last && last.note === pitchNote) {
					pushSplitNotes(
						measureItems,
						pitchNote,
						last.length + length,
						slurStart,
						slurEnd,
						beamStart,
						beamEnd
					);
					continue;
				}
				if (last) measureItems.push(last);
			}

			pushSplitNotes(measureItems, pitchNote, length, slurStart, slurEnd, beamStart, beamEnd);
		}

		melody.push(measureItems);
	}

	const barLength = Math.round(timeBeats * (16 / timeBeatType));
	if (!Number.isFinite(barLength) || barLength <= 0) {
		warnings.push('Time signature missing; defaulted bar length to 16.');
	}

	// Trim empty bars from beginning and end
	const trimmedBars = trimEmptySections(melody);

	// Group bars into two-bar sections for practice
	const groupedMelody: MelodyItem[][] = [];
	const barsPerSection = 2;
	for (let i = 0; i < trimmedBars.length; i += barsPerSection) {
		const section = trimmedBars.slice(i, i + barsPerSection).flat();
		groupedMelody.push(section);
	}

	const scale = buildScale(melody);

	return {
		title,
		composer,
		arranger,
		key: inferredKey,
		mode: inferredMode,
		tempo: inferredTempo,
		barLength: Number.isFinite(barLength) && barLength > 0 ? barLength : 16,
		melody: groupedMelody,
		scale,
		warnings
	};
}

/**
 * Check if a melody section contains only rests (null notes)
 */
function isEmptySection(section: MelodyItem[]): boolean {
	return section.length === 0 || section.every((item) => item.note === null);
}

/**
 * Trim empty sections from the beginning and end of the melody
 */
function trimEmptySections(melody: MelodyItem[][]): MelodyItem[][] {
	if (melody.length === 0) return melody;

	// Find first non-empty section
	let start = 0;
	while (start < melody.length && isEmptySection(melody[start])) {
		start++;
	}

	// Find last non-empty section
	let end = melody.length - 1;
	while (end >= start && isEmptySection(melody[end])) {
		end--;
	}

	// Return trimmed melody
	return melody.slice(start, end + 1);
}

function parsePitch(note: Element, warnings: string[]): string | null {
	const step = note.querySelector('pitch > step')?.textContent?.trim();
	const octave = note.querySelector('pitch > octave')?.textContent?.trim();
	if (!step || !octave) {
		warnings.push('Skipped a note with missing pitch data.');
		return null;
	}

	const alterValue = Number(note.querySelector('pitch > alter')?.textContent ?? '0');
	const accidental =
		Number.isFinite(alterValue) && alterValue !== 0 ? alterToAccidental(alterValue) : '';

	return `${step.toLowerCase()}${accidental}/${octave}`;
}

function alterToAccidental(alter: number): string {
	if (alter > 0) return '#'.repeat(Math.min(alter, 2));
	if (alter < 0) return 'b'.repeat(Math.min(Math.abs(alter), 2));
	return '';
}

function pushSplitNotes(
	target: MelodyItem[],
	note: string | null,
	length: number,
	slurStart = false,
	slurEnd = false,
	beamStart = false,
	beamEnd = false
): void {
	let remaining = length;
	const noteItems: MelodyItem[] = [];
	for (const step of NOTE_LENGTHS_DESC) {
		while (remaining >= step) {
			noteItems.push({ note, length: step });
			remaining -= step;
		}
	}
	if (remaining > 0) {
		// If the remainder is small, append it to the last item as a fallback.
		const last = noteItems[noteItems.length - 1];
		if (last) {
			last.length = (last.length + remaining) as NoteLength;
		}
	}

	// Apply slur markers to first and last note
	if (noteItems.length > 0) {
		if (slurStart) noteItems[0].slurStart = true;
		if (slurEnd) noteItems[noteItems.length - 1].slurEnd = true;
		if (beamStart) noteItems[0].beamStart = true;
		if (beamEnd) noteItems[noteItems.length - 1].beamEnd = true;
	}

	target.push(...noteItems);
}

function buildScale(melody: MelodyItem[][]): MelodyItem[] {
	const seen = new Set<string>();
	const scale: MelodyItem[] = [];
	for (const bar of melody) {
		for (const item of bar) {
			if (!item.note) continue;
			if (seen.has(item.note)) continue;
			seen.add(item.note);
			scale.push({ note: item.note, length: 4 });
		}
	}
	return scale;
}
