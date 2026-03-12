<script lang="ts">
	import type { Clef } from '$lib/config/types';
	import type { KeySignature } from '$lib/config/keys';
	import FingerMarking from './FingerMarking.svelte';
	import { type MelodyItem } from '$lib/config/melody';
	import { getNoteYPosition, renderVexFlowStaff } from './vexflowHelper';
	import type { Stave } from 'vexflow';

	interface Props {
		bars?: MelodyItem[][];
		clef?: Clef;
		keySignature: KeySignature;
		barLength?: number;
		minWidth?: number;
		showTimeSignature?: boolean;
		barsPerRow?: number;
		minBarWidth?: number;
		pitchPalette?: string[];
		selectedNoteIndex?: number;
		onMoveNote?: (index: number, note: string) => void;
		onAddNote?: (note: string) => void;
		onSelectNote?: (index: number) => void;
		onOpenNoteContextMenu?: (payload: { index: number; x: number; y: number }) => void;
	}

	const ROW_HEIGHT = 150;
	const ROW_GAP = 16;
	const SELECT_NOTE_THRESHOLD = 20;
	const SMALL_SCREEN_BREAKPOINT = 640;

	type RowSpec = {
		rowIndex: number;
		bars: MelodyItem[][];
		startNoteIndex: number;
		notes: MelodyItem[];
	};

	type RowRenderData = {
		noteXPositions: number[];
		topLineY: number;
		bottomLineY: number;
		lineSpacing: number;
		stave: Stave | null;
		snapPoints: Array<{ note: string; y: number }>;
	};

	type HoverState = {
		rowIndex: number;
		x: number;
		y: number;
		note: string;
		action: 'move' | 'add';
		noteIndex: number;
	};

	let {
		bars = [],
		clef = 'treble',
		keySignature,
		barLength,
		minWidth = 400,
		showTimeSignature = true,
		barsPerRow,
		minBarWidth = 240,
		pitchPalette = [],
		selectedNoteIndex = -1,
		onMoveNote,
		onAddNote,
		onSelectNote,
		onOpenNoteContextMenu
	}: Props = $props();

	let containerWidth = $state(0);
	let isLayoutReady = $state(false);
	const effectiveWidth = $derived(isLayoutReady ? Math.max(containerWidth, minWidth) : 0);
	let hostElement = $state<HTMLDivElement | null>(null);
	let resizeEpoch = $state(0);
	let rowContainers = $state<Array<HTMLDivElement | null>>([]);
	let rowRenderData = $state<Record<number, RowRenderData>>({});
	let hoverState = $state<HoverState | null>(null);
	const computedBarsPerRow = $derived.by(() => {
		if (effectiveWidth > 0 && effectiveWidth <= SMALL_SCREEN_BREAKPOINT) {
			return 1;
		}

		if (barsPerRow !== undefined) {
			return Math.max(1, Math.floor(barsPerRow));
		}

		const safeMinBarWidth = Math.max(120, Math.floor(minBarWidth));
		return Math.max(1, Math.floor(effectiveWidth / safeMinBarWidth));
	});

	const rowSpecs = $derived.by(() => {
		const safeBarsPerRow = computedBarsPerRow;
		const evenBarsPerRow =
			safeBarsPerRow <= 1 ? 1 : safeBarsPerRow % 2 === 0 ? safeBarsPerRow : safeBarsPerRow - 1;
		const rows: RowSpec[] = [];
		let noteStart = 0;

		for (let i = 0; i < bars.length; ) {
			const remainingBars = bars.length - i;

			// Prefer even bar counts per row, but allow a final single bar when total is odd.
			let barsInThisRow =
				remainingBars === 1 ? 1 : Math.min(evenBarsPerRow > 1 ? evenBarsPerRow : 2, remainingBars);

			if (barsInThisRow > 1 && barsInThisRow % 2 !== 0) {
				barsInThisRow -= 1;
			}

			if (barsInThisRow <= 0) {
				barsInThisRow = Math.min(remainingBars, 1);
			}

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

		return rows;
	});

	const componentHeight = $derived(
		Math.max(1, rowSpecs.length) * ROW_HEIGHT + Math.max(0, rowSpecs.length - 1) * ROW_GAP
	);

	$effect(() => {
		if (!hostElement) return;

		const observer = new ResizeObserver((entries) => {
			const width = Math.floor(entries[0]?.contentRect.width ?? 0);
			if (width <= 0) return;

			let didChange = false;
			if (width !== containerWidth) {
				containerWidth = width;
				didChange = true;
			}

			if (!isLayoutReady) {
				isLayoutReady = true;
				didChange = true;
				requestAnimationFrame(() => {
					resizeEpoch += 1;
				});
			}

			if (didChange) {
				resizeEpoch += 1;
			}
		});

		observer.observe(hostElement);
		return () => observer.disconnect();
	});

	$effect(() => {
		const forceRefresh = resizeEpoch;
		void forceRefresh;

		if (!isLayoutReady || effectiveWidth <= 0) {
			rowRenderData = {};
			return;
		}

		const nextRenderData: Record<number, RowRenderData> = {};

		for (const row of rowSpecs) {
			const container = rowContainers[row.rowIndex];
			if (!container || effectiveWidth <= 0) continue;

			const noteColors = row.notes.map((item, i) => {
				if (item.note !== null && selectedNoteIndex === row.startNoteIndex + i) {
					return '#16a34a'; // brand-green
				}
				return '#000';
			});

			const result = renderVexFlowStaff(
				container,
				row.bars,
				clef,
				keySignature,
				effectiveWidth,
				barLength,
				showTimeSignature && row.rowIndex === 0,
				noteColors
			);

			const snapPoints = pitchPalette
				.filter((note) => note !== 'rest')
				.map((note) => ({
					note,
					y: result.stave ? getNoteYPosition(note, clef, result.stave) : result.middleLineY
				}));

			nextRenderData[row.rowIndex] = {
				noteXPositions: result.noteXPositions,
				topLineY: result.topLineY,
				bottomLineY: result.bottomLineY,
				lineSpacing: result.lineSpacing,
				stave: result.stave,
				snapPoints
			};
		}

		rowRenderData = nextRenderData;
	});

	function getClosestPitch(rowIndex: number, y: number): { note: string; y: number } | null {
		const points = rowRenderData[rowIndex]?.snapPoints ?? [];
		if (points.length === 0) return null;

		let best = points[0];
		let bestDistance = Math.abs(points[0].y - y);
		for (let i = 1; i < points.length; i++) {
			const d = Math.abs(points[i].y - y);
			if (d < bestDistance) {
				bestDistance = d;
				best = points[i];
			}
		}

		return best;
	}

	function onRowMouseMove(event: MouseEvent, row: RowSpec) {
		const rowData = rowRenderData[row.rowIndex];
		if (!rowData) return;

		const target = event.currentTarget as HTMLDivElement;
		const rect = target.getBoundingClientRect();
		const localX = event.clientX - rect.left;
		const localY = event.clientY - rect.top;

		const closestPitch = getClosestPitch(row.rowIndex, localY);
		if (!closestPitch) {
			hoverState = null;
			return;
		}

		const noteXs = rowData.noteXPositions;
		if (noteXs.length === 0) {
			hoverState = {
				rowIndex: row.rowIndex,
				x: Math.max(24, Math.min(effectiveWidth - 24, localX)),
				y: closestPitch.y,
				note: closestPitch.note,
				action: 'add',
				noteIndex: row.startNoteIndex
			};
			return;
		}

		let nearestIndex = 0;
		let nearestDistance = Math.abs(noteXs[0] - localX);
		for (let i = 1; i < noteXs.length; i++) {
			const d = Math.abs(noteXs[i] - localX);
			if (d < nearestDistance) {
				nearestDistance = d;
				nearestIndex = i;
			}
		}

		const addThresholdX = noteXs[noteXs.length - 1] + 24;
		if (localX > addThresholdX) {
			hoverState = {
				rowIndex: row.rowIndex,
				x: Math.min(effectiveWidth - 24, addThresholdX + 16),
				y: closestPitch.y,
				note: closestPitch.note,
				action: 'add',
				noteIndex: row.startNoteIndex + noteXs.length
			};
			return;
		}

		hoverState = {
			rowIndex: row.rowIndex,
			x: noteXs[nearestIndex],
			y: closestPitch.y,
			note: closestPitch.note,
			action: nearestDistance <= SELECT_NOTE_THRESHOLD ? 'move' : 'add',
			noteIndex: row.startNoteIndex + nearestIndex
		};
	}

	function onRowMouseLeave() {
		hoverState = null;
	}

	function emitContextMenuForNote(row: RowSpec, noteIndex: number, fallbackX: number) {
		const rowData = rowRenderData[row.rowIndex];
		if (!rowData) return;

		const localIndex = noteIndex - row.startNoteIndex;
		if (localIndex < 0 || localIndex >= row.notes.length) return;

		const rowElement = rowContainers[row.rowIndex];
		if (!rowElement) return;

		const rect = rowElement.getBoundingClientRect();
		const noteX = rowData.noteXPositions[localIndex] ?? fallbackX;
		const menuAnchorY = Math.max(0, rowData.topLineY - rowData.lineSpacing * 1.5);

		onOpenNoteContextMenu?.({
			index: noteIndex,
			x: rect.left + noteX,
			y: rect.top + menuAnchorY
		});
	}

	function onRowClick() {
		if (!hoverState) return;
		if (hoverState.action === 'add') {
			const row = rowSpecs[hoverState.rowIndex];
			if (!row || row.notes.length > 0) return;
			onAddNote?.(hoverState.note);
			return;
		}
		if (hoverState.action === 'move') {
			const row = rowSpecs[hoverState.rowIndex];
			onSelectNote?.(hoverState.noteIndex);
			onMoveNote?.(hoverState.noteIndex, hoverState.note);
			if (row) {
				emitContextMenuForNote(row, hoverState.noteIndex, hoverState.x);
			}
		}
	}

	function onRowKeyDown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		onRowClick();
	}

	function onRowContextMenu(event: MouseEvent, row: RowSpec) {
		event.preventDefault();

		const rowData = rowRenderData[row.rowIndex];
		const noteXs = rowData?.noteXPositions ?? [];
		if (!rowData || noteXs.length === 0) return;

		const target = event.currentTarget as HTMLDivElement;
		const rect = target.getBoundingClientRect();
		const localX = event.clientX - rect.left;

		let nearestIndex = 0;
		let nearestDistance = Math.abs(noteXs[0] - localX);
		for (let i = 1; i < noteXs.length; i++) {
			const d = Math.abs(noteXs[i] - localX);
			if (d < nearestDistance) {
				nearestDistance = d;
				nearestIndex = i;
			}
		}

		if (nearestDistance > SELECT_NOTE_THRESHOLD) return;

		const noteIndex = row.startNoteIndex + nearestIndex;
		onSelectNote?.(noteIndex);
		emitContextMenuForNote(row, noteIndex, noteXs[nearestIndex]);
	}
