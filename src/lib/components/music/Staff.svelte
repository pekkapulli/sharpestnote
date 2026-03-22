<script lang="ts">
	import type { Clef } from '$lib/config/types';
	import type { KeySignature } from '$lib/config/keys';
	import { renderNote } from '$lib/components/music/noteRenderer';
	import GhostNote from './GhostNote.svelte';
	import FingerMarking from './FingerMarking.svelte';
	import MelodyAnnotation from './MelodyAnnotation.svelte';
	import { getFingerMarkingY, getTextAnnotationY } from './markingPositions';
	import { type MelodyItem } from '$lib/config/melody';
	import { noteNameToMidi } from '$lib/util/noteNames';
	import { renderVexFlowStaff, getNoteYPosition } from './vexflowHelper';
	import { type Stave } from 'vexflow';

	interface Props {
		// Provide bars as an array of melody bars, where each bar is an array of { note, length }
		bars?: MelodyItem[][];
		// Index into the flattened notes indicating the currently active target note.
		currentIndex?: number;
		// Index of the note currently being animated (for held sixteenths display)
		animatingIndex?: number | null;
		playheadPosition?: number | null; // Position in sixteenths for playback animation
		ghostNote?: string | null;
		cents?: number | null;
		clef?: Clef;
		keySignature: KeySignature;
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
		singleRow?: boolean; // When false, wraps bars across multiple rows
		barsPerRow?: number; // Explicit bars per row (multi-line mode)
		minBarWidth?: number; // Minimum bar width for auto-calculating barsPerRow
		maxRows?: number; // Limit number of rows (for teaser/truncation)
	}

	const BASE_ROW_HEIGHT = 150;
	const TEXT_ROW_HEIGHT = 175;
	const ROW_GAP = 16;
	const SMALL_SCREEN_BREAKPOINT = 640;

	type RowSpec = {
		rowIndex: number;
		bars: MelodyItem[][];
		startNoteIndex: number;
		notes: MelodyItem[];
	};

	type RowRenderData = {
		noteXPositions: number[];
		noteYPositions: number[];
		topLineY: number;
		bottomLineY: number;
		lineSpacing: number;
		stave: Stave | null;
	};

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
		greatIntonationIndices = [],
		singleRow = true,
		barsPerRow,
		minBarWidth = 240,
		maxRows
	}: Props = $props();

	// Flatten bars into a single sequence for indexing
	const sequence = $derived(bars.flat());
	let lineSpacing = $state(10); // VexFlow's line spacing
	let centerY = $state(BASE_ROW_HEIGHT / 2); // Will be updated from VexFlow stave position
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
	const effectiveWidth = $derived(Math.max(containerWidth, minWidth));

	// ── Multi-line layout (when singleRow is false) ──

	const computedBarsPerRow = $derived.by(() => {
		if (singleRow) return bars.length;
		if (effectiveWidth > 0 && effectiveWidth <= SMALL_SCREEN_BREAKPOINT) return 1;
		if (barsPerRow !== undefined) return Math.max(1, Math.floor(barsPerRow));
		const safeMinBarWidth = Math.max(120, Math.floor(minBarWidth));
		return Math.max(1, Math.floor(effectiveWidth / safeMinBarWidth));
	});

	const rowSpecs = $derived.by(() => {
		if (singleRow) return [] as RowSpec[];
		const safeBarsPerRow = Math.max(1, computedBarsPerRow);
		const normalizedBarsPerRow =
			safeBarsPerRow <= 1 ? 1 : safeBarsPerRow % 2 === 0 ? safeBarsPerRow : safeBarsPerRow - 1;
		const rows: RowSpec[] = [];
		let noteStart = 0;

		for (let i = 0; i < bars.length; ) {
			const remainingBars = bars.length - i;
			const barsInThisRow = Math.min(normalizedBarsPerRow, remainingBars);
			const rowBars = bars.slice(i, i + barsInThisRow);
			const rowNotes = rowBars.flat();
			rows.push({
				rowIndex: rows.length,
				bars: rowBars,
				startNoteIndex: noteStart,
				notes: rowNotes
			});
			noteStart += rowNotes.length;
			i += barsInThisRow;
		}

		return maxRows ? rows.slice(0, maxRows) : rows;
	});

	const isTruncated = $derived(
		maxRows !== undefined &&
			!singleRow &&
			rowSpecs.length < Math.ceil(bars.length / Math.max(1, computedBarsPerRow))
	);

	const rowHeight = $derived.by(() => {
		if (singleRow) return BASE_ROW_HEIGHT;
		const hasAnyText = rowSpecs.some((row) => row.notes.some((item) => Boolean(item.text)));
		return hasAnyText ? TEXT_ROW_HEIGHT : BASE_ROW_HEIGHT;
	});

	const multiLineHeight = $derived(
		Math.max(1, rowSpecs.length) * rowHeight + Math.max(0, rowSpecs.length - 1) * ROW_GAP
	);

	// Multi-line per-row render state
	let rowContainers = $state<Array<HTMLDivElement | null>>([]);
	let rowRenderData = $state<Record<number, RowRenderData>>({});
	let multiResizeEpoch = $state(0);
	let multiLayoutReady = $state(false);

	// ResizeObserver for multi-line mode
	let multiHostElement = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (singleRow || !multiHostElement) return;

		const observer = new ResizeObserver((entries) => {
			const width = Math.floor(entries[0]?.contentRect.width ?? 0);
			if (width <= 0) return;

			let didChange = false;
			if (width !== containerWidth) {
				containerWidth = width;
				didChange = true;
			}
			if (!multiLayoutReady) {
				multiLayoutReady = true;
				didChange = true;
			}
			if (didChange) {
				multiResizeEpoch += 1;
			}
		});

		observer.observe(multiHostElement);
		return () => observer.disconnect();
	});

	// Multi-line VexFlow rendering
	$effect(() => {
		if (singleRow) return;
		const forceRefresh = multiResizeEpoch;
		void forceRefresh;

		if (!multiLayoutReady || effectiveWidth <= 0) {
			rowRenderData = {};
			return;
		}

		const nextRenderData: Record<number, RowRenderData> = {};

		for (const row of rowSpecs) {
			const container = rowContainers[row.rowIndex];
			if (!container) continue;

			const rowNoteColors = showAllBlack
				? row.notes.map(() => '#000')
				: row.notes.map((_, i) => {
						const globalIndex = row.startNoteIndex + i;
						if (globalIndex < currentIndex) return '#16a34a';
						if (globalIndex === currentIndex) return '#000';
						return '#9ca3af';
					});

			try {
				const result = renderVexFlowStaff(
					container,
					row.bars,
					clef,
					keySignature,
					effectiveWidth,
					barLength,
					showTimeSignature && row.rowIndex === 0,
					rowNoteColors
				);

				nextRenderData[row.rowIndex] = {
					noteXPositions: result.noteXPositions,
					noteYPositions: result.noteYPositions,
					topLineY: result.topLineY,
					bottomLineY: result.bottomLineY,
					lineSpacing: result.lineSpacing,
					stave: result.stave
				};
			} catch (error) {
				console.error('Error rendering VexFlow row:', error);
			}
		}

		rowRenderData = nextRenderData;
	});

	// Multi-line playhead positions
	const rowPlayheads = $derived.by(() => {
		const playheads: Record<number, { x: number; visible: boolean }> = {};
		if (singleRow || playheadPosition === null) return playheads;

		let cumulativeSixteenths = 0;

		for (const row of rowSpecs) {
			const rowLength = row.notes.reduce((sum, item) => sum + item.length, 0);
			const rowStart = cumulativeSixteenths;
			const rowEnd = rowStart + rowLength;
			const noteXs = rowRenderData[row.rowIndex]?.noteXPositions ?? [];

			if (
				!noteXs.length ||
				!row.notes.length ||
				playheadPosition < rowStart ||
				playheadPosition > rowEnd
			) {
				playheads[row.rowIndex] = { x: 0, visible: false };
				cumulativeSixteenths = rowEnd;
				continue;
			}

			const rowLocalPlayhead = playheadPosition - rowStart;
			let localCumulative = 0;
			let playheadX = noteXs[noteXs.length - 1] ?? 0;

			for (let i = 0; i < row.notes.length; i++) {
				const noteLength = row.notes[i].length ?? 4;
				const nextCumulative = localCumulative + noteLength;
				if (rowLocalPlayhead >= localCumulative && rowLocalPlayhead <= nextCumulative) {
					const noteProgress = (rowLocalPlayhead - localCumulative) / noteLength;
					const currentNoteX = noteXs[i] ?? 0;
					const nextNoteX = noteXs[i + 1] ?? currentNoteX + noteLength * 15;
					playheadX = currentNoteX + (nextNoteX - currentNoteX) * noteProgress;
					break;
				}
				localCumulative = nextCumulative;
			}

			playheads[row.rowIndex] = { x: playheadX, visible: true };
			cumulativeSixteenths = rowEnd;
		}

		return playheads;
	});

	function getMultiFingerY(row: RowSpec, localIndex: number): number {
		const rd = rowRenderData[row.rowIndex];
		const ls = rd?.lineSpacing ?? 10;
		const topLineY = rd?.topLineY ?? rowHeight / 2;
		return getFingerMarkingY({
			topLineY,
			lineSpacing: ls,
			noteY: rd?.noteYPositions[localIndex],
			notes: row.notes,
			noteIndex: localIndex
		});
	}

	function getMultiTextY(row: RowSpec): number {
		const rd = rowRenderData[row.rowIndex];
		const ls = rd?.lineSpacing ?? 10;
		const topLineY = rd?.topLineY ?? rowHeight / 2;
		return getTextAnnotationY({ topLineY, lineSpacing: ls });
	}

	// ── Single-row rendering (existing logic) ──

	// VexFlow rendering
	let vexflowContainer = $state<HTMLDivElement>(undefined!);
	let noteXs = $state<number[]>([]);
	let noteYs = $state<number[]>([]);
	let vexStave = $state<Stave | null>(null);

	// Track last render parameters to avoid infinite loops
	let lastRenderKey = $state('');

	// Render VexFlow staff when bars or dimensions change
	$effect(() => {
		if (!singleRow) return;
		if (vexflowContainer && bars.length > 0 && effectiveWidth > 0) {
			// Create a key from the render parameters
			const renderKey = `${bars.map((b) => b.map((s) => `${s.note}-${s.length}`).join('|')).join(',')}-${clef}-${JSON.stringify(keySignature)}-${effectiveWidth}-${noteColors.join(',')}-${barLength ?? 'none'}-${showTimeSignature}-${singleRow}`;

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
					effectiveWidth,
					barLength,
					showTimeSignature,
					noteColors
				);
				noteXs = result.noteXPositions;
				noteYs = result.noteYPositions;
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

	function getFingerY(noteIndex: number): number {
		const topLineY = centerY - lineSpacing * 2;
		return getFingerMarkingY({
			topLineY,
			lineSpacing,
			noteY: noteYs[noteIndex],
			notes: sequence,
			noteIndex
		});
	}

	function getTextY(): number {
		const topLineY = centerY - lineSpacing * 2;
		return getTextAnnotationY({
			topLineY,
			lineSpacing
		});
	}
</script>

{#if singleRow}
	<div
		class="flex w-full flex-col items-center gap-4"
		bind:clientWidth={containerWidth}
		style="min-width: {minWidth}px;"
	>
		<div class="relative w-full" style="height: {BASE_ROW_HEIGHT}px;">
			<!-- Playhead line during synth playback (behind VexFlow) -->
			<div
				class="playhead"
				class:visible={playheadPosition !== null && noteXs.length && sequence.length}
				style="left: {playheadX()}px;"
			></div>

			<!-- VexFlow staff rendering -->
			<div bind:this={vexflowContainer} class="vexflow-container"></div>

			<!-- Feedback overlay SVG layer -->
			<svg class="feedback-overlay" width={effectiveWidth} height={BASE_ROW_HEIGHT}>
				{#if notes.length && noteXs.length}
					{#each notes as n, i (i)}
						{@const x = noteXs[i] ?? 0}
						{@const noteY = noteYs[i] ?? centerY}
						{@const hasGreatIntonation = greatIntonationIndices.includes(i)}
						{#if n !== null && !showAllBlack}
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
							<FingerMarking
								item={sequence[i]}
								x={noteXs[i] ?? 0}
								y={getFingerY(i)}
								{lineSpacing}
							/>
							<MelodyAnnotation
								item={sequence[i]}
								x={noteXs[i] ?? 0}
								y={getTextY()}
								{lineSpacing}
							/>
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
{:else}
	<!-- Multi-line mode -->
	<div
		class="w-full"
		bind:this={multiHostElement}
		style="min-width: {minWidth}px; height: {multiLineHeight}px;"
	>
		{#each rowSpecs as row (row.rowIndex)}
			<div class="row" style="height: {rowHeight}px;">
				<div
					class="playhead"
					class:visible={rowPlayheads[row.rowIndex]?.visible ?? false}
					style="left: {rowPlayheads[row.rowIndex]?.x ?? 0}px;"
				></div>

				<div bind:this={rowContainers[row.rowIndex]} class="vexflow-container"></div>

				<svg class="feedback-overlay" width={effectiveWidth} height={rowHeight}>
					{#if row.notes.length}
						{#each row.notes as item, i (`${row.rowIndex}-${i}`)}
							{@const globalIndex = row.startNoteIndex + i}
							{@const rd = rowRenderData[row.rowIndex]}
							{@const x = rd?.noteXPositions[i] ?? 0}
							{@const noteY = rd?.noteYPositions[i] ?? rowHeight / 2}
							{@const hasGreatIntonation = greatIntonationIndices.includes(globalIndex)}

							{#if item.note !== null && !showAllBlack}
								{#if globalIndex < currentIndex || (isSequenceComplete && globalIndex === currentIndex) || globalIndex === animatingIndex}
									<circle
										cx={x}
										cy={noteY}
										r="6"
										fill="#16a34a"
										opacity="1"
										pointer-events="none"
										class="feedback-circle"
									/>
								{:else if globalIndex === currentIndex && isHit}
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

							{#if item.note !== null}
								<FingerMarking
									{item}
									x={rd?.noteXPositions[i] ?? 0}
									y={getMultiFingerY(row, i)}
									lineSpacing={rd?.lineSpacing ?? 10}
								/>
								<MelodyAnnotation
									{item}
									x={rd?.noteXPositions[i] ?? 0}
									y={getMultiTextY(row)}
									lineSpacing={rd?.lineSpacing ?? 10}
								/>
							{/if}
						{/each}

						<!-- Ghost note overlay for the row containing currentIndex -->
						{#if ghostNote !== null && currentIndex >= row.startNoteIndex && currentIndex < row.startNoteIndex + row.notes.length}
							{@const rd = rowRenderData[row.rowIndex]}
							{@const localIdx = currentIndex - row.startNoteIndex}
							{@const ghostX = rd?.noteXPositions[localIdx] ?? 0}
							{#if rd?.stave}
								{@const ghostY = getNoteYPosition(ghostNote, clef, rd.stave)}
								<GhostNote
									x={ghostX}
									y={ghostY}
									accidental={ghostAccidental}
									fill={isHit ? 'none' : '#6b7280'}
									opacity={1}
									strokeWidth={0}
									{cents}
									lineSpacing={rd.lineSpacing}
									direction={ghostDirection()}
								/>
							{/if}
						{/if}
					{/if}
				</svg>
			</div>
		{/each}

		{#if isTruncated}
			<div class="truncation-fade"></div>
		{/if}
	</div>
{/if}

<style>
	.row {
		position: relative;
		margin-bottom: 16px;
	}

	.row:last-child {
		margin-bottom: 0;
	}

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

	.truncation-fade {
		position: relative;
		height: 3rem;
		margin-top: -3rem;
		background: linear-gradient(to bottom, transparent, white);
		pointer-events: none;
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
			opacity: 0;
			transform: scale(0);
		}
	}
</style>
