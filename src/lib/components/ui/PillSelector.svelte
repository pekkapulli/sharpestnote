<script lang="ts" generics="T extends string">
	import { onMount, onDestroy } from 'svelte';
	import Tooltip from './Tooltip.svelte';
	interface Props {
		options: { value: T; label: string; icon?: string; iconNegative?: string }[];
		selected: T;
		onSelect: (value: T) => void;
		ariaLabel?: string;
		iconOnly?: boolean;
	}

	let { options, selected, onSelect, ariaLabel, iconOnly }: Props = $props();

	let buttonRefs = $state<(HTMLButtonElement | null)[]>([]);
	let indicatorStyle = $state('');
	let containerElement: HTMLDivElement | null = $state(null);

	const selectedIndex = $derived(options.findIndex((opt) => opt.value === selected));

	let rafId = 0;
	function updateIndicatorNow() {
		if (selectedIndex >= 0 && buttonRefs[selectedIndex] && containerElement) {
			const selectedButton = buttonRefs[selectedIndex]!;
			const rect = selectedButton.getBoundingClientRect();
			const containerRect = containerElement.getBoundingClientRect();
			const left = rect.left - containerRect.left;
			const top = rect.top - containerRect.top;
			const width = rect.width;
			const height = rect.height;
			indicatorStyle = `width: ${width}px; height: ${height}px; transform: translate(${left}px, ${top}px)`;
		}
	}

	function updateIndicator() {
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(updateIndicatorNow);
	}

	let ro: ResizeObserver | undefined;
	function setupResizeObservers() {
		if (typeof ResizeObserver === 'undefined') return;
		if (!ro) ro = new ResizeObserver(() => updateIndicator());
		ro.disconnect();
		if (containerElement) ro.observe(containerElement);
		for (const btn of buttonRefs) if (btn) ro.observe(btn);
	}

	onMount(() => {
		updateIndicator();
		setupResizeObservers();
		if (typeof window !== 'undefined') {
			window.addEventListener('resize', updateIndicator);
			window.addEventListener('load', updateIndicator);
		}
		try {
			// @ts-ignore - FontFaceSet may not exist in all TS lib configs
			if (typeof document !== 'undefined' && (document as any).fonts) {
				// @ts-ignore
				(document as any).fonts.ready.then(() => updateIndicator());
				// @ts-ignore
				(document as any).fonts.addEventListener?.('loadingdone', updateIndicator);
			}
		} catch {}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', updateIndicator);
			window.removeEventListener('load', updateIndicator);
		}
		try {
			// @ts-ignore
			if (typeof document !== 'undefined' && (document as any).fonts) {
				// @ts-ignore
				(document as any).fonts.removeEventListener?.('loadingdone', updateIndicator);
			}
		} catch {}
		ro?.disconnect();
	});

	$effect(() => {
		// Track dependencies to recalc and re-observe
		void selectedIndex;
		void options.length;
		updateIndicator();
		setupResizeObservers();
	});

	function handleKeydown(event: KeyboardEvent, index: number) {
		let newIndex = index;

		switch (event.key) {
			case 'ArrowLeft':
			case 'ArrowUp':
				event.preventDefault();
				newIndex = index > 0 ? index - 1 : options.length - 1;
				break;
			case 'ArrowRight':
			case 'ArrowDown':
				event.preventDefault();
				newIndex = index < options.length - 1 ? index + 1 : 0;
				break;
			case 'Home':
				event.preventDefault();
				newIndex = 0;
				break;
			case 'End':
				event.preventDefault();
				newIndex = options.length - 1;
				break;
			default:
				return;
		}

		if (newIndex !== index) {
			onSelect(options[newIndex].value);
			buttonRefs[newIndex]?.focus();
		}
	}
</script>

<div
	class="pill-group"
	role="tablist"
	aria-label={ariaLabel || 'Options selector'}
	bind:this={containerElement}
