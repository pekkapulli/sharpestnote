<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	interface Props {
		x: number;
		y: number;
		menuClass?: string;
		onRequestScrollIntoView?: (deltaY: number) => void;
		children?: Snippet;
	}

	const VIEWPORT_MARGIN = 8;
	const MENU_ARROW_GAP = 22;
	const ARROW_EDGE_PADDING = 16;

	let { x, y, menuClass = '', onRequestScrollIntoView, children }: Props = $props();

	let menuElement = $state<HTMLDivElement | null>(null);
	let menuLeft = $state(0);
	let menuTop = $state(0);
	let arrowLeft = $state(0);
	let pendingFrame = 0;

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

	function schedulePositionUpdate() {
		if (pendingFrame || typeof window === 'undefined') return;

		pendingFrame = window.requestAnimationFrame(() => {
			pendingFrame = 0;
			updateContextMenuPosition();
		});
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

	$effect(() => {
		void [x, y];
		schedulePositionUpdate();
	});

	$effect(() => {
		if (!menuElement || typeof ResizeObserver === 'undefined') return;

		const resizeObserver = new ResizeObserver(() => {
			schedulePositionUpdate();
		});

		resizeObserver.observe(menuElement);

		return () => {
			resizeObserver.disconnect();
		};
	});

	onMount(() => {
		schedulePositionUpdate();

		return () => {
			if (pendingFrame) {
				window.cancelAnimationFrame(pendingFrame);
			}
		};
	});
</script>

<svelte:window onresize={schedulePositionUpdate} />

<div
	bind:this={menuElement}
	class={`composer-context-menu-shell ${menuClass}`}
	style={`left: ${menuLeft}px; top: ${menuTop}px; --arrow-left: ${arrowLeft}px;`}
	role="presentation"
	onpointerdown={(event) => event.stopPropagation()}
>
	{@render children?.()}
</div>

<style>
	.composer-context-menu-shell {
		position: fixed;
		z-index: 60;
		border: 1px solid #cbd5e1;
		border-radius: 12px;
		background: #ffffff;
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.2);
	}

	.composer-context-menu-shell::after {
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
</style>
