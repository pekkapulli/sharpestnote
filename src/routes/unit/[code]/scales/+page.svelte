<script lang="ts">
	import BackButton from '$lib/components/ui/BackButton.svelte';
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import type { MelodyItem } from '$lib/config/melody';

	const { data } = $props();
	const { unit, code } = $derived(data);

	function newMelody(): MelodyItem[] {
		const scale = unit.scale.filter((s) => s.note != null) ?? [];
		if (scale.length === 0) return [];

		// Alternate between ascending and descending for variety
		const isAscending = Math.random() > 0.5;
		const sequence = isAscending ? scale : [...scale].reverse();

		// Return a deep copy to ensure reactivity
		return sequence.map((i) => ({ ...i }));
	}
</script>

<div class="min-h-screen bg-off-white py-8">
	<div class="mx-auto w-full max-w-5xl px-4">
		<nav class="mb-4">
			<BackButton href={`/unit/${code}`}>← Back to unit</BackButton>
		</nav>

		<SightGame
			instrument={unit.instrument}
			keyNote={unit.key}
			mode={unit.mode}
			tempoBPM={unit.tracks?.medium?.tempo ?? 100}
			{newMelody}
		/>
	</div>
</div>
