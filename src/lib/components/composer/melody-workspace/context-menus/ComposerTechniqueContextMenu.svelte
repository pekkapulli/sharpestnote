<script lang="ts">
	import { onMount } from 'svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import type { MelodyItem } from '$lib/config/melody';
	import { isTouchDevice } from '$lib/util/isTouchDevice';

	interface Props {
		x: number;
		y: number;
		selectedItem: MelodyItem;
		onSetFinger: (finger: number | undefined) => void;
		onRequestScrollIntoView?: (deltaY: number) => void;
	}

	type FingerOption = 'empty' | '0' | '1' | '2' | '3' | '4';

	const VIEWPORT_MARGIN = 8;
	const MENU_ARROW_GAP = 22;
	const ARROW_EDGE_PADDING = 16;

	let { x, y, selectedItem, onSetFinger, onRequestScrollIntoView }: Props = $props();

	let menuElement = $state<HTMLDivElement | null>(null);
	let menuLeft = $state(0);
	let menuTop = $state(0);
	let arrowLeft = $state(0);
	let showShortcutHints = $state(false);

	const isRestItem = $derived(selectedItem.note === null);
	const selectedFingerOption = $derived.by((): FingerOption => {
		if (isRestItem) return 'empty';
		if (selectedItem.finger === undefined) return 'empty';

		const normalized = Math.max(0, Math.min(4, selectedItem.finger));
		return String(normalized) as FingerOption;
	});

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

		const clampedLeft = clamp(desiredLeft, VIEWPORT_MARGIN, maxLeft);
		const clampedArrowLeft = clamp(
			x - clampedLeft,
			ARROW_EDGE_PADDING,
			Math.max(ARROW_EDGE_PADDING, width - ARROW_EDGE_PADDING)
		);

		menuLeft = clampedLeft;
		menuTop = desiredTop;
		arrowLeft = clampedArrowLeft;
	}

	export function scrollIntoViewIfNeeded() {
		if (!menuElement || !onRequestScrollIntoView || typeof window === 'undefined') return;

		const rect = menuElement.getBoundingClientRect();
		const hiddenTop = VIEWPORT_MARGIN - rect.top;
		const hiddenBottom = rect.bottom - (window.innerHeight - VIEWPORT_MARGIN);

		if (hiddenTop > 0) {
			onRequestScrollIntoView(-Math.ceil(hiddenTop));
		} else if (hiddenBottom > 0) {
			onRequestScrollIntoView(Math.ceil(hiddenBottom));
		}
	}

	function queueContextMenuPositionUpdate(
		_note: string | null,
		_finger: number | undefined,
		_anchorX: number,
		_anchorY: number
	) {
		void [_note, _finger, _anchorX, _anchorY];
		requestAnimationFrame(() => {
			updateContextMenuPosition();
		});
	}

	$effect(() => {
		queueContextMenuPositionUpdate(selectedItem.note, selectedItem.finger, x, y);
	});

	onMount(() => {
		showShortcutHints = !isTouchDevice();
	});
</script>

<svelte:window onresize={updateContextMenuPosition} />

<div
	bind:this={menuElement}
	class="technique-context-menu"
	style={`left: ${menuLeft}px; top: ${menuTop}px; --arrow-left: ${arrowLeft}px;`}
	role="presentation"
	onpointerdown={(event) => event.stopPropagation()}
>
	{#if isRestItem}
		<p class="technique-context-info">Finger marking applies to notes only.</p>
	{:else}
		<div class="technique-context-actions">
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
				<div class="technique-context-shortcut" aria-hidden="true">
					<span class="shortcut">F</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.technique-context-menu {
		position: fixed;
		z-index: 60;
		min-width: 280px;
		padding: 12px;
		border: 1px solid #cbd5e1;
		border-radius: 12px;
		background: #ffffff;
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.2);
	}

	.technique-context-menu::after {
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

	.technique-context-actions {
		position: relative;
	}

	.technique-context-shortcut {
		position: absolute;
		top: 0;
		right: 8px;
		display: inline-flex;
		pointer-events: none;
	}

	.technique-context-info {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 500;
		color: #64748b;
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

	@media (max-width: 640px) {
		.technique-context-menu {
			min-width: 240px;
		}
	}
</style>
