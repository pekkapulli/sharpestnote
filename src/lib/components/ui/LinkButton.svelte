<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		href: string;
		children: Snippet;
		size?: 'small' | 'medium' | 'large';
		color?: 'blue' | 'green';
		target?: string;
		fullWidth?: boolean;
	}

	const {
		href,
		children,
		size = 'small',
		color = 'blue',
		target,
		fullWidth = false
	}: Props = $props();
</script>

<a {href} {target} class="link-button-root {size} {color} {fullWidth ? 'block' : 'inline'}">
	{@render children()}
</a>

<style>
	.link-button-root {
		border-radius: 0.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		font-weight: 600;
		line-height: 1.2;
		text-decoration: none;
		color: var(--color-off-white);
		transition:
			transform 0.2s,
			box-shadow 0.2s,
			background-color 0.2s;
	}

	.link-button-root.block {
		width: 100%;
		text-align: center;
	}

	.link-button-root.large {
		font-size: var(--btn-font-lg);
		padding: var(--btn-pad-lg);
	}

	.link-button-root.medium {
		font-size: var(--btn-font-md);
		padding: var(--btn-pad-md);
	}

	.link-button-root.small {
		font-size: var(--btn-font-sm);
		padding: var(--btn-pad-sm);
	}

	.link-button-root:visited {
		color: var(--color-off-white);
	}

	.link-button-root.blue {
		background-color: var(--color-dark-blue);
		color: var(--color-off-white);
	}

	.link-button-root.blue:hover {
		background-color: var(--color-dark-blue-highlight);
		color: var(--color-off-white);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.link-button-root.green {
		background-color: var(--color-brand-green);
		color: var(--color-off-white);
	}

	.link-button-root.green:hover {
		background-color: var(--color-brand-green-highlight);
		color: var(--color-off-white);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}
</style>
