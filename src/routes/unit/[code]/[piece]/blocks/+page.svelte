<script lang="ts">
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import type { MelodyItem } from '$lib/config/melody';

	const { data } = $props();
	const { unit, piece, code, pieceCode } = $derived(data);

	function newMelody(): MelodyItem[] {
		const pool = piece.melody?.filter((m) => Array.isArray(m) && m.length > 0) ?? [];
		if (pool.length === 0) return [];
		const index = Math.floor(Math.random() * pool.length);
		const phrase = pool[index] ?? [];
		// Return a deep copy to ensure reactivity when the same phrase repeats
		return phrase.map((i) => ({ ...i }));
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
			tempoBPM={piece.tracks?.medium?.tempo ?? 100}
			barLength={piece.barLength}
			{newMelody}
		/>
	</div>
</div>
