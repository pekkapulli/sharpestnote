<script lang="ts">
	import type { Accidental } from '$lib';
	import type { Clef } from '$lib/config/types';
	import { staffLayouts } from '$lib/config/staffs';
	import ClefSymbol from './ClefSymbol.svelte';

	interface Props {
		note?: string | null;
		ghostNote?: string | null;
		cents?: number | null;
		accidental?: Accidental;
		height?: number;
		clef?: Clef;
	}

	const {
		note = null,
		ghostNote = null,
		accidental = 'sharp',
		height = 150,
		clef = 'treble'
	}: Props = $props();

	const layout = $derived(staffLayouts[clef] ?? staffLayouts.treble);
	const staffLines = $derived(layout.staffLines);
	const referenceOctave = $derived(clef === 'bass' ? 2 : clef === 'alto' ? 3 : 4);

	// Calculate Y position on staff (handles accidentals and octaves)
	function getNotePosition(noteName: string): number | null {
		const match = /^([A-G])([#b]?)(\d)$/.exec(noteName);
		if (!match) return null;

		const [, letter, accidentalSign, octaveStr] = match;
		const base = layout.basePositions[letter];
		const octave = Number(octaveStr);
		const accidentalOffset = accidentalSign === '#' ? 0.5 : accidentalSign === 'b' ? -0.5 : 0;
		const octaveOffset = (octave - referenceOctave) * 3.5; // each octave shifts 7 staff steps (3.5 lines)

		return base + octaveOffset + accidentalOffset;
	}

	// Get natural note position without accidental offset (for rendering accidental symbol)
	function getNaturalNotePosition(noteName: string): number | null {
		const match = /^([A-G])([#b]?)(\d)$/.exec(noteName);
		if (!match) return null;

		const [, letter, , octaveStr] = match;
		const base = layout.basePositions[letter];
		const octave = Number(octaveStr);
		const octaveOffset = (octave - referenceOctave) * 3.5;

		return base + octaveOffset;
	}
	// Calculate scaling based on height
	// Total vertical span: 6 units above + 6 units below = 12 units
	// With some padding, we fit everything in height
	const lineSpacing = $derived(height / 12);
	const centerY = $derived(height / 2);
	const notePosition = $derived(note ? getNotePosition(note) : null);
	const ghostNotePosition = $derived(ghostNote ? getNotePosition(ghostNote) : null);
	const ghostNaturalPosition = $derived(ghostNote ? getNaturalNotePosition(ghostNote) : null);
	const ghostHasAccidental = $derived(ghostNote ? getAccidental(ghostNote) !== '' : false);
	const isHit = $derived(
		notePosition !== null && ghostNotePosition !== null && notePosition === ghostNotePosition
	);
	const displayNote = $derived(note || 'Rest');

	// Extract accidental from note name
	function getAccidental(noteName: string): string {
		const match = /^[A-G](#|b)?/.exec(noteName);
		if (!match) return '';
		return match[1] || '';
	}
</script>

<div class="flex flex-col items-center gap-4">
	<div class="relative w-full max-w-md" style="height: {height}px; aspect-ratio: 16/6">
		<!-- Staff with clef symbol -->
		<svg class="absolute inset-0 h-full w-full" viewBox="0 0 400 {height}">
			<!-- Clef staff lines -->
			{#each staffLines as line (line.position)}
				<line
					x1="0"
					y1={centerY - line.position * lineSpacing}
					x2="400"
					y2={centerY - line.position * lineSpacing}
					stroke="#333"
					stroke-width="1.5"
				/>
			{/each}

			<!-- Ledger lines above (C6, etc.) -->
			{#each [5, 6] as pos}
				<line
					x1="80"
					y1={centerY - pos * lineSpacing}
					x2="320"
					y2={centerY - pos * lineSpacing}
					stroke="#999"
					stroke-width="1"
					opacity="0.5"
				/>
			{/each}

			<!-- Ledger lines below (C4, etc.) -->
			{#each [-1, -2, -3] as pos}
				<line
					x1="80"
					y1={centerY - pos * lineSpacing}
					x2="320"
					y2={centerY - pos * lineSpacing}
					stroke="#999"
					stroke-width="1"
					opacity="0.5"
				/>
			{/each}

			<!-- Ghost note (detected note) -->
			{#if ghostNotePosition !== null && ghostNotePosition !== notePosition}
				<g>
					<circle
						cx="200"
						cy={centerY -
							((ghostHasAccidental
								? (ghostNaturalPosition ?? ghostNotePosition)
								: ghostNotePosition) as number) *
								lineSpacing}
						r="8"
						fill="#6b7280"
						opacity="0.4"
					/>
					{#if getAccidental(ghostNote || '')}
						<text
							x="215"
							y={centerY -
								(getNaturalNotePosition(ghostNote || '') ?? ghostNotePosition) * lineSpacing +
								4}
							font-size={lineSpacing * 2}
							fill="#6b7280"
							opacity="0.4"
							class="note"
						>
							{getAccidental(ghostNote || '') === '#' ? '♯' : '♭'}
						</text>
					{/if}
				</g>
			{/if}

			<!-- Target note head -->
			{#if notePosition !== null}
				<circle
					cx="200"
					cy={centerY - notePosition * lineSpacing}
					r="8"
					fill={isHit ? '#16a34a' : 'black'}
					stroke={isHit ? '#22c55e' : 'none'}
					stroke-width={isHit ? '2' : '0'}
				/>
			{/if}
		</svg>

		<!-- Clef symbol overlay -->
		<div
			class="absolute left-2 flex items-center justify-center overflow-visible"
			style="width: {lineSpacing * 2}px; height: 0; top: {centerY - lineSpacing * 2}px;"
		>
			<ClefSymbol {clef} size="{lineSpacing * 4}px" />
		</div>
	</div>

	<!-- Note label -->
	{#if note}
		<div class="rounded-lg bg-dark-blue px-6 py-3 text-center">
			<p class="text-sm tracking-[0.08em] text-slate-300 uppercase">Current note</p>
			<p class="mt-1 text-3xl font-bold text-white">{note}</p>
		</div>
	{:else}
		<div class="rounded-lg bg-slate-200 px-6 py-3 text-center">
			<p class="text-sm tracking-[0.08em] text-slate-600 uppercase">Waiting for note...</p>
		</div>
	{/if}
</div>

<style>
	:global(svg) {
		overflow: visible;
	}
</style>
