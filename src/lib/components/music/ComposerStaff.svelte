<script lang="ts">
	import type { Clef } from '$lib/config/types';
	import type { KeySignature } from '$lib/config/keys';
	import FingerMarking from './FingerMarking.svelte';
	import { type MelodyItem } from '$lib/config/melody';
	import { getNoteYPosition, renderVexFlowStaff, type VexFlowLayoutOptions } from './vexflowHelper';
	import type { Stave } from 'vexflow';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		bars?: MelodyItem[][];
		clef?: Clef;
		keySignature: KeySignature;
		barLength?: number;
		minWidth?: number;
		showTimeSignature?: boolean;
		barsPerRow?: number;
		minBarWidth?: number;
		compactMode?: boolean;
		pitchPalette?: string[];
		playheadPosition?: number | null;
		selectedNoteIndex?: number;
		onMoveNote?: (index: number, note: string) => void;
		onAddNote?: (note: string) => void;
		onSelectNote?: (index: number) => void;
		onInteractionRelease?: () => void;
		onOpenNoteContextMenu?: (payload: { index: number; x: number; y: number }) => void;
		isContextMenuOpen?: boolean;
	}

	const ROW_HEIGHT = 150;
	const ROW_GAP = 16;
	const SELECT_NOTE_THRESHOLD = 40;
	const SMALL_SCREEN_BREAKPOINT = 640;
	const DRAG_START_THRESHOLD = 8;
	const LONG_PRESS_MS = 420;

	type DragState = {
		pointerId: number;
		rowIndex: number;
		noteIndex: number;
		noteX: number;
		startX: number;
		startY: number;
		lastMovedNote: string | null;
		didDrag: boolean;
		longPressEligible: boolean;
		longPressTriggered: boolean;
		longPressTimer: ReturnType<typeof setTimeout> | null;
	};

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
		compactMode = false,
		pitchPalette = [],
		playheadPosition = null,
		selectedNoteIndex = -1,
		onMoveNote,
		onAddNote,
		onSelectNote,
		onInteractionRelease,
		onOpenNoteContextMenu,
		isContextMenuOpen = false
	}: Props = $props();

	let containerWidth = $state(0);
	let isLayoutReady = $state(false);
	const effectiveWidth = $derived(isLayoutReady ? Math.max(containerWidth, minWidth) : 0);
	let hostElement = $state<HTMLDivElement | null>(null);
	let resizeEpoch = $state(0);
	let rowContainers = $state<Array<HTMLDivElement | null>>([]);
	let rowRenderData = $state<Record<number, RowRenderData>>({});
	let hoverState = $state<HoverState | null>(null);
	let dragState = $state<DragState | null>(null);
	let suppressNextClick = $state(false);
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

	const vexLayoutOptions = $derived.by<VexFlowLayoutOptions>(() => {
		if (!compactMode) {
			return {};
		}

		return {
			staveInsetX: 4,
			firstBarHeaderReserve: 116,
			subsequentBarReserve: 10,
			minNoteWidth: 14
		};
	});

	const rowSpecs = $derived.by(() => {
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

		return rows;
	});

	const componentHeight = $derived(
		Math.max(1, rowSpecs.length) * ROW_HEIGHT + Math.max(0, rowSpecs.length - 1) * ROW_GAP
	);

	const rowPlayheads = $derived.by(() => {
		const playheads: Record<number, { x: number; visible: boolean }> = {};

		if (playheadPosition === null) {
			return playheads;
		}

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
				if (selectedNoteIndex === row.startNoteIndex + i) {
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
				noteColors,
				vexLayoutOptions
			);

			const seenNaturalNotes = new SvelteSet<string>();

			const snapPoints = pitchPalette
				.filter((note) => note !== 'rest')
				.map((note) => toNaturalStaffNote(note))
				.filter((note) => {
					if (seenNaturalNotes.has(note)) return false;
					seenNaturalNotes.add(note);
					return true;
				})
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

	function toNaturalStaffNote(note: string): string {
		const match = /^([a-g])([#b]?)\/(\d+)$/.exec(note);
		if (!match) return note;
		const [, letter, , octave] = match;
		return `${letter}/${octave}`;
	}

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

	function getNearestNoteAtX(
		row: RowSpec,
		localX: number
	): { noteIndex: number; localIndex: number; noteX: number; distance: number } | null {
		const noteXs = rowRenderData[row.rowIndex]?.noteXPositions ?? [];
		if (noteXs.length === 0) return null;

		let nearestIndex = 0;
		let nearestDistance = Math.abs(noteXs[0] - localX);
		for (let i = 1; i < noteXs.length; i++) {
			const d = Math.abs(noteXs[i] - localX);
			if (d < nearestDistance) {
				nearestDistance = d;
				nearestIndex = i;
			}
		}

		return {
			noteIndex: row.startNoteIndex + nearestIndex,
			localIndex: nearestIndex,
			noteX: noteXs[nearestIndex],
			distance: nearestDistance
		};
	}

	function updateHoverStateFromPosition(row: RowSpec, localX: number, localY: number) {
		const rowData = rowRenderData[row.rowIndex];
		if (!rowData) return;

		const closestPitch = getClosestPitch(row.rowIndex, localY);
		if (!closestPitch) {
			hoverState = null;
			return;
		}

		const nearest = getNearestNoteAtX(row, localX);
		if (!nearest) {
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

		const noteXs = rowData.noteXPositions;
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
			x: nearest.noteX,
			y: closestPitch.y,
			note: closestPitch.note,
			action: nearest.distance <= SELECT_NOTE_THRESHOLD ? 'move' : 'add',
			noteIndex: nearest.noteIndex
		};
	}

	function onRowMouseMove(event: MouseEvent, row: RowSpec) {
		const target = event.currentTarget as HTMLDivElement;
		const rect = target.getBoundingClientRect();
		const localX = event.clientX - rect.left;
		const localY = event.clientY - rect.top;

		updateHoverStateFromPosition(row, localX, localY);
	}

	function onRowMouseLeave() {
		if (dragState) return;
		hoverState = null;
	}

	function onRowPointerDown(event: PointerEvent, row: RowSpec) {
		if (event.pointerType === 'mouse' && event.button !== 0) return;

		const target = event.currentTarget as HTMLDivElement;
		const rect = target.getBoundingClientRect();
		const localX = event.clientX - rect.left;
		const localY = event.clientY - rect.top;

		// Touch and quick clicks may not emit mousemove first, so seed click intent here.
		updateHoverStateFromPosition(row, localX, localY);

		const nearest = getNearestNoteAtX(row, localX);
		if (!nearest) return;
		const isLongPressEligible = nearest.distance <= SELECT_NOTE_THRESHOLD;

		const longPressTimer =
			isLongPressEligible && onOpenNoteContextMenu
				? setTimeout(() => {
						if (!dragState || dragState.pointerId !== event.pointerId || dragState.didDrag) return;

						onSelectNote?.(nearest.noteIndex);
						emitContextMenuForNote(row, nearest.noteIndex, nearest.noteX);
						suppressNextClick = true;
						dragState = {
							...dragState,
							longPressTriggered: true,
							longPressTimer: null
						};
					}, LONG_PRESS_MS)
				: null;

		dragState = {
			pointerId: event.pointerId,
			rowIndex: row.rowIndex,
			noteIndex: nearest.noteIndex,
			noteX: nearest.noteX,
			startX: localX,
			startY: event.clientY - rect.top,
			lastMovedNote: null,
			didDrag: false,
			longPressEligible: isLongPressEligible,
			longPressTriggered: false,
			longPressTimer
		};

		onSelectNote?.(nearest.noteIndex);
		target.setPointerCapture(event.pointerId);
	}

	function onRowPointerMove(event: PointerEvent, row: RowSpec) {
		const target = event.currentTarget as HTMLDivElement;
		const rect = target.getBoundingClientRect();
		const localX = event.clientX - rect.left;
		const localY = event.clientY - rect.top;

		updateHoverStateFromPosition(row, localX, localY);

		if (
			!dragState ||
			dragState.pointerId !== event.pointerId ||
			dragState.rowIndex !== row.rowIndex
		) {
			return;
		}

		if (dragState.longPressTriggered) {
			event.preventDefault();
			return;
		}

		if (!dragState.didDrag) {
			const deltaX = localX - dragState.startX;
			const deltaY = localY - dragState.startY;
			const distance = Math.hypot(deltaX, deltaY);
			if (distance < DRAG_START_THRESHOLD) {
				return;
			}

			if (dragState.longPressTimer) {
				clearTimeout(dragState.longPressTimer);
			}
			dragState = {
				...dragState,
				longPressTimer: null
			};
		}

		const closestPitch = getClosestPitch(row.rowIndex, localY);
		if (!closestPitch) return;

		hoverState = {
			rowIndex: row.rowIndex,
			x: dragState.noteX,
			y: closestPitch.y,
			note: closestPitch.note,
			action: 'move',
			noteIndex: dragState.noteIndex
		};

		if (dragState.lastMovedNote === closestPitch.note) {
			event.preventDefault();
			return;
		}

		onMoveNote?.(dragState.noteIndex, closestPitch.note);
		onSelectNote?.(dragState.noteIndex);
		dragState = {
			...dragState,
			lastMovedNote: closestPitch.note,
			didDrag: true,
			longPressTimer: null
		};
		event.preventDefault();
	}

	function endDrag(event: PointerEvent) {
		if (!dragState || dragState.pointerId !== event.pointerId) return;

		const currentDrag = dragState;
		const target = event.currentTarget as HTMLDivElement;
		const rect = target.getBoundingClientRect();
		const localX = event.clientX - rect.left;
		const localY = event.clientY - rect.top;

		updateHoverStateFromPosition(rowSpecs[currentDrag.rowIndex], localX, localY);

		if (dragState.longPressTimer) {
			clearTimeout(dragState.longPressTimer);
		}

		if (!currentDrag.didDrag && !currentDrag.longPressTriggered) {
			performHoverAction();
			suppressNextClick = true;
		}

		if (dragState.didDrag) {
			suppressNextClick = true;
		}

		if (target.hasPointerCapture(event.pointerId)) {
			target.releasePointerCapture(event.pointerId);
		}

		dragState = null;
		onInteractionRelease?.();
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

	export function getContextMenuAnchorForNote(
		noteIndex: number
	): { index: number; x: number; y: number } | null {
		const row = rowSpecs.find(
			(candidate) =>
				noteIndex >= candidate.startNoteIndex &&
				noteIndex < candidate.startNoteIndex + candidate.notes.length
		);
		if (!row) return null;

		const rowData = rowRenderData[row.rowIndex];
		if (!rowData) return null;

		const localIndex = noteIndex - row.startNoteIndex;
		const noteX = rowData.noteXPositions[localIndex];
		if (noteX === undefined) return null;

		const rowElement = rowContainers[row.rowIndex];
		if (!rowElement) return null;

		const rect = rowElement.getBoundingClientRect();
		const menuAnchorY = Math.max(0, rowData.topLineY - rowData.lineSpacing * 1.5);

		return {
			index: noteIndex,
			x: rect.left + noteX,
			y: rect.top + menuAnchorY
		};
	}

	function performHoverAction() {
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

	function onRowClick() {
		if (suppressNextClick) {
			suppressNextClick = false;
			return;
		}

		performHoverAction();
	}

	function onRowKeyDown(event: KeyboardEvent) {
		if (isContextMenuOpen) return;
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
				class:row-compact={compactMode}
				style="height: {ROW_HEIGHT}px;"
				onmousemove={(e) => onRowMouseMove(e, row)}
				onmouseleave={onRowMouseLeave}
				onpointerdown={(e) => onRowPointerDown(e, row)}
				onpointermove={(e) => onRowPointerMove(e, row)}
				onpointerup={endDrag}
				onpointercancel={endDrag}
				onclick={onRowClick}
				oncontextmenu={(e) => onRowContextMenu(e, row)}
				onkeydown={onRowKeyDown}
				role="button"
				tabindex="0"
			>
				<div
					class="playhead"
					class:visible={rowPlayheads[row.rowIndex]?.visible ?? false}
					style="left: {rowPlayheads[row.rowIndex]?.x ?? 0}px;"
				></div>

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
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}

	.row.row-compact {
		margin-bottom: 10px;
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
		user-select: none;
		-webkit-user-select: none;
	}

	.vexflow-container :global(*) {
		user-select: none;
		-webkit-user-select: none;
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
