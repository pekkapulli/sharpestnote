<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		href: string;
		children: Snippet;
		size?: 'small' | 'medium' | 'large';
		color?: 'blue' | 'green';
	}

	const { href, children, size = 'small', color = 'blue' }: Props = $props();
</script>

<a
	{href}
	class="{size} {color} inline-block rounded-lg px-3 text-sm font-semibold text-off-white transition hover:-translate-y-px hover:shadow"
>
	{@render children()}
</a>

<style>
	a {
		text-decoration: none;
		color: var(--color-off-white);
	}

	a.large {
		font-size: 1.125rem;
		padding: 0.75rem;
	}

	a.medium {
		font-size: 1rem;
		padding: 0.5rem;
	}

	a.small {
		font-size: 0.875rem;
		padding: 0.25rem 0.5rem;
	}

	a:visited {
		color: var(--color-off-white);
	}

	a.blue {
		background-color: var(--color-dark-blue);
	}

	a.blue:hover {
		background-color: var(--color-dark-blue-highlight);
		color: var(--color-off-white);
	}

	a.green {
		background-color: var(--color-brand-green);
	}

	a.green:hover {
		background-color: var(--color-brand-green-highlight);
		color: var(--color-off-white);
	}
</style>
