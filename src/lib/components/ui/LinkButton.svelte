<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		href: string;
		children: Snippet;
		size?: 'small' | 'medium' | 'large';
	}

	const { href, children, size = 'small' }: Props = $props();
</script>

<a
	{href}
	class="{size} inline-block rounded-lg bg-dark-blue px-3 text-sm font-semibold text-off-white transition hover:-translate-y-px hover:bg-slate-200 hover:shadow"
>
	{@render children()}
</a>

<style>
	a {
		background-color: var(--color-dark-blue);
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

	a:hover {
		background-color: var(--color-dark-blue-highlight);
		color: var(--color-off-white);
	}
</style>
