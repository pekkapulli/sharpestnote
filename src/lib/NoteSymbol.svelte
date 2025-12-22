<script lang="ts">
	interface Props {
		x: number;
		y: number;
		accidental?: { symbol: string; yOffset: number } | null;
		fill?: string;
		stroke?: string;
		strokeWidth?: number;
		opacity?: number;
		lineSpacing?: number;
		cents?: number;
	}

	const {
		x,
		y,
		accidental = null,
		fill = 'black',
		stroke = 'none',
		strokeWidth = 0,
		opacity = 1,
		lineSpacing = 8
	}: Props = $props();
</script>

<g>
	<!-- Note head circle -->
	<circle
		cx={x}
		cy={y}
		r={lineSpacing * 0.5}
		{fill}
		{stroke}
		stroke-width={strokeWidth}
		{opacity}
	/>

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
	.note {
		user-select: none;
	}
</style>
