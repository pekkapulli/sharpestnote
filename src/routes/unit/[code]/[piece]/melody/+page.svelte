<script lang="ts">
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import { initUnitKeyAccess } from '$lib/util/initUnitKeyAccess';
	import type { MelodyItem } from '$lib/config/melody';

	const { data } = $props();
	const { unit, piece, code, pieceCode } = $derived(data);
	let hasKeyAccess = $state(false);
	let melodyIndex = $state(0);

	$effect(() => {
		// Initialize key access from URL or localStorage
		hasKeyAccess = initUnitKeyAccess(code, unit.keyCode);
	});

	function newMelody(): MelodyItem[] {
		const pool = piece.melody?.filter((m) => Array.isArray(m) && m.length > 0) ?? [];
		if (pool.length === 0) return [];

		// Get the current melody and advance to the next one
		const phrase = pool[melodyIndex] ?? [];
		melodyIndex = (melodyIndex + 1) % pool.length;

		// Return a deep copy to ensure reactivity when the same phrase repeats
		return phrase.map((i) => ({ ...i }));
	}
</script>

{#if !hasKeyAccess}
	<div class="min-h-screen bg-off-white py-8">
		<div class="mx-auto w-full max-w-3xl px-4">
			<div class="rounded-lg border border-slate-200 bg-white p-8 shadow-md">
				<h2 class="mb-4 text-2xl font-semibold text-slate-900">Access Required</h2>
				<p class="text-slate-700">
					The Melody game is only available with full access. Get the sheet music pack to unlock all
					features.
				</p>
				<div class="mt-4">
					<LinkButton href="/units">Get the sheet music</LinkButton>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-off-white py-8">
		<div class="mx-auto w-full max-w-5xl px-0 sm:px-4">
			<SightGame
				instrument={unit.instrument}
				keyNote={piece.key}
				mode={piece.mode}
				tempoBPM={piece.tracks?.fast?.tempo ?? 100}
				barLength={piece.barLength}
				{newMelody}
			/>
		</div>
	</div>
{/if}
