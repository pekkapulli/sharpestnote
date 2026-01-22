<script lang="ts">
	import { COLORSTRINGS_MAP, type MelodyItem } from '$lib/config/melody';

	interface Props {
		item: MelodyItem;
		x: number;
		y: number;
		lineSpacing: number;
	}

	let { item, x, y, lineSpacing }: Props = $props();

	const hasFinger = $derived(item.finger !== undefined);
	const hasString = $derived(item.string !== undefined);
	const stringColor = $derived(item.string ? COLORSTRINGS_MAP[item.string] : null);

	const underlineY = $derived(y + lineSpacing * 0.3);
	const underlineLength = $derived(lineSpacing * 1.5);
</script>

{#if hasFinger || hasString}
	<g>
		<!-- Finger text (if present) -->
		{#if hasFinger}
			<text
				{x}
				{y}
				fill="#333"
				font-size={lineSpacing * 1.5}
				text-anchor="middle"
				font-weight="500"
			>
				{item.finger}
			</text>
		{/if}

		<!-- String underline (if present) -->
		<!-- {#if hasString && stringColor}
			<line
				x1={x - underlineLength / 2}
				x2={x + underlineLength / 2}
				y1={underlineY}
				y2={underlineY}
				stroke={stringColor}
				stroke-width={lineSpacing * 0.4}
				stroke-linecap="round"
			/>
		{/if} -->
	</g>
{/if}
