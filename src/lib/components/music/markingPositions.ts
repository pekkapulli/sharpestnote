import type { MelodyItem } from '$lib/config/melody';

interface FingerMarkingYInput {
	topLineY: number;
	lineSpacing: number;
	noteY?: number;
	notes: MelodyItem[];
	noteIndex: number;
	baseOffsetMultiplier?: number;
	pitchLiftFromMiddleFactor?: number;
	slurLiftMultiplier?: number;
}

interface TextAnnotationYInput {
	topLineY: number;
	lineSpacing: number;
	baseOffsetMultiplier?: number;
}

export function isNoteUnderSlur(notes: MelodyItem[], noteIndex: number): boolean {
	let slurActive = false;

	for (let i = 0; i <= noteIndex; i++) {
		if (notes[i]?.slurStart) {
			slurActive = true;
		}

		if (i === noteIndex) {
			return slurActive;
		}

		if (notes[i]?.slurEnd) {
			slurActive = false;
		}
	}

	return false;
}

export function getFingerMarkingY({
	topLineY,
	lineSpacing,
	noteY,
	notes,
	noteIndex,
	baseOffsetMultiplier = 1.5,
	pitchLiftFromMiddleFactor = 0.6,
	slurLiftMultiplier = 1.2
}: FingerMarkingYInput): number {
	const baseY = topLineY - lineSpacing * baseOffsetMultiplier;
	const middleLineY = topLineY + lineSpacing * 2;
	const aboveMiddle = noteY !== undefined ? Math.max(0, middleLineY - noteY) : 0;
	const pitchLift = aboveMiddle * pitchLiftFromMiddleFactor;
	const slurLift = isNoteUnderSlur(notes, noteIndex) ? lineSpacing * slurLiftMultiplier : 0;

	return baseY - pitchLift - slurLift;
}

export function getTextAnnotationY({
	topLineY,
	lineSpacing,
	baseOffsetMultiplier = 7.5
}: TextAnnotationYInput): number {
	return topLineY + lineSpacing * baseOffsetMultiplier;
}
