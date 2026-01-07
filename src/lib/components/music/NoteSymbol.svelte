<script lang="ts">
	import { lengthNoteMap } from '$lib/config/melody';

	interface Props {
		x: number;
		y: number;
		accidental?: { symbol: string; yOffset: number } | null;
		length?: 1 | 2 | 4 | 8 | 16 | null;
		progress?: number | null;
		fill?: string;
		stroke?: string;
		strokeWidth?: number;
		opacity?: number;
		lineSpacing?: number;
	}

	const {
		x,
		y,
		accidental = null,
		length = null,
		progress = null,
		fill = 'black',
		stroke = 'none',
		strokeWidth = 0,
		opacity = 1,
		lineSpacing = 8
	}: Props = $props();
</script>

<g>
	<!-- Note symbol -->
	{#if length}
		<text
			class="note"
			{x}
			y={y + lineSpacing / 2}
			{fill}
			{opacity}
			font-size={lineSpacing * 4}
			text-anchor="middle"
		>
			{lengthNoteMap[length]}
		</text>
	{:else}
		<circle
			cx={x}
			cy={y}
			r={lineSpacing * 0.5}
			{fill}
			{stroke}
			stroke-width={strokeWidth}
			{opacity}
		/>
	{/if}
	{#if progress !== null && length !== null}
		<!-- Note hold duration indicator -->
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

	<!-- Accidental symbol if present -->
	{#if accidental}
		<text
			x={x - lineSpacing * 0.75}
			y={y + lineSpacing * 0.5 + accidental.yOffset}
			font-size={lineSpacing * 2}
			{fill}
			{opacity}
			class="note"
			text-anchor="end"
		>
			{accidental.symbol}
		</text>
	{/if}
</g>

<style>
	/* Smoothly animate color-related changes within this symbol */
	.note,
	circle {
		transition:
			fill 200ms ease,
			stroke 200ms ease,
			color 200ms ease,
			opacity 200ms ease;
	}
</style>
