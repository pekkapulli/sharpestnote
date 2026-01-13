const NOTES_SHARP_VEXFLOW = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
const NOTES_FLAT_VEXFLOW = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b'];

// Human-readable note names for display only
const NOTES_SHARP_DISPLAY = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT_DISPLAY = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const DEFAULT_A4 = 442;

export type Accidental = 'sharp' | 'flat';

export function noteFromPitch(frequency: number, a4: number = DEFAULT_A4): number {
	const noteNum = 12 * (Math.log(frequency / a4) / Math.log(2));
	return Math.round(noteNum) + 69;
}

export function frequencyFromNoteNumber(note: number, a4: number = DEFAULT_A4): number {
	return a4 * Math.pow(2, (note - 69) / 12);
}

/**
 * Convert MIDI note number to VexFlow notation (e.g., "c#/4")
 * VexFlow uses lowercase letters and slash notation for octave
 */
export function noteNameFromMidi(midi: number, accidental: Accidental = 'sharp'): string {
	const octave = Math.floor(midi / 12) - 1;
	const names = accidental === 'flat' ? NOTES_FLAT_VEXFLOW : NOTES_SHARP_VEXFLOW;
	const name = names[((midi % 12) + 12) % 12];
	return `${name}/${octave}`;
}

/**
 * Convert MIDI note number to human-readable notation (e.g., "C#4")
 * Use this only for UI display, not for internal processing
 */
export function noteNameFromMidiDisplay(midi: number, accidental: Accidental = 'sharp'): string {
	const octave = Math.floor(midi / 12) - 1;
	const names = accidental === 'flat' ? NOTES_FLAT_DISPLAY : NOTES_SHARP_DISPLAY;
	const name = names[((midi % 12) + 12) % 12];
	return `${name}${octave}`;
}

export function centsOff(frequency: number, target: number): number {
	return Math.round(1200 * Math.log2(frequency / target));
}

export function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
	let size = buffer.length;
	let rms = 0;

	for (let i = 0; i < size; i += 1) {
		const val = buffer[i];
		rms += val * val;
	}
	rms = Math.sqrt(rms / size);

	if (rms < 0.01) return -1;

	let r1 = 0;
	let r2 = size - 1;
	const thres = 0.2;

	for (let i = 0; i < size / 2; i += 1) {
		if (Math.abs(buffer[i]) < thres) {
			r1 = i;
			break;
		}
	}

	for (let i = 1; i < size / 2; i += 1) {
		if (Math.abs(buffer[size - i]) < thres) {
			r2 = size - i;
			break;
		}
	}

	const trimmed = buffer.slice(r1, r2);
	size = trimmed.length;

	const c = new Array<number>(size).fill(0);
	for (let i = 0; i < size; i += 1) {
		for (let j = 0; j < size - i; j += 1) {
			c[i] += trimmed[j] * trimmed[j + i];
		}
	}

	let d = 0;
	while (d + 1 < c.length && c[d] > c[d + 1]) d += 1;

	let maxval = -1;
	let maxpos = -1;
	for (let i = d; i < size; i += 1) {
		if (c[i] > maxval) {
			maxval = c[i];
			maxpos = i;
		}
	}

	let t0 = maxpos;
	if (t0 > 0 && t0 + 1 < c.length) {
		const x1 = c[t0 - 1];
		const x2 = c[t0];
		const x3 = c[t0 + 1];
		const a = (x1 + x3 - 2 * x2) / 2;
		const b = (x3 - x1) / 2;
		if (a) t0 = t0 - b / (2 * a);
	}

	if (t0 === 0) return -1;
	return sampleRate / t0;
}
