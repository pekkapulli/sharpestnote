<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { getOpenStringsForInstrument } from './gameState.svelte';
	import GameContent from './GameContent.svelte';

	let { instrument = 'guitar' } = $props();

	const NUM_LANES = $derived(getOpenStringsForInstrument(instrument).length || 6);
</script>

<Canvas>
	<GameContent {instrument} numLanes={NUM_LANES} />
</Canvas>
