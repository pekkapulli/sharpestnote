<script lang="ts">
	import type { Clef } from '$lib/config/types';
	import { staffLayouts } from '$lib/config/staffs';
	import type { KeySignature, Mode } from '$lib/config/keys';
	import { renderNote } from './noteRenderer';
	import ClefSymbol from './ClefSymbol.svelte';
	import NoteSymbol from './NoteSymbol.svelte';
	import KeySignatureSymbol from './KeySignature.svelte';

	interface Props {
		note?: string | null;
		// If provided, the staff will render multiple notes spaced horizontally.
		notes?: string[] | null;
		// Index into `notes` indicating the currently active target note.
		currentIndex?: number;
		ghostNote?: string | null;
		cents?: number | null;
		height?: number;
		clef?: Clef;
		keySignature: KeySignature;
		mode?: Mode;
	}

	const {
		note = null,
		notes = null,
		currentIndex = 0,
		ghostNote = null,
		cents = null,
		height = 150,
		clef = 'treble',
		keySignature
	}: Props = $props();

	const layout = $derived(staffLayouts[clef] ?? staffLayouts.treble);
	const staffLines = $derived(layout.staffLines);
	const referenceOctave = $derived(clef === 'bass' ? 2 : clef === 'alto' ? 3 : 4);

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

	const lineSpacing = $derived(height / 12);
	const centerY = $derived(height / 2);
	// Support either single note or a sequence
	const activeNote: string | null = $derived(
		notes && notes.length ? notes[Math.min(Math.max(currentIndex, 0), notes.length - 1)] : note
	);
	const renderedNotes = $derived(
		notes && notes.length ? notes.map((n) => renderNote(n, keySignature, clef)) : null
	);
	const noteRendered = $derived(activeNote ? renderNote(activeNote, keySignature, clef) : null);
	const ghostNoteRendered = $derived(ghostNote ? renderNote(ghostNote, keySignature, clef) : null);
	const notePosition = $derived(noteRendered?.position ?? null);
	const ghostNotePosition = $derived(ghostNoteRendered?.position ?? null);
	const noteAccidental = $derived(noteRendered?.accidental ?? null);
	const ghostAccidental = $derived(ghostNoteRendered?.accidental ?? null);
	const isHit = $derived(activeNote !== null && ghostNote !== null && activeNote === ghostNote);

	// Horizontal layout for multi-note melodies
	const startX = 100;
	const endX = 360;
	const slots = $derived(notes && notes.length ? Math.max(notes.length - 1, 1) : 1);
	const available = $derived(endX - startX);
	const spacing = $derived(notes && notes.length ? Math.min(60, available / slots) : 0);
	const groupWidth = $derived(notes && notes.length ? spacing * (notes.length - 1) : 0);
	const firstX = $derived(notes && notes.length ? startX + (available - groupWidth) / 2 : 0);
	const noteXs = $derived(notes && notes.length ? notes.map((_, i) => firstX + spacing * i) : null);
	const currentGhostX = $derived(
		noteXs && notes && notes.length
			? noteXs[Math.min(Math.max(currentIndex, 0), notes.length - 1)]
			: null
	);

	$effect(() => {
		console.log({ note, notes, ghostNote });
	});
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
					x2="380"
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
					x2="380"
					y2={centerY - pos * lineSpacing}
					stroke="#999"
					stroke-width="1"
					opacity="0.5"
				/>
			{/each}

			<!-- Key signature -->
			<KeySignatureSymbol {clef} {keySignature} {lineSpacing} {centerY} />

			{#if notes && notes.length}
				<!-- Space notes within [startX, endX] with max 60px gap, centered -->
				{#key notes.length}
					{#each notes as n, i}
						{@const x = noteXs?.[i] ?? 0}
						{@const rn = renderedNotes?.[i]}
						{#if rn}
							<NoteSymbol
								{x}
								y={centerY - (rn.position ?? 0) * lineSpacing}
								accidental={rn.accidental}
								fill={i < currentIndex ? '#16a34a' : i === currentIndex ? 'black' : '#9ca3af'}
								stroke={i < currentIndex ? '#22c55e' : 'none'}
								strokeWidth={i < currentIndex ? 2 : 0}
								{lineSpacing}
							/>
						{/if}
					{/each}
				{/key}

				<!-- Ghost note aligned to current note's x -->
				{#if ghostNotePosition !== null && notes[currentIndex] !== undefined && currentGhostX !== null}
					<NoteSymbol
						x={currentGhostX}
						y={centerY - ghostNotePosition * lineSpacing}
						accidental={ghostAccidental}
						fill={ghostNotePosition === notePosition ? '#16a34a' : '#6b7280'}
						opacity={ghostNotePosition === notePosition ? 0.8 : 0.4}
						stroke={ghostNotePosition === notePosition ? '#22c55e' : 'none'}
						strokeWidth={ghostNotePosition === notePosition ? 2 : 0}
						{lineSpacing}
					/>
				{/if}
			{:else}
				<!-- Single-note mode -->
				{#if ghostNotePosition !== null && ghostNote !== note}
					<NoteSymbol
						x={200}
						y={centerY - ghostNotePosition * lineSpacing}
						accidental={ghostAccidental}
						fill={ghostNotePosition === notePosition ? '#16a34a' : '#6b7280'}
						opacity={ghostNotePosition === notePosition ? 0.8 : 0.4}
						stroke={ghostNotePosition === notePosition ? '#22c55e' : 'none'}
						strokeWidth={ghostNotePosition === notePosition ? 2 : 0}
						{lineSpacing}
					/>
				{/if}

				{#if notePosition !== null}
					<NoteSymbol
						x={200}
						y={centerY - notePosition * lineSpacing}
						accidental={noteAccidental}
						fill={isHit ? '#16a34a' : 'black'}
						stroke={isHit ? '#22c55e' : 'none'}
						strokeWidth={isHit ? 2 : 0}
						{lineSpacing}
					/>
				{/if}
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
</div>

<style>
	:global(svg) {
		overflow: visible;
	}
</style>