>
	{#each options as option, index}
		{#if iconOnly && option.icon}
			<Tooltip text={option.label} position="top">
				<button
					bind:this={buttonRefs[index]}
					role="tab"
					aria-label={option.label}
					aria-selected={selected === option.value}
					tabindex={selected === option.value ? 0 : -1}
					class="pill-button {index === 0 ? 'pill-button-first' : ''} {index === options.length - 1
						? 'pill-button-last'
						: ''} {selected === option.value ? 'pill-active' : ''} {iconOnly
						? 'pill-icon-only'
						: ''}"
					onclick={() => onSelect(option.value)}
					onkeydown={(e) => handleKeydown(e, index)}
				>
					<img
						src={selected === option.value && option.iconNegative
							? option.iconNegative
							: option.icon}
						alt=""
						aria-hidden="true"
						class={`pill-icon ${
							selected === option.value && option.iconNegative ? 'pill-icon-negative' : ''
						}`}
					/>
				</button>
			</Tooltip>
		{:else}
			<button
				bind:this={buttonRefs[index]}
				role="tab"
				aria-label={option.label}
				aria-selected={selected === option.value}
				tabindex={selected === option.value ? 0 : -1}
				class="pill-button {index === 0 ? 'pill-button-first' : ''} {index === options.length - 1
					? 'pill-button-last'
					: ''} {selected === option.value ? 'pill-active' : ''} {iconOnly ? 'pill-icon-only' : ''}"
				onclick={() => onSelect(option.value)}
				onkeydown={(e) => handleKeydown(e, index)}
			>
				{#if iconOnly}
					<span class="pill-label">{option.label}</span>
				{:else}
					{#if option.icon}
						<img
							src={selected === option.value && option.iconNegative
								? option.iconNegative
								: option.icon}
							alt=""
							aria-hidden="true"
							class={`pill-icon ${
								selected === option.value && option.iconNegative ? 'pill-icon-negative' : ''
							}`}
						/>
					{/if}
					<span class="pill-label">{option.label}</span>
				{/if}
			</button>
		{/if}
	{/each}
	<div class="pill-indicator" style={indicatorStyle}></div>
</div>

<style>
	.pill-group {
		position: relative;
		display: inline-flex;
		background-color: rgb(255, 255, 255);
		border: 1px solid rgb(226 232 240);
		border-radius: 0.75rem;
		padding: 0.25rem;
		overflow: visible;
	}

	.pill-button {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 0;
		padding: 0.625rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgb(71 85 105);
		background: transparent;
		border: none;
		margin: 0;
		transition: color 200ms ease-in-out;
		cursor: pointer;
		z-index: 1;
		white-space: nowrap;
		outline: none;
	}

	.pill-button:focus-visible {
		outline: 2px solid var(--color-dark-blue);
		outline-offset: 2px;
	}

	.pill-button-first {
		border-top-left-radius: 0.5rem;
		border-bottom-left-radius: 0.5rem;
	}

	.pill-button-last {
		border-top-right-radius: 0.5rem;
		border-bottom-right-radius: 0.5rem;
	}

	.pill-button:hover {
		color: var(--color-dark-blue);
	}

	/* Tooltip styles are in Tooltip.svelte for icon-only labels */

	.pill-button.pill-icon-only {
		padding: 0.5rem;
		min-width: 2.25rem;
	}

	.pill-button.pill-icon-only {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.pill-button.pill-icon-only .pill-icon {
		margin-right: 0;
	}

	.pill-icon {
		width: 2.5rem;
		height: 1.5rem;
		vertical-align: -0.125rem;
		filter: none;
		transition:
			filter 150ms ease-in-out,
			opacity 150ms ease-in-out;
	}

	.pill-button.pill-active .pill-icon {
		/* For typical monochrome SVGs this will render them white */
		filter: brightness(0) invert(1);
	}

	.pill-button.pill-active .pill-icon-negative {
		filter: none;
	}

	.pill-button.pill-active {
		color: white;
	}

	.pill-indicator {
		position: absolute;
		top: 0;
		left: 0;
		background: linear-gradient(135deg, var(--color-dark-blue) 0%, #3d4f6b 100%);
		border-radius: 0.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		transition:
			transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
			width 300ms cubic-bezier(0.4, 0, 0.2, 1),
			height 300ms cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 0;
	}

	@media (max-width: 360px) {
		.pill-icon {
			width: 1em;
			height: 1em;
			flex: none;
			object-fit: contain;
			margin-right: 0.5rem;
			filter: none;
			transition:
				filter 150ms ease-in-out,
				opacity 150ms ease-in-out,
				transform 150ms ease-in-out;
		}

		.pill-button.pill-active .pill-icon {
			/* For typical monochrome SVGs this will render them white */
			filter: brightness(0) invert(1);
			transform: translateY(0);
		}

		.pill-button.pill-active .pill-icon-negative {
			filter: none;
		}

		.pill-button.pill-icon-only .pill-icon {
			margin-right: 0;
		}

		.pill-label {
			display: inline-block;
			line-height: 1;
			border-top-right-radius: 0;
		}
		.pill-button {
			flex: 0 0 auto;
			width: 100%;
		}
	}
</style>
