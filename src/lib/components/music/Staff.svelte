<script lang="ts">
	import type { Clef } from '$lib/config/types';
	import type { KeySignature, Mode } from '$lib/config/keys';
	import { renderNote } from '$lib/components/music/noteRenderer';
	import GhostNote from './GhostNote.svelte';
	import FingerMarking from './FingerMarking.svelte';
	import { type MelodyItem } from '$lib/config/melody';
	import { noteNameToMidi } from '$lib/util/noteNames';
	import { renderVexFlowStaff, getNoteYPosition } from './vexflowHelper';

	interface Props {
		// Provide bars as an array of melody bars, where each bar is an array of { note, length }
		bars?: MelodyItem[][];
		// Index into the flattened notes indicating the currently active target note.
		currentIndex?: number;
		// Index of the note currently being animated (for held sixteenths display)
		animatingIndex?: number | null;
		animationProgress?: number | null;
		playheadPosition?: number | null; // Position in sixteenths for playback animation
		ghostNote?: string | null;
		cents?: number | null;
		clef?: Clef;
		keySignature: KeySignature;
		mode?: Mode;
		isCurrentNoteHit?: boolean;
		isSequenceComplete?: boolean;
		barLength?: number;
		minWidth?: number; // Minimum width in pixels. If not set, will use content width
		firstNoteX?: number; // Bindable prop to expose the first note's X position
		lastNoteX?: number; // Bindable prop to expose the last note's X position
		noteXPositions?: number[]; // Bindable prop to expose all note X positions
		showAllBlack?: boolean; // If true, render all notes in black instead of colored by state
		showTimeSignature?: boolean; // If false, hide the time signature (default: true)
		greatIntonationIndices?: number[]; // Array of indices of notes with great intonation (for star display)
	}

	const HEIGHT = 150;

	let {
		bars = [],
		currentIndex = 0,
		animatingIndex = null,
		playheadPosition = null,
		ghostNote = null,
		cents = null,
		clef = 'treble',
		keySignature,
		isCurrentNoteHit = false,
		isSequenceComplete = false,
		barLength,
		minWidth = 400,
		firstNoteX = $bindable(0),
		lastNoteX = $bindable(0),
		noteXPositions = $bindable([] as number[]),
		showTimeSignature = true,
		showAllBlack = false,
		greatIntonationIndices = []
	}: Props = $props();

	// Flatten bars into a single sequence for indexing
	const sequence = $derived(bars.flat());
	let lineSpacing = $state(10); // VexFlow's line spacing
	let centerY = $state(HEIGHT / 2); // Will be updated from VexFlow stave position
	const notes = $derived(sequence.map((s) => s.note));

	const ghostNoteRendered = $derived(ghostNote ? renderNote(ghostNote, keySignature, clef) : null);
	const ghostAccidental = $derived(ghostNoteRendered?.accidental ?? null);
	const isHit = $derived(isCurrentNoteHit || isSequenceComplete);

	// Compute note colors based on position relative to currentIndex
	const noteColors = $derived.by(() => {
		if (showAllBlack) return notes.map(() => '#000');
		return notes.map((_, i) => {
			if (i < currentIndex) return '#16a34a'; // brand-green (completed)
			if (i === currentIndex) return '#000'; // black (current)
			return '#9ca3af'; // grey (upcoming)
		});
	});

	// Calculate direction for ghost note arrow by comparing MIDI note numbers
	const ghostDirection = $derived(() => {
		if (!ghostNote || currentIndex >= notes.length) return null;
		const currentNote = notes[currentIndex];
		if (!currentNote || currentNote === null) return null;

		const ghostMidi = noteNameToMidi(ghostNote);
		const currentMidi = noteNameToMidi(currentNote);

		if (ghostMidi === null || currentMidi === null) return null;

		if (ghostMidi > currentMidi) return 'up';
		if (ghostMidi < currentMidi) return 'down';
		return null;
	});

	// Container size binding
	let containerWidth = $state(400);
	$effect(() => {
		containerWidth = Math.max(containerWidth, minWidth);
	});

	// VexFlow rendering
	let vexflowContainer: HTMLDivElement;
	let noteXs = $state<number[]>([]);
	let noteYs = $state<number[]>([]);
	let topLineY = $state(0);
	let bottomLineY = $state(0);
	let vexStave = $state<any>(null);

	// Track last render parameters to avoid infinite loops
	let lastRenderKey = $state('');

	// Render VexFlow staff when bars or dimensions change
	$effect(() => {
		if (vexflowContainer && bars.length > 0 && containerWidth > 0) {
			// Create a key from the render parameters
			const renderKey = `${bars.map((b) => b.map((s) => `${s.note}-${s.length}`).join('|')).join(',')}-${clef}-${JSON.stringify(keySignature)}-${containerWidth}-${noteColors.join(',')}`;

			// Only render if parameters have actually changed
			if (renderKey === lastRenderKey) {
				return;
			}
			lastRenderKey = renderKey;

			try {
				const result = renderVexFlowStaff(
					vexflowContainer,
					bars,
					clef,
					keySignature,
					containerWidth,
					barLength,
					showTimeSignature,
					noteColors
				);
				noteXs = result.noteXPositions;
				noteYs = result.noteYPositions;
				topLineY = result.topLineY;
				bottomLineY = result.bottomLineY;
				centerY = result.middleLineY;
				lineSpacing = result.lineSpacing;
				vexStave = result.stave;

				// Update bindable props
				if (noteXs.length > 0) {
					firstNoteX = noteXs[0];
					lastNoteX = noteXs[noteXs.length - 1];
					noteXPositions = noteXs;
				}
			} catch (error) {
				console.error('Error rendering VexFlow staff:', error);
			}
		}
	});

	const currentGhostX = $derived(
		noteXs && sequence && sequence.length
			? noteXs[Math.min(Math.max(currentIndex, 0), sequence.length - 1)]
			: null
	);

	// Compute bar line positions using note center spacing
	const barLineXPositions = $derived(
		(() => {
			if (!barLength || barLength <= 0 || !noteXs.length || sequence.length < 2)
				return [] as number[];
			const positions: number[] = [];
			let cumulative = 0;
			for (let i = 0; i < sequence.length - 1; i++) {
				const len = sequence[i]?.length ?? 4;
				cumulative += len;
				if (cumulative % barLength === 0) {
					// Place barline midway between current and next note centers
					const mid = (noteXs[i] + noteXs[i + 1]) / 2;
					positions.push(mid);
				}
			}
			return positions;
		})()
	);

	// Calculate playhead X position
	const playheadX = $derived(() => {
		if (!playheadPosition || !noteXs.length || !sequence.length) return 0;
		let cumulativeSixteenths = 0;
		for (let i = 0; i < sequence.length; i++) {
			const noteLength = sequence[i].length ?? 4;
			const nextCumulative = cumulativeSixteenths + noteLength;

			if (playheadPosition >= cumulativeSixteenths && playheadPosition <= nextCumulative) {
				// Playhead is within this note
				const noteProgress = (playheadPosition - cumulativeSixteenths) / noteLength;
				const currentNoteX = noteXs[i] ?? 0;
				const nextNoteX = noteXs[i + 1] ?? currentNoteX + noteLength * 15;
				return currentNoteX + (nextNoteX - currentNoteX) * noteProgress;
			}

			cumulativeSixteenths = nextCumulative;
		}
		return noteXs[noteXs.length - 1] ?? 0;
	});
