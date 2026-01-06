<script lang="ts">
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import type { MelodyItem } from '$lib/config/melody';

	const { data } = $props();
	const { unit, piece, code, pieceCode } = $derived(data);

	// Extract unique intervals once when the page loads
	const intervals = $derived.by(() => {
		// Flatten all melodies into one continuous array of notes
		const allNotes = (piece.melody ?? [])
			.filter((m) => Array.isArray(m) && m.length > 0)
			.flat()
			.filter((item) => item.note != null);

		if (allNotes.length < 2) return [];

		const intervalSet = new Set<string>();
		// Go through consecutive pairs in the flattened melody
		for (let i = 0; i < allNotes.length - 1; i++) {
			const note1 = allNotes[i]?.note;
			const note2 = allNotes[i + 1]?.note;
			// Skip intervals where both notes are the same
			if (note1 && note2 && note1 !== note2) {
				intervalSet.add(`${note1}|${note2}`);
			}
		}

		return Array.from(intervalSet);
	});

	function newMelody(): MelodyItem[] {
		if (intervals.length === 0) return [];

		// Pick a random interval and create a two-note melody
		const randomInterval = intervals[Math.floor(Math.random() * intervals.length)];
		const [note1, note2] = randomInterval.split('|');

		const result: MelodyItem[] = [
			{ note: note1, length: 4 },
			{ note: note2, length: 4 }
		];

		return result;
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
