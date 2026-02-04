<script lang="ts">
	import { onMount } from 'svelte';

	let {
		text,
		position = 'top',
		children
	}: { text: string; position: 'top' | 'bottom' | 'left' | 'right'; children?: any } = $props();

	let showTooltip = $state(false);
	let isVisible = $state(false);
	let tooltipElement: HTMLDivElement | null = $state(null);
	let triggerElement: HTMLElement | null = $state(null);
	let touchTimeout: number | undefined = $state(undefined);
	let showTimeout: number | undefined = $state(undefined);

	function handleMouseEnter() {
		showTooltip = true;
		// Small delay to allow DOM to render before showing
		showTimeout = window.setTimeout(() => {
			isVisible = true;
		}, 10);
	}

	function handleMouseLeave() {
		showTooltip = false;
		isVisible = false;
		if (showTimeout) {
			clearTimeout(showTimeout);
		}
	}

	function handleTouchStart() {
		showTooltip = true;
		// Small delay before showing
		showTimeout = window.setTimeout(() => {
			isVisible = true;
		}, 10);
		// Auto-hide after 2 seconds on touch
		touchTimeout = window.setTimeout(() => {
			showTooltip = false;
			isVisible = false;
		}, 2000);
	}

	function handleTouchEnd() {
		if (touchTimeout) {
			clearTimeout(touchTimeout);
		}
	}

	onMount(() => {
		return () => {
			if (touchTimeout) {
				clearTimeout(touchTimeout);
			}
			if (showTimeout) {
				clearTimeout(showTimeout);
			}
		};
	});
</script>

<div
	class="tooltip-wrapper"
	bind:this={triggerElement}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	role="button"
	tabindex="0"
>
	{@render children?.()}
	{#if showTooltip}
		<div
			class="tooltip {position}"
			class:visible={isVisible}
			bind:this={tooltipElement}
			role="tooltip"
		>
			{text}
		</div>
	{/if}
</div>

<style>
	.tooltip-wrapper {
		position: relative;
		display: inline-block;
	}

	.tooltip {
		position: absolute;
		background-color: var(--color-dark-blue);
		color: white;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
		white-space: normal;
		z-index: 1000;
		pointer-events: none;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		opacity: 0;
		transform: scale(0.95);
		transition:
			opacity 0.2s ease-out,
			transform 0.2s ease-out;
		max-width: 300px;
		min-width: 100px;
		text-align: center;
	}

	.tooltip.visible {
		opacity: 1;
		transform: scale(1);
	}

	.tooltip.top {
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip.bottom {
		top: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip.left {
		right: calc(100% + 8px);
		top: 50%;
		transform: translateY(-50%);
	}

	.tooltip.right {
		left: calc(100% + 8px);
		top: 50%;
		transform: translateY(-50%);
	}

	/* Arrow indicators */
	.tooltip::after {
		content: '';
		position: absolute;
		width: 0;
		height: 0;
		border: 6px solid transparent;
	}

	.tooltip.top::after {
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border-top-color: rgba(30, 30, 30, 0.95);
	}

	.tooltip.bottom::after {
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border-bottom-color: rgba(30, 30, 30, 0.95);
	}

	.tooltip.left::after {
		left: 100%;
		top: 50%;
		transform: translateY(-50%);
		border-left-color: rgba(30, 30, 30, 0.95);
	}

	.tooltip.right::after {
		right: 100%;
		top: 50%;
		transform: translateY(-50%);
		border-right-color: rgba(30, 30, 30, 0.95);
	}
</style>
