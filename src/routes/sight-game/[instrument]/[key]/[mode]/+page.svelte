<script lang="ts">
	import { page } from '$app/state';
	import SightGame from '$lib/components/sight/SightGame.svelte';
	import { instrumentMap } from '$lib/config/instruments';
	import { getInstrumentRangeForKey } from '$lib/util/getInstrumentRangeForKey';
	import { noteNameToMidi } from '$lib/util/noteNames';
	import type { Mode } from '$lib/config/keys';
	import type { InstrumentId } from '$lib/config/types';
	import type { MelodyItem, NoteLength } from '$lib/config/melody';

	const params = $derived(page.params);
	const instrument = $derived(params.instrument as InstrumentId);
	const keyNote = $derived(params.key ?? 'C');
	const mode = $derived((params.mode as Mode) ?? 'major');

	const selectedInstrument = $derived(instrumentMap[instrument]);
	const availableNotes = $derived(
		selectedInstrument ? getInstrumentRangeForKey(instrument, keyNote, mode) : []
	);

	let currentMelody = $state<MelodyItem[]>([]);
	let isInitialized = $state(false);
	let melodyVersion = $state(0);

	function createLengths(count: number): NoteLength[] {
		if (count <= 1) return [16];
		if (count === 2) return [8, 8];
		if (count === 3) {
			const patterns: NoteLength[][] = [
				[4, 4, 8],
				[4, 8, 4],
				[8, 4, 4]
			];
			return patterns[Math.floor(Math.random() * patterns.length)];
		}
		// 4 or more -> clamp to 4 notes and use quarters
		return new Array(Math.min(count, 4)).fill(4);
	}

	function getRandomNote(previous?: string | null) {
		const list = availableNotes;
		if (!list || list.length === 0) {
			return selectedInstrument?.bottomNote ?? 'C4';
		}

		if (previous) {
			const prevMidi = noteNameToMidi(previous);
			if (prevMidi !== null) {
				const filtered = list.filter((n) => {
					const midi = noteNameToMidi(n);
					return midi !== null && Math.abs(midi - prevMidi) <= 2;
				});
				if (filtered.length) {
					return filtered[Math.floor(Math.random() * filtered.length)];
				}
			}
		}

		return list[Math.floor(Math.random() * list.length)];
	}

	function createNextMelody() {
		const length = Math.floor(Math.random() * 1) + 3; // 3..4
		const notes: string[] = [];
		for (let i = 0; i < length; i += 1) {
			const prev = i > 0 ? notes[i - 1] : null;
			notes.push(getRandomNote(prev));
		}
		const lens = createLengths(notes.length);

		// Deep copy to ensure reactivity
		currentMelody = notes.map((n, i) => ({ note: n, length: lens[i] }));
		melodyVersion += 1;
		console.log(
			'[Sight Game Page] New melody created, length:',
			currentMelody.length,
			'version:',
			melodyVersion
		);
	}

	// Initialize first melody
	$effect(() => {
		if (!isInitialized && availableNotes.length > 0) {
			console.log('[Sight Game Page] Initializing first melody');
			isInitialized = true;
			createNextMelody();
		}
	});

	function handleMelodyComplete() {
		console.log('[Sight Game Page] Melody complete');
		// Continue to next melody
		setTimeout(() => createNextMelody(), 400);
	}
</script>

<SightGame
	{instrument}
	{keyNote}
	{mode}
	melody={currentMelody}
	onMelodyComplete={handleMelodyComplete}
/>
