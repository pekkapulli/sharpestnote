<script lang="ts" generics="T extends string">
	import { onMount, onDestroy } from 'svelte';
	interface Props {
		options: { value: T; label: string }[];
		selected: T;
		onSelect: (value: T) => void;
		ariaLabel?: string;
	}

	let { options, selected, onSelect, ariaLabel }: Props = $props();

	let buttonRefs: (HTMLButtonElement | null)[] = [];
	let indicatorStyle = $state('');

	const selectedIndex = $derived(options.findIndex((opt) => opt.value === selected));

	let rafId = 0;
	function updateIndicatorNow() {
		if (selectedIndex >= 0 && buttonRefs[selectedIndex]) {
			const selectedButton = buttonRefs[selectedIndex]!;
			const rect = selectedButton.getBoundingClientRect();
			const containerRect = selectedButton.parentElement?.getBoundingClientRect();
			if (containerRect) {
				const left = rect.left - containerRect.left;
				const top = rect.top - containerRect.top;
				const width = rect.width;
				const height = rect.height;
				indicatorStyle = `width: ${width}px; height: ${height}px; transform: translate(${left}px, ${top}px)`;
			}
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
		const container = buttonRefs[0]?.parentElement as HTMLElement | undefined;
		if (container) ro.observe(container);
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

<div class="pill-group" role="tablist" aria-label={ariaLabel || 'Options selector'}>
	{#each options as option, index}
		<button
			bind:this={buttonRefs[index]}
			role="tab"
			aria-selected={selected === option.value}
			tabindex={selected === option.value ? 0 : -1}
			class="pill-button {index === 0 ? 'pill-button-first' : ''} {index === options.length - 1
				? 'pill-button-last'
				: ''} {selected === option.value ? 'pill-active' : ''}"
			onclick={() => onSelect(option.value)}
			onkeydown={(e) => handleKeydown(e, index)}
		>
			{option.label}
		</button>
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
		overflow: hidden;
	}

	.pill-button {
		position: relative;
		flex: 1;
		padding: 0.625rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgb(71 85 105);
		background: transparent;
		border: none;
		margin: 0;
		text-align: center;
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
		.pill-group {
			flex-direction: column;
			width: 100%;
		}

		.pill-button-first {
			border-top-left-radius: 0.5rem;
			border-top-right-radius: 0.5rem;
			border-bottom-left-radius: 0;
		}
		.pill-button-last {
			border-bottom-left-radius: 0.5rem;
			border-bottom-right-radius: 0.5rem;
			border-top-right-radius: 0;
		}
		.pill-button {
			flex: 0 0 auto;
			width: 100%;
		}
	}
</style>
