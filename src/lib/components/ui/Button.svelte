<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		onclick?: (event: MouseEvent) => void;
		type?: 'button' | 'submit' | 'reset';
		size?: 'small' | 'medium' | 'large';
		color?: 'blue' | 'green';
		disabled?: boolean;
		fullWidth?: boolean;
		title?: string;
		ariaLabel?: string;
	}

	const {
		children,
		onclick,
		type = 'button',
		size = 'small',
		color = 'blue',
		disabled = false,
		fullWidth = false,
		title,
		ariaLabel
	}: Props = $props();
</script>

<button
	{type}
	{disabled}
	{title}
	{onclick}
	aria-label={ariaLabel}
	class={`button-root ${size} ${color} ${fullWidth ? 'block' : 'inline'}`}
>
	{@render children()}
</button>

<style>
	.button-root {
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

	.button-root.block {
		width: 100%;
		text-align: center;
	}

	.button-root.large {
		font-size: 1.125rem;
		padding: 0.75rem;
	}

	.button-root.medium {
		font-size: 1rem;
		padding: 0.5rem;
	}

	.button-root.small {
		font-size: 0.875rem;
		padding: 0.25rem 0.5rem;
	}

	.button-root.blue {
		background-color: var(--color-dark-blue);
	}

	.button-root.blue:hover:not(:disabled) {
		background-color: var(--color-dark-blue-highlight);
		color: var(--color-off-white);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.button-root.green {
		background-color: var(--color-brand-green);
	}

	.button-root.green:hover:not(:disabled) {
		background-color: var(--color-brand-green-highlight);
		color: var(--color-off-white);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.button-root:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}
</style>
