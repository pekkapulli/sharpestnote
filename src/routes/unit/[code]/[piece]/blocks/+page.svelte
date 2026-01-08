<script lang="ts">
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import type { MelodyItem } from '$lib/config/melody';
	import blocksIcon from '$lib/assets/blocks_icon.png';
	import TitleWithIcon from '$lib/components/ui/TitleWithIcon.svelte';
	import { sharePreviewStore } from '$lib/stores/sharePreview';
	import { onMount } from 'svelte';

	const { data } = $props();
	const { unit, piece, imageUrl, pageUrl } = $derived(data);

	onMount(() => {
		sharePreviewStore.set({
			title: `Blocks - ${piece.label} - ${unit.title}`,
			description: `Practice blocks game for ${piece.label}`,
			image: imageUrl,
			url: pageUrl
		});
	});

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
		<TitleWithIcon title="Blocks" iconUrl={blocksIcon} />
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