</script>

<div
	class="w-full"
	bind:this={hostElement}
	bind:clientWidth={containerWidth}
	style="min-width: {minWidth}px; height: {componentHeight}px;"
>
	{#if rowSpecs.length === 0}
		<div class="empty-row"></div>
	{:else}
		{#each rowSpecs as row (row.rowIndex)}
			<div
				class="row"
				style="height: {ROW_HEIGHT}px;"
				onmousemove={(e) => onRowMouseMove(e, row)}
				onmouseleave={onRowMouseLeave}
				onclick={onRowClick}
				oncontextmenu={(e) => onRowContextMenu(e, row)}
				onkeydown={onRowKeyDown}
				role="button"
				tabindex="0"
			>
				<div bind:this={rowContainers[row.rowIndex]} class="vexflow-container"></div>

				<svg class="feedback-overlay" width={effectiveWidth} height={ROW_HEIGHT}>
					{#if row.notes.length}
						{#each row.notes as item, i (`${row.rowIndex}-${i}`)}
							{#if item.note !== null}
								<FingerMarking
									{item}
									x={rowRenderData[row.rowIndex]?.noteXPositions[i] ?? 0}
									y={ROW_HEIGHT - 10}
									lineSpacing={rowRenderData[row.rowIndex]?.lineSpacing ?? 10}
								/>
							{/if}
						{/each}
					{/if}

					{#if hoverState && hoverState.rowIndex === row.rowIndex}
						<circle
							cx={hoverState.x}
							cy={hoverState.y}
							r="7"
							class={hoverState.action === 'move' ? 'hover-move' : 'hover-add'}
						/>
					{/if}
				</svg>
			</div>
		{/each}
	{/if}
</div>

<style>
	.row {
		position: relative;
		width: 100%;
		margin-bottom: 16px;
	}

	.row:last-child {
		margin-bottom: 0;
	}

	.empty-row {
		height: 150px;
		border: 1px dashed #cbd5e1;
		border-radius: 8px;
	}

	.vexflow-container {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
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

	.hover-move {
		fill: rgba(22, 163, 74, 0.2);
		stroke: #16a34a;
		stroke-width: 2;
	}

	.hover-add {
		fill: rgba(59, 130, 246, 0.2);
		stroke: #2563eb;
		stroke-width: 2;
	}
</style>
