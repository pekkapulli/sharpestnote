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
		cents?: number | null;
	}

	const {
		x,
		y,
		accidental = null,
		fill = '#6b7280',
		stroke = 'none',
		strokeWidth = 0,
		opacity = 0.6,
		lineSpacing = 8,
		cents = null
	}: Props = $props();
</script>

<g>
	<!-- Cents deviation line -->
	<!-- {#if cents !== null}
		<line
			x1={x}
			y1={y}
			x2={x + lineSpacing * 2}
			y2={y + (cents / 10) * lineSpacing}
			stroke={Math.abs(cents) < 10 ? '#22c55e' : Math.abs(cents) < 25 ? '#fb923c' : '#ef4444'}
			stroke-width={lineSpacing / 8}
		/>
	{/if} -->

	<!-- Ghost note head circle -->
	<circle
		cx={x}
		cy={y - (cents !== null ? (cents / 50) * (lineSpacing / 2) : 0)}
		r={lineSpacing * 0.5}
		{fill}
		{stroke}
		stroke-width={strokeWidth}
		opacity={opacity * (cents !== null ? 1 - Math.abs(cents) / 100 : 1)}
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
