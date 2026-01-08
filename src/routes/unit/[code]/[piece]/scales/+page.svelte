<script lang="ts">
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import TitleWithIcon from '$lib/components/ui/TitleWithIcon.svelte';
	import type { MelodyItem } from '$lib/config/melody';
	import scalesIcon from '$lib/assets/scales_icon.png';
	import { sharePreviewStore } from '$lib/stores/sharePreview';
	import { onMount } from 'svelte';

	const { data } = $props();
	const { unit, piece, imageUrl, pageUrl } = $derived(data);

	onMount(() => {
		sharePreviewStore.set({
			title: `Scales - ${piece.label} - ${unit.title}`,
			description: `Practice scales for ${piece.label}`,
			image: imageUrl,
			url: pageUrl
		});
	});

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
		<TitleWithIcon title="Scales" iconUrl={scalesIcon} />
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
