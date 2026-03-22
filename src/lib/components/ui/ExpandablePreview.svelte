<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Content shown in both collapsed and expanded states */
		children: Snippet;
		/** Label for the expand button */
		expandLabel?: string;
		/** Label for the collapse button */
		collapseLabel?: string;
		/** Whether the preview starts expanded */
		expanded?: boolean;
		/** Max height in px for the collapsed teaser */
		collapsedHeight?: number;
	}

	let {
		children,
		expandLabel = 'Show full piece',
		collapseLabel = 'Hide',
		expanded = $bindable(false),
		collapsedHeight = 140
	}: Props = $props();

	let contentEl = $state<HTMLDivElement>(undefined!);
	let showFade = $state(!expanded);
	let maxHeight = $state<string | null>(null);
	let transitioning = $state(false);

	// Initialize max-height on first render
	$effect(() => {
		if (!transitioning && !expanded) {
			maxHeight = `${collapsedHeight}px`;
		}
	});

	function toggle() {
		if (transitioning) return;

		const fullHeight = contentEl.scrollHeight;

		if (!expanded) {
			// Expand: snap to collapsed height, then animate to full
			maxHeight = `${collapsedHeight}px`;
			transitioning = true;
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					maxHeight = `${fullHeight}px`;
					showFade = false;
					expanded = true;
				});
			});
		} else {
			// Collapse: snap to current full height, then animate to collapsed
			maxHeight = `${fullHeight}px`;
			transitioning = true;
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					maxHeight = `${collapsedHeight}px`;
					showFade = true;
					expanded = false;
				});
			});
		}
	}

	function onTransitionEnd(e: TransitionEvent) {
		if (e.propertyName === 'max-height') {
			transitioning = false;
			if (expanded) {
				// Remove max-height so content reflows naturally
				maxHeight = null;
			}
		}
	}
</script>

<div class="expandable-preview" class:expanded>
	<div
		bind:this={contentEl}
		class="preview-content"
		style:max-height={maxHeight}
		ontransitionend={onTransitionEnd}
	>
		{@render children()}
	</div>

	<div class="fade-overlay" class:fade-hidden={!showFade}></div>

	<button class="toggle-button" class:over-fade={!expanded} onclick={toggle}>
		{#if expanded}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="18 15 12 9 6 15"></polyline>
			</svg>
			{collapseLabel}
		{:else}
			{expandLabel}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="6 9 12 15 18 9"></polyline>
			</svg>
		{/if}
	</button>
</div>

<style>
	.expandable-preview {
		position: relative;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		background: #fff;
		overflow: hidden;
	}

	.expandable-preview.expanded {
		border-color: #cbd5e1;
	}

	.preview-content {
		overflow: hidden;
		padding: 1rem;
		transition: max-height 0.4s ease;
	}

	.fade-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		top: 0;
		background: linear-gradient(
			to bottom,
			rgba(255, 255, 255, 0) 40%,
			rgba(255, 255, 255, 0.85) 60%,
			rgba(255, 255, 255, 1) 100%
		);
		pointer-events: none;
		opacity: 1;
		transition: opacity 0.3s ease;
	}

	.fade-overlay.fade-hidden {
		opacity: 0;
	}

	.toggle-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		width: 100%;
		padding: 0.5rem 0;
		border: none;
		border-top: 1px solid #e2e8f0;
		background: #f8fafc;
		color: #2563eb;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}

	.toggle-button.over-fade {
		position: relative;
		z-index: 1;
		border-top: none;
		background: transparent;
	}

	.toggle-button:hover {
		color: #1d4ed8;
		background: #f1f5f9;
	}

	.toggle-button.over-fade:hover {
		background: rgba(241, 245, 249, 0.8);
	}
</style>
