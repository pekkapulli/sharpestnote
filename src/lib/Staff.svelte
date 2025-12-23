<script lang="ts">
	import type { Clef } from '$lib/config/types';
	import { staffLayouts } from '$lib/config/staffs';
	import type { KeySignature, Mode } from '$lib/config/keys';
	import { renderNote } from './noteRenderer';
	import ClefSymbol from './ClefSymbol.svelte';
	import NoteSymbol from './NoteSymbol.svelte';
	import GhostNote from './GhostNote.svelte';
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
		heldSixteenths?: number | null;
		isCurrentNoteHit?: boolean;
		isSequenceComplete?: boolean;
	}

	const {
		sequence = [],
		currentIndex = 0,
		heldSixteenths = null,
		ghostNote = null,
		cents = null,
		height = 150,
		clef = 'treble',
		keySignature,
		isCurrentNoteHit = false,
		isSequenceComplete = false
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
	const isHit = $derived(isCurrentNoteHit || isSequenceComplete);

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
				<!-- Space notes by their lengths, works for single or multiple notes -->
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
								fill={i < currentIndex || (isSequenceComplete && i === currentIndex)
									? '#16a34a'
									: i === currentIndex
										? isHit
											? '#16a34a'
											: 'black'
										: '#9ca3af'}
								stroke={i < currentIndex || (isSequenceComplete && i === currentIndex)
									? '#22c55e'
									: 'none'}
								strokeWidth={i < currentIndex || (isSequenceComplete && i === currentIndex) ? 2 : 0}
								{lineSpacing}
								heldSixteenths={i === currentIndex && !isSequenceComplete && isHit
									? heldSixteenths
									: null}
							/>
						{/if}
					{/each}
				{/key}

				<!-- Ghost note aligned to current note's x -->
				{#if ghostNotePosition !== null && notes[currentIndex] !== undefined && currentGhostX !== null}
					<GhostNote
						x={currentGhostX}
						y={centerY - ghostNotePosition * lineSpacing}
						accidental={ghostAccidental}
						fill={isHit ? 'none' : '#6b7280'}
						opacity={1}
						strokeWidth={0}
						{cents}
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
