<script lang="ts">
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import type { MelodyItem } from '$lib/config/melody';

	const { data } = $props();
	const { unit, code } = $derived(data);

	function newMelody(): MelodyItem[] {
		const pool = unit.melody?.filter((m) => Array.isArray(m) && m.length > 0) ?? [];
		if (pool.length === 0) return [];
		const index = Math.floor(Math.random() * pool.length);
		const phrase = pool[index] ?? [];
		// Trim trailing rests to avoid blocking completion
		let end = phrase.length - 1;
		while (end >= 0 && phrase[end]?.note == null) end -= 1;
		const trimmed = phrase.slice(0, end + 1);
		const result = (
			trimmed.length ? trimmed : phrase.filter((p) => p.note != null)
		) as MelodyItem[];
		// Return a deep copy to ensure reactivity when the same phrase repeats
		return result.map((i) => ({ ...i }));
	}
</script>

<div class="min-h-screen bg-off-white py-8">
	<div class="mx-auto w-full max-w-5xl px-4">
		<nav class="mb-4">
			<a
				href={`/unit/${code}`}
				class="inline-block rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-px hover:bg-slate-200 hover:shadow"
			>
				← Back to unit
			</a>
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
