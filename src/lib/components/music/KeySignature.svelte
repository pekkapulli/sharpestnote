<script lang="ts">
	import type { Clef } from '$lib/config/types';
	import type { KeySignature } from '$lib/config/keys';
	import { renderNote } from '$lib/noteRenderer';

	interface Props {
		clef?: Clef;
		keySignature: KeySignature;
		lineSpacing: number;
		centerY: number;
		xStart?: number;
		xStep?: number;
	}

	const {
		clef = 'treble',
		keySignature,
		lineSpacing,
		centerY,
		xStart = 60,
		xStep = 12
	}: Props = $props();

	const accidentals = $derived(
		(() => {
			const keySignatureNotes: Record<Clef, { sharps: string[]; flats: string[] }> = {
				treble: {
					sharps: ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4'],
					flats: ['B4', 'E5', 'A4', 'D5', 'G4', 'C5', 'F4']
				},
				alto: {
					sharps: ['F4', 'C4', 'G4', 'D4', 'A3', 'E4', 'B3'],
					flats: ['B3', 'E4', 'A3', 'D4', 'G3', 'C4', 'F3']
				},
				bass: {
					sharps: ['B2', 'F3', 'C4', 'G3', 'D4', 'A3', 'E4'],
					flats: ['B2', 'E4', 'A3', 'D4', 'G3', 'C4', 'F3']
				}
			};

			const placements = keySignatureNotes[clef] ?? keySignatureNotes.treble;
			const sharps = (keySignature.sharps ?? []).map((sharp, idx) => {
				const anchor = placements.sharps[idx] ?? placements.sharps[placements.sharps.length - 1];
				const rendered = renderNote(anchor, keySignature, clef);
				return {
					note: sharp,
					symbol: '♯',
					yPos: rendered?.position ?? 0,
					xPos: xStart + idx * xStep
				};
			});
			const flats = (keySignature.flats ?? []).map((flat, idx) => {
				const anchor = placements.flats[idx] ?? placements.flats[placements.flats.length - 1];
				const rendered = renderNote(anchor, keySignature, clef);
				return {
					note: flat,
					symbol: '♭',
					yPos: rendered?.position ?? 0,
					xPos: xStart + idx * xStep
				};
			});
			return [...sharps, ...flats];
		})()
	);
</script>

{#each accidentals as accidental (accidental.note)}
	<text
		x={accidental.xPos}
		y={centerY - accidental.yPos * lineSpacing + lineSpacing * 0.3}
		font-size={lineSpacing * 3}
		fill="#333"
		class="note"
		text-anchor="middle"
	>
		{accidental.symbol}
	</text>
{/each}
