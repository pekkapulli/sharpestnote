/**
 * Convert VexFlow notation to human-readable display notation
 * e.g., "c#/4" -> "C#4"
 */
export function vexFlowToDisplay(vexNote: string | null): string {
	if (!vexNote) return '';
	const match = vexNote.match(/^([a-g])([#b]?)\/(\.?\d+)$/);
	if (!match) return vexNote; // Return as-is if format doesn't match

	const [, letter, accidental, octave] = match;
	return `${letter.toUpperCase()}${accidental}${octave}`;
}
