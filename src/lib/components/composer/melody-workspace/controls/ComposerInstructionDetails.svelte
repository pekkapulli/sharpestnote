<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, children }: { title: string; children?: Snippet } = $props();
</script>

<details class="mt-2 text-sm text-slate-600">
	<summary class="cursor-pointer font-medium text-slate-500 hover:text-slate-700">{title}</summary>
	<div class="mt-2">
		{@render children?.()}
	</div>
</details>
