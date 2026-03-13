<script lang="ts">
	import { onMount } from 'svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import {
		lengthRestMap,
		lengthToNoteMap,
		type MelodyItem,
		type NoteLength
	} from '$lib/config/melody';
	import { isTouchDevice } from '$lib/util/isTouchDevice';

	interface Props {
		x: number;
		y: number;
		selectedItem: MelodyItem;
		lengthOptions: NoteLength[];
		remainingInBar?: number;
		onChangeLength: (length: NoteLength) => void;
		onSetItemKind: (kind: 'note' | 'rest') => void;
		onSetFinger: (finger: number | undefined) => void;
	}

	type FingerOption = 'empty' | '0' | '1' | '2' | '3' | '4';

	const VIEWPORT_MARGIN = 8;
	const MENU_ARROW_GAP = 22;
	const ARROW_EDGE_PADDING = 16;

	let {
		x,
		y,
		selectedItem,
		lengthOptions,
		remainingInBar = Infinity,
		onChangeLength,
		onSetItemKind,
		onSetFinger
	}: Props = $props();

	let menuElement = $state<HTMLDivElement | null>(null);
	let menuLeft = $state(0);
	let menuTop = $state(0);
	let arrowLeft = $state(0);
	let showShortcutHints = $state(false);

	const isRestItem = $derived(selectedItem.note === null);
	const selectedFingerOption = $derived.by((): FingerOption => {
		if (isRestItem) return 'empty';
		if (selectedItem.finger === undefined) return 'empty';

		const effectiveFinger = selectedItem.finger;

		const normalized = Math.max(0, Math.min(4, effectiveFinger));
		return String(normalized) as FingerOption;
	});

	function getLengthGlyph(length: NoteLength): string {
		const glyphMap = isRestItem ? lengthRestMap : lengthToNoteMap;
		const direct = glyphMap[length];
		if (direct) return direct;

		if (length === 3) return `${glyphMap[2]}.`;
		if (length === 6) return `${glyphMap[4]}.`;
		if (length === 12) return `${glyphMap[8]}.`;

		return String(length);
	}

	function handleFingerChange(value: FingerOption) {
		onSetFinger(value === 'empty' ? undefined : Number(value));
	}

	function clamp(value: number, min: number, max: number): number {
		if (max < min) return min;
		return Math.min(Math.max(value, min), max);
	}

	function updateContextMenuPosition() {
		if (!menuElement || typeof window === 'undefined') return;

		const { width, height } = menuElement.getBoundingClientRect();
		const desiredLeft = x - width / 2;
		const desiredTop = y - height - MENU_ARROW_GAP;

		const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
		const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN);

		const clampedLeft = clamp(desiredLeft, VIEWPORT_MARGIN, maxLeft);
		const clampedTop = clamp(desiredTop, VIEWPORT_MARGIN, maxTop);
		const clampedArrowLeft = clamp(
			x - clampedLeft,
			ARROW_EDGE_PADDING,
			Math.max(ARROW_EDGE_PADDING, width - ARROW_EDGE_PADDING)
		);

		menuLeft = clampedLeft;
		menuTop = clampedTop;
		arrowLeft = clampedArrowLeft;
	}

	function queueContextMenuPositionUpdate(
		_note: string | null,
		_length: NoteLength,
		_finger: number | undefined,
		_lengthOptionCount: number,
		_remainingInBar: number,
		_anchorX: number,
		_anchorY: number
	) {
		void [_note, _length, _finger, _lengthOptionCount, _remainingInBar, _anchorX, _anchorY];
		requestAnimationFrame(() => {
			updateContextMenuPosition();
		});
	}

	$effect(() => {
		queueContextMenuPositionUpdate(
			selectedItem.note,
			selectedItem.length,
			selectedItem.finger,
			lengthOptions.length,
			remainingInBar,
			x,
			y
		);
	});

	onMount(() => {
		showShortcutHints = !isTouchDevice();
	});
</script>

<svelte:window onresize={updateContextMenuPosition} />

