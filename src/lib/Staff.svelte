<script lang="ts">
	import type { Clef } from '$lib/config/types';
	import { staffLayouts } from '$lib/config/staffs';
	import type { KeySignature, Mode } from '$lib/config/keys';
	import { renderNote } from './noteRenderer';
	import ClefSymbol from './ClefSymbol.svelte';
	import NoteSymbol from './NoteSymbol.svelte';
	import KeySignatureSymbol from './KeySignature.svelte';
	import type { NoteLength } from './config/rhythm';

	type SequenceItem = { note: string; length?: NoteLength };

	interface Props {
		// Provide sequence as an array of { note, length }
		sequence?: SequenceItem[];
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
		sequence = [],
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
	const notes = $derived(sequence.map((s) => s.note));
	const activeNote: string | null = $derived(
		notes.length ? notes[Math.min(Math.max(currentIndex, 0), notes.length - 1)] : null
	);
	const renderedNotes = $derived(
		notes.length ? notes.map((n) => renderNote(n, keySignature, clef)) : null
	);
	const noteRendered = $derived(activeNote ? renderNote(activeNote, keySignature, clef) : null);
	const ghostNoteRendered = $derived(ghostNote ? renderNote(ghostNote, keySignature, clef) : null);
	const notePosition = $derived(noteRendered?.position ?? null);
	const ghostNotePosition = $derived(ghostNoteRendered?.position ?? null);
	const noteAccidental = $derived(noteRendered?.accidental ?? null);
	const ghostAccidental = $derived(ghostNoteRendered?.accidental ?? null);
	const isHit = $derived(activeNote !== null && ghostNote !== null && activeNote === ghostNote);

	// Horizontal layout for multi-note melodies, spaced by note lengths
	const startX = 100;
	const endX = 360;
	const available = $derived(endX - startX);
	const basePixelsPerSixteenth = 15; // 60px per quarter note (4 sixteenths)
	const lengthBasedSpacing = $derived(
		sequence && sequence.length
			? (() => {
					const positions = [0]; // first note at 0
					let cumulativeX = 0;
					for (let i = 1; i < sequence.length; i++) {
						const prevLength = sequence[i - 1]?.length ?? 4;
						cumulativeX += prevLength * basePixelsPerSixteenth;
						positions.push(cumulativeX);
					}
					const totalWidth = cumulativeX;
					const scale = totalWidth > available ? available / totalWidth : 1;
					const scaledPositions = positions.map((p) => p * scale);
					const groupWidth = scaledPositions[scaledPositions.length - 1] ?? 0;
					const centerOffset = startX + (available - groupWidth) / 2;
					return scaledPositions.map((p) => centerOffset + p);
				})()
			: null
	);
	const noteXs = $derived(lengthBasedSpacing);
	const currentGhostX = $derived(
		lengthBasedSpacing && sequence && sequence.length
			? lengthBasedSpacing[Math.min(Math.max(currentIndex, 0), sequence.length - 1)]
			: null
	);
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

			{#if notes.length}
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
								length={sequence?.[i]?.length}
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
				{#if ghostNotePosition !== null && ghostNote !== activeNote}
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
