<script lang="ts">
	import { lengthRestMap } from '$lib/config/melody';

	interface Props {
		x: number;
		y: number;
		length?: 1 | 2 | 4 | 8 | 16 | null;
		progress?: number | null;
		fill?: string;
		opacity?: number;
		lineSpacing?: number;
	}

	const {
		x,
		y,
		length = null,
		progress = null,
		fill = 'black',
		opacity = 1,
		lineSpacing = 8
	}: Props = $props();
</script>

<g>
	{#if length !== null}
		<text class="note" {x} {y} {fill} {opacity} font-size={lineSpacing * 4} text-anchor="middle">
			{lengthRestMap[length]}
		</text>
	{/if}
	{#if progress !== null && length !== null}
		<!-- Rest hold duration indicator -->
		<rect
			class="note"
			x={x - lineSpacing}
			y={y + lineSpacing}
			width={Math.min((progress / length) * lineSpacing * 2, lineSpacing * 2)}
			height={lineSpacing / 4}
			{fill}
			font-size={lineSpacing * 1.5}
			text-anchor="middle"
		/>
	{/if}
</g>

<style>
	/* Smoothly animate color-related changes within this symbol */
	.note,
	rect {
		transition:
			fill 200ms ease,
			opacity 200ms ease,
			color 200ms ease;
	}
</style>
