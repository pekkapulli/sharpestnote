<script lang="ts">
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import type { MelodyItem } from '$lib/config/melody';

	const { data } = $props();
	const { unit, piece, code, pieceCode } = $derived(data);

	function newMelody(): MelodyItem[] {
		const scale = piece.scale.filter((s) => s.note != null) ?? [];
		if (scale.length === 0) return [];

		// Alternate between ascending and descending for variety
		const isAscending = Math.random() > 0.5;
		const sequence = isAscending ? scale : [...scale].reverse();

		// Return a deep copy to ensure reactivity
		return sequence.map((i) => ({ ...i }));
	}
</script>

<div class="min-h-screen bg-off-white py-8">
	<div class="mx-auto w-full max-w-5xl px-0 sm:px-4">
		<nav class="mb-4">
			<LinkButton href={`/unit/${code}/${pieceCode}`}>← Back to piece</LinkButton>
		</nav>

		<SightGame
			instrument={unit.instrument}
			keyNote={piece.key}
			mode={piece.mode}
			tempoBPM={piece.tracks?.fast?.tempo ?? 100}
			{newMelody}
			barLength={piece.barLength}
		/>
	</div>
</div>
