<script lang="ts">
	import type { Clef } from '$lib/config/types';
	import { staffLayouts } from '$lib/config/staffs';
	import type { KeySignature } from '$lib/config/keys';
	import ClefSymbol from './ClefSymbol.svelte';
	import KeySignatureSymbol from './KeySignature.svelte';

	interface Monster {
		id: number;
		x: number;
		y: number;
		speed: number;
	}

	interface Bullet {
		id: number;
		x: number;
		y: number;
	}

	interface Props {
		clef?: Clef;
		keySignature: KeySignature;
		width?: number;
		height?: number;
		spaceshipY: number;
		monsters: Monster[];
		bullets: Bullet[];
		gameActive: boolean;
	}

	const HEIGHT = 150;

	const {
		clef = 'treble',
		keySignature,
		width = 800,
		height = HEIGHT,
		spaceshipY,
		monsters,
		bullets,
		gameActive
	}: Props = $props();

	const layout = $derived(staffLayouts[clef] ?? staffLayouts.treble);
	const staffLines = $derived(layout.staffLines);
	const lineSpacing = $derived(height / 12);
	const centerY = $derived(height / 2);

	// Extended ledger lines for full visual range
	const ledgerLinePositions = [-3, -2, -1, 5, 6, 7];
</script>

<div class="relative w-full overflow-hidden rounded-lg border-2 border-slate-300 bg-white">
	<svg {width} {height} class="block">
		<!-- Staff lines -->
		{#each staffLines as line (line.position)}
			<line
				x1="0"
				y1={centerY - line.position * lineSpacing}
				x2={width}
				y2={centerY - line.position * lineSpacing}
				stroke="#333"
				stroke-width="1.5"
			/>
		{/each}

		<!-- Ledger lines (extended range) -->
		{#each ledgerLinePositions as pos}
			<line
				x1="90"
				y1={centerY - pos * lineSpacing}
				x2={width - 10}
				y2={centerY - pos * lineSpacing}
				stroke="#999"
				stroke-width="1"
				opacity="0.4"
			/>
		{/each}

		<!-- Key signature -->
		<KeySignatureSymbol {clef} {keySignature} {lineSpacing} {centerY} xStart={50} />

		<!-- Spaceship (on left side) -->
		{#if gameActive}
			<text
				x="100"
				y={spaceshipY}
				font-size={lineSpacing * 2}
				text-anchor="middle"
				dominant-baseline="middle">🚀</text
			>
		{/if}

		<!-- Bullets -->
		{#each bullets as bullet (bullet.id)}
			<circle cx={bullet.x} cy={bullet.y} r="3" fill="#ef4444" />
		{/each}

		<!-- Monsters -->
		{#each monsters as monster (monster.id)}
			<text
				x={monster.x}
				y={monster.y}
				font-size={lineSpacing * 2}
				text-anchor="middle"
				dominant-baseline="middle">👾</text
			>
		{/each}
	</svg>

	<!-- Clef symbol overlay -->
	<div
		class="absolute left-2 flex items-center justify-center overflow-visible"
		style="width: {lineSpacing * 2}px; height: 0; top: {centerY - lineSpacing * 2}px;"
	>
		<ClefSymbol {clef} size="{lineSpacing * 4}px" />
	</div>
</div>

<style>
	:global(svg) {
		overflow: visible;
	}
</style>