<div
	bind:this={menuElement}
	class="note-context-menu"
	style={`left: ${menuLeft}px; top: ${menuTop}px; --arrow-left: ${arrowLeft}px;`}
	role="presentation"
	onpointerdown={(event) => event.stopPropagation()}
>
	<div class="note-context-menu-lengths">
		{#each lengthOptions as length, index (length)}
			<button
				type="button"
				class="note-context-chip"
				class:is-active={selectedItem.length === length}
				disabled={length > remainingInBar}
				onclick={() => onChangeLength(length)}
				title={showShortcutHints ? `Shortcut: ${index + 1}` : undefined}
			>
				{#if showShortcutHints}
					<span class="shortcut">{index + 1}</span>
				{/if}
				<span class="note">{getLengthGlyph(length)}</span>
			</button>
		{/each}
	</div>
	<div class="note-context-menu-actions">
		<PillSelector
			options={[
				{ value: 'note', label: 'Note' },
				{ value: 'rest', label: 'Rest' }
			]}
			selected={isRestItem ? 'rest' : 'note'}
			onSelect={onSetItemKind}
			ariaLabel="Toggle note or rest"
		/>
		{#if showShortcutHints}
			<div class="note-context-shortcut-overlay" aria-hidden="true">
				<span class="shortcut">Space</span>
			</div>
		{/if}
	</div>
	{#if !isRestItem}
		<div class="note-context-menu-actions">
			<p class="mb-1! text-xs text-slate-500">Finger:</p>
			<PillSelector
				options={[
					{ value: 'empty', label: 'Empty' },
					{ value: '0', label: '0' },
					{ value: '1', label: '1' },
					{ value: '2', label: '2' },
					{ value: '3', label: '3' },
					{ value: '4', label: '4' }
				]}
				selected={selectedFingerOption}
				onSelect={handleFingerChange}
				ariaLabel="Set finger number"
			/>
			{#if showShortcutHints}
				<div class="note-context-shortcut-overlay-top" aria-hidden="true">
					<span class="shortcut">F</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.note-context-menu {
		position: fixed;
		z-index: 60;
		min-width: 280px;
		padding: 34px 10px 10px;
		border: 1px solid #cbd5e1;
		border-radius: 12px;
		background: #ffffff;
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.2);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.note-context-menu::after {
		content: '';
		position: absolute;
		left: var(--arrow-left, 50%);
		bottom: -7px;
		width: 12px;
		height: 12px;
		background: #ffffff;
		border-right: 1px solid #cbd5e1;
		border-bottom: 1px solid #cbd5e1;
		transform: translateX(-50%) rotate(45deg);
	}

	.note-context-menu-lengths {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 6px;
	}

	.note-context-chip {
		position: relative;
		padding: 3px 4px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.74rem;
		font-weight: 600;
		color: #334155;
		background: #f8fafc;
	}

	.note-context-chip :global(.note) {
		font-size: 1.35rem;
		line-height: 1;
	}

	.shortcut {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.15rem 0.4rem;
		border: 1px solid #cbd5e1;
		border-radius: 999px;
		background: #f8fafc;
		font-size: 0.62rem;
		line-height: 1.1;
		font-weight: 700;
		color: #64748b;
	}

	.note-context-chip .shortcut {
		position: absolute;
		top: 2px;
		right: 4px;
		padding: 0.05rem 0.3rem;
		font-size: 0.58rem;
	}

	.note-context-shortcut-overlay {
		position: absolute;
		top: 8px;
		right: 8px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		pointer-events: none;
	}

	.note-context-shortcut-overlay-top {
		position: absolute;
		top: 0px;
		right: 8px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		pointer-events: none;
	}

	.note-context-chip:hover:not(:disabled) {
		background: #e2e8f0;
	}

	.note-context-chip:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.note-context-chip.is-active {
		border-color: #22c55e;
		background: #dcfce7;
		color: #166534;
	}

	.note-context-menu-actions {
		position: relative;
		display: grid;
		grid-template-columns: 1fr;
		margin-top: 10px;
	}

	@media (max-width: 640px) {
		.note-context-menu {
			min-width: 240px;
		}

		.note-context-menu-lengths {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
