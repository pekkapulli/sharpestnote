<script lang="ts">
	import { type MelodyItem } from '$lib/config/melody';

	interface Props {
		item: MelodyItem;
		x: number;
		y: number;
		lineSpacing: number;
	}

	let { item, x, y, lineSpacing }: Props = $props();

	const annotationText = $derived.by(() => {
		const value = item.text?.trim();
		return value ? value : null;
	});
</script>

{#if annotationText}
	<text
		{x}
		{y}
		fill="#334155"
		font-size={lineSpacing * 1.2}
		font-family="var(--font-serif, 'Spectral', serif)"
		font-style="italic"
		text-anchor="start"
	>
		{annotationText}
	</text>
{/if}
