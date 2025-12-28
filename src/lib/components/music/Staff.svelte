<script lang="ts">
	import type { Clef } from '$lib/config/types';
	import { staffLayouts } from '$lib/config/staffs';
	import type { KeySignature, Mode } from '$lib/config/keys';
	import { renderNote } from '$lib/components/music/noteRenderer';
	import ClefSymbol from './ClefSymbol.svelte';
	import NoteSymbol from './NoteSymbol.svelte';
	import GhostNote from './GhostNote.svelte';
	import KeySignatureSymbol from './KeySignature.svelte';
	import FingerMarking from './FingerMarking.svelte';
	import { lengthRestMap, type MelodyItem } from '$lib/config/melody';

	interface Props {
		// Provide sequence as an array of { note, length }
		sequence?: MelodyItem[];
		// Index into `notes` indicating the currently active target note.
		currentIndex?: number;
		// Index of the note currently being animated (for held sixteenths display)
		animatingIndex?: number | null;
		animationProgress?: number | null;
		ghostNote?: string | null;
		cents?: number | null;
		clef?: Clef;
		keySignature: KeySignature;
		mode?: Mode;
		isCurrentNoteHit?: boolean;
		isSequenceComplete?: boolean;
		barLength?: number;
	}

	const HEIGHT = 150;

	const {
		sequence = [],
		currentIndex = 0,
		animatingIndex = null,
		animationProgress = null,
		ghostNote = null,
		cents = null,
		clef = 'treble',
		keySignature,
		isCurrentNoteHit = false,
		isSequenceComplete = false,
		barLength
	}: Props = $props();
	const layout = $derived(staffLayouts[clef] ?? staffLayouts.treble);
	const staffLines = $derived(layout.staffLines);

	const lineSpacing = $derived(HEIGHT / 12);
	const centerY = $derived(HEIGHT / 2);
	const notes = $derived(sequence.map((s) => s.note));

	const renderedNotes = $derived(
		notes.length ? notes.map((n) => renderNote(n, keySignature, clef)) : null
	);
	const ghostNoteRendered = $derived(ghostNote ? renderNote(ghostNote, keySignature, clef) : null);
	const ghostNotePosition = $derived(ghostNoteRendered?.position ?? null);
	const ghostAccidental = $derived(ghostNoteRendered?.accidental ?? null);
	const isHit = $derived(isCurrentNoteHit || isSequenceComplete);

	// Container size binding
	let containerWidth = $state(400);
	const ledgerStart = 90;
	const ledgerEnd = $derived(containerWidth - 10);

	// Horizontal layout for multi-note melodies, spaced by note lengths
	const startX = $derived(100);
	const endX = $derived(containerWidth - 30);
	const available = $derived(endX - startX);
	const basePixelsPerSixteenth = 15; // 60px per quarter note (4 sixteenths)
	const noteXs = $derived(
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
	const currentGhostX = $derived(
		noteXs && sequence && sequence.length
			? noteXs[Math.min(Math.max(currentIndex, 0), sequence.length - 1)]
			: null
	);

	// Calculate bar line positions based on barLength (in 16th notes)
	const barLineXPositions = $derived(
		barLength && noteXs
			? (() => {
					const positions: number[] = [];
					let cumulativeSixteenths = 0;

					for (let i = 0; i < sequence.length; i++) {
						const noteLengthInSixteenths = sequence[i]?.length ?? 4;
						cumulativeSixteenths += noteLengthInSixteenths;

						// If we've reached or passed a bar boundary, add a bar line position
						if (cumulativeSixteenths % barLength === 0 && i < sequence.length - 1) {
							// Bar line goes between note i and note i+1
							const x1 = (noteXs?.[i] ?? 0) + lineSpacing / 2;
							const x2 = noteXs?.[i + 1] ?? x1 + lineSpacing / 2;
							const midX = (x1 + x2) / 2;
							positions.push(midX);
						}
					}

					return positions;
				})()
			: []
	);
</script>

<div class="flex w-full max-w-md flex-col items-center gap-4" bind:clientWidth={containerWidth}>
	<div class="relative w-full" style="height: {HEIGHT}px;">
		<!-- Staff with clef symbol -->
		<svg class="absolute inset-0 h-full w-full" width={containerWidth} height={HEIGHT}>
			<!-- Clef staff lines -->
			{#each staffLines as line (line.position)}
				<line
					x1="0"
					y1={centerY - line.position * lineSpacing}
					x2={containerWidth}
					y2={centerY - line.position * lineSpacing}
					stroke="#333"
					stroke-width="1.5"
				/>
			{/each}

			<!-- Ledger lines -->
			{#each [-1, -2, -3, 5, 6] as pos}
				<line
					x1={ledgerStart}
					y1={centerY - pos * lineSpacing}
					x2={ledgerEnd}
					y2={centerY - pos * lineSpacing}
					stroke="#999"
					stroke-width="1"
					opacity="0.5"
				/>
			{/each}

			<!-- Key signature -->
			<KeySignatureSymbol {clef} {keySignature} {lineSpacing} {centerY} />

			<!-- Bar lines -->
			{#each barLineXPositions as barX}
				<line
					x1={barX}
					x2={barX}
					y1={centerY - staffLines[0].position * lineSpacing}
					y2={centerY - staffLines[staffLines.length - 1].position * lineSpacing}
					stroke="#333"
					stroke-width="1"
				/>
			{/each}

			{#if notes.length}
				<!-- Space notes by their lengths, works for single or multiple notes -->
				{#key notes.length}
					{#each notes as n, i}
						{@const x = noteXs?.[i] ?? 0}
						{@const rn = renderedNotes?.[i]}
						{#if n === null}
							<!-- Render rest symbol -->
							{@const restLength = sequence?.[i]?.length ?? 4}
							<g>
								<text
									class="note"
									{x}
									y={centerY + lineSpacing / 2}
									fill={i < currentIndex || (isSequenceComplete && i === currentIndex)
										? '#16a34a'
										: i === currentIndex
											? isHit
												? '#16a34a'
												: 'black'
											: '#9ca3af'}
									font-size={lineSpacing * 4}
									text-anchor="middle"
								>
									{lengthRestMap[restLength]}
								</text>
								{#if i === (animatingIndex ?? currentIndex) && !isSequenceComplete && isHit && animationProgress !== null}
									<!-- Rest hold duration indicator -->
									<rect
										class="note"
										x={x - lineSpacing}
										y={centerY + lineSpacing * 1.5}
										width={Math.min(
											(animationProgress / restLength) * lineSpacing * 2,
											lineSpacing * 2
										)}
										height={lineSpacing / 4}
										fill="#16a34a"
										font-size={lineSpacing * 1.5}
										text-anchor="middle"
									/>
								{/if}
							</g>
						{:else if rn}
							<NoteSymbol
								{x}
								y={centerY - (rn.position ?? 0) * lineSpacing}
								accidental={rn.accidental}
								length={sequence?.[i]?.length}
								fill={i < currentIndex ||
								(isSequenceComplete && i === currentIndex) ||
								i === animatingIndex
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
								progress={i === animatingIndex && !isSequenceComplete ? animationProgress : null}
							/>
							<!-- Finger marking under ledger lines -->
							<FingerMarking
								item={sequence[i]}
								{x}
								y={centerY - -3 * lineSpacing + lineSpacing * 1.5}
								{lineSpacing}
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
