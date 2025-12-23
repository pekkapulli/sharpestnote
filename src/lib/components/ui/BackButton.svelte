<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		href: string;
		children: Snippet;
	}

	const { href, children }: Props = $props();
</script>

<a
	{href}
	class="inline-block rounded-lg bg-dark-blue px-3 py-1.5 text-sm font-semibold text-off-white transition hover:-translate-y-px hover:bg-slate-200 hover:shadow"
>
	{@render children()}
</a>

<style>
	a {
		background-color: var(--color-dark-blue);
		text-decoration: none;
	}

	a:visited {
		color: var(--color-off-white);
	}

	a:hover {
		background-color: var(--color-dark-blue-highlight);
		color: var(--color-off-white);
	}
</style>
