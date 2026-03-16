<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		onclick?: (event: MouseEvent) => void;
		type?: 'button' | 'submit' | 'reset';
		size?: 'small' | 'medium' | 'large';
		variant?: 'solid' | 'secondary';
		color?: 'blue' | 'green' | 'secondary';
		disabled?: boolean;
		fullWidth?: boolean;
		title?: string;
		ariaLabel?: string;
		ariaControls?: string;
		ariaHaspopup?: 'menu' | 'listbox' | 'dialog' | 'tree' | 'grid' | 'true' | 'false';
		opened: boolean;
		className?: string;
	}

	const {
		children,
		onclick,
		type = 'button',
		size = 'small',
		variant = 'solid',
		color = 'blue',
		disabled = false,
		fullWidth = false,
		title,
		ariaLabel,
		ariaControls,
		ariaHaspopup = 'menu',
		opened,
		className = ''
	}: Props = $props();

	const resolvedVariant = $derived(color === 'secondary' ? 'secondary' : variant);
	const resolvedColor = $derived(color === 'secondary' ? 'blue' : color);
</script>

<button
	{type}
	{disabled}
	{title}
	{onclick}
	aria-label={ariaLabel}
	aria-controls={ariaControls}
	aria-haspopup={ariaHaspopup}
	aria-expanded={opened}
	class={`openable-button-root ${size} ${resolvedVariant} ${resolvedColor} ${fullWidth ? 'block' : 'inline'} ${className}`}
>
	<span class="openable-button-label">{@render children()}</span>
	<span class={`openable-button-arrow ${opened ? 'open' : ''}`} aria-hidden="true">▾</span>
</button>

<style>
	.openable-button-root {
		border: none;
		border-radius: 0.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		font-weight: 600;
		line-height: 1.2;
		text-decoration: none;
		color: var(--color-off-white);
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s,
			background-color 0.2s;
	}

	.openable-button-root.block {
		width: 100%;
		text-align: center;
	}

	.openable-button-root.large {
		font-size: 1.125rem;
		padding: 0.75rem;
	}

	.openable-button-root.medium {
		font-size: 1rem;
		padding: 0.5rem;
	}

	.openable-button-root.small {
		font-size: 0.875rem;
		padding: 0.25rem 0.5rem;
	}

	.openable-button-root.solid.blue {
		background-color: var(--color-dark-blue);
		color: var(--color-off-white);
	}

	.openable-button-root.solid.blue:hover:not(:disabled) {
		background-color: var(--color-dark-blue-highlight);
		color: var(--color-off-white);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.openable-button-root.solid.green {
		background-color: var(--color-brand-green);
		color: var(--color-off-white);
	}

	.openable-button-root.solid.green:hover:not(:disabled) {
		background-color: var(--color-brand-green-highlight);
		color: var(--color-off-white);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.openable-button-root.secondary {
		background-color: #f8fafc;
		border: 1px solid #cbd5e1;
	}

	.openable-button-root.secondary.blue {
		color: var(--color-dark-blue);
	}

	.openable-button-root.secondary.green {
		color: #166534;
	}

	.openable-button-root.secondary:hover:not(:disabled) {
		background-color: #f1f5f9;
		border-color: #94a3b8;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(15, 23, 42, 0.1);
	}

	.openable-button-root.secondary.blue:hover:not(:disabled) {
		color: var(--color-dark-blue-highlight);
	}

	.openable-button-root.secondary.green:hover:not(:disabled) {
		color: var(--color-brand-green-highlight);
	}

	.openable-button-label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.openable-button-arrow {
		display: inline-block;
		font-size: 0.8em;
		transition: transform 0.15s ease;
	}

	.openable-button-arrow.open {
		transform: rotate(180deg);
	}

	.openable-button-root:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}
</style>