</script>

<div
	class="flex w-full flex-col items-center gap-4"
	bind:clientWidth={containerWidth}
	style="min-width: {minWidth}px;"
>
	<div class="relative w-full" style="height: {HEIGHT}px;">
		<!-- Playhead line during synth playback (behind VexFlow) -->
		<div
			class="playhead"
			class:visible={playheadPosition !== null && noteXs.length && sequence.length}
			style="left: {playheadX()}px;"
		></div>

		<!-- VexFlow staff rendering -->
		<div bind:this={vexflowContainer} class="vexflow-container"></div>

		<!-- Feedback overlay SVG layer -->
		<svg class="feedback-overlay" width={containerWidth} height={HEIGHT}>
			{#if barLineXPositions.length}
				{#each barLineXPositions as barX}
					<line x1={barX} x2={barX} y1={topLineY} y2={bottomLineY} stroke="#333" stroke-width="1" />
				{/each}
			{/if}
			{#if notes.length && noteXs.length}
				{#each notes as n, i}
					{@const x = noteXs[i] ?? 0}
					{@const noteY = noteYs[i] ?? centerY}
					{@const hasGreatIntonation = greatIntonationIndices.includes(i)}
					{#if n !== null && !showAllBlack}
						<!-- Color overlay circles for feedback -->

						<!-- Green circle for completed/hit notes -->
						{#if i < currentIndex || (isSequenceComplete && i === currentIndex) || i === animatingIndex}
							<circle
								cx={x}
								cy={noteY}
								r="6"
								fill="#16a34a"
								opacity="1"
								pointer-events="none"
								class="feedback-circle"
							/>
						{:else if i === currentIndex && isHit}
							<circle
								cx={x}
								cy={noteY}
								r="6"
								fill="#16a34a"
								opacity="1"
								pointer-events="none"
								class="feedback-circle"
							/>
						{/if}

						<!-- Star for great intonation -->
						{#if hasGreatIntonation}
							<g transform="translate({x - 2}, {noteY - 16}) scale(0.3)">
								<path
									d="M30.2378341,38.9906707 L13.627018,35.4783679 C13.0866804,35.3641152 12.7412702,34.833465 12.8555229,34.2931273 C12.9373869,33.905966 13.2398567,33.6034961 13.627018,33.5216321 L30.2378341,30.0093293 C30.6249954,29.9274653 30.9274653,29.6249954 31.0093293,29.2378341 L34.5216321,12.627018 C34.6358848,12.0866804 35.166535,11.7412702 35.7068727,11.8555229 C36.094034,11.9373869 36.3965039,12.2398567 36.4783679,12.627018 L39.9906707,29.2378341 C40.0725347,29.6249954 40.3750046,29.9274653 40.7621659,30.0093293 L57.372982,33.5216321 C57.9133196,33.6358848 58.2587298,34.166535 58.1444771,34.7068727 C58.0626131,35.094034 57.7601433,35.3965039 57.372982,35.4783679 L40.7621659,38.9906707 C40.3750046,39.0725347 40.0725347,39.3750046 39.9906707,39.7621659 L36.4783679,56.372982 C36.3641152,56.9133196 35.833465,57.2587298 35.2931273,57.1444771 C34.905966,57.0626131 34.6034961,56.7601433 34.5216321,56.372982 L31.0093293,39.7621659 C30.9274653,39.3750046 30.6249954,39.0725347 30.2378341,38.9906707 Z"
									fill="#F6D868"
									pointer-events="none"
									class="great-intonation-star"
								/>
							</g>
						{/if}
					{/if}

					<!-- Finger markings -->
					{#if n !== null}
						<FingerMarking item={sequence[i]} x={noteXs[i] ?? 0} y={HEIGHT - 10} {lineSpacing} />
					{/if}
				{/each}

				<!-- Ghost note overlay -->
				{#if ghostNote !== null && notes[currentIndex] !== undefined && currentGhostX !== null && vexStave}
					{@const ghostY = getNoteYPosition(ghostNote, clef, vexStave)}
					<GhostNote
						x={currentGhostX}
						y={ghostY}
						accidental={ghostAccidental}
						fill={isHit ? 'none' : '#6b7280'}
						opacity={1}
						strokeWidth={0}
						{cents}
						{lineSpacing}
						direction={ghostDirection()}
					/>
				{/if}
			{/if}
		</svg>
	</div>
</div>

<style>
	.vexflow-container {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.vexflow-container :global(svg) {
		overflow: visible;
	}

	.feedback-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: visible;
	}

	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--color-brand-green);
		opacity: 0;
		z-index: 5;
		pointer-events: none;
		transition: opacity 0.5s ease;
	}

	.playhead.visible {
		opacity: 0.3;
	}

	@keyframes radiusBounce {
		0% {
			r: 0;
		}
		60% {
			r: 7.8;
		}
		100% {
			r: 6;
		}
	}

	:global(.feedback-circle) {
		animation: radiusBounce 300ms cubic-bezier(0.68, -0.55, 0.27, 1.55);
	}

	:global(.great-intonation-star) {
		animation: starPop 400ms cubic-bezier(0.68, -0.55, 0.27, 1.55);
	}

	@keyframes starPop {
		0% {
			opacity: 0;
			transform: scale(0);
		}
		70% {
			opacity: 1;
			transform: scale(1.2);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
