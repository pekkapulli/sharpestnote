<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Staff from '$lib/Staff.svelte';
	import { createTuner } from '$lib/useTuner.svelte';
	import { DEFAULT_A4, noteNameFromMidi } from '$lib';
	import {
		instrumentConfigs,
		instrumentMap,
		defaultInstrumentId,
		type InstrumentConfig
	} from '$lib/config/instruments';
	import type { InstrumentId } from '$lib/config/types';

	let currentNote = $state<string | null>(null);
	let streak = $state(0);
	let showSuccess = $state(false);
	let isGameStarted = $state(false);
	let selectedInstrument = $state<InstrumentId>(defaultInstrumentId);
	const selectedConfig = $derived(instrumentMap[selectedInstrument]);
	const availableNotes = $derived(selectedConfig.writtenRange);

	const tuner = createTuner({ a4: DEFAULT_A4, accidental: 'sharp' });

	const letterToSemitone: Record<string, number> = {
		C: 0,
		D: 2,
		E: 4,
		F: 5,
		G: 7,
		A: 9,
		B: 11
	};

	function noteNameToMidi(n: string): number | null {
		const m = /^([A-G])([#b]?)(\d)$/.exec(n);
		if (!m) return null;
		const [, letter, accidental, octaveStr] = m;
		let semitone = letterToSemitone[letter];
		if (accidental === '#') semitone += 1;
		if (accidental === 'b') semitone -= 1;
		const octave = Number(octaveStr);
		return (octave + 1) * 12 + semitone;
	}

	function midiToNoteName(midi: number): string {
		return noteNameFromMidi(midi, 'sharp');
	}

	function transposeNote(note: string, semitones: number): string | null {
		const midi = noteNameToMidi(note);
		if (midi === null) return null;
		return midiToNoteName(midi + semitones);
	}

	function transposeNoteForInstrument(note: string): string | null {
		const cfg: InstrumentConfig = selectedConfig;
		if (!cfg) return note;
		return transposeNote(note, cfg.transpositionSemitones);
	}

	function transposeDetectedNoteForDisplay(note: string | null): string | null {
		if (!note) return null;
		const cfg: InstrumentConfig = selectedConfig;
		if (!cfg) return note;
		return transposeNote(note, -cfg.transpositionSemitones) ?? note;
	}

	// Watch for correct note detection
	$effect(() => {
		if (tuner.state.note && currentNote && !showSuccess) {
			const expectedNote = transposeNoteForInstrument(currentNote);
			if (expectedNote && tuner.state.note === expectedNote) {
				handleCorrectNote();
			} else {
				streak = 0;
			}
		}
	});

	function getRandomNote() {
		const list = availableNotes;
		return list[Math.floor(Math.random() * list.length)];
	}

	function nextNote() {
		currentNote = getRandomNote();
		showSuccess = false;
	}

	function handleCorrectNote() {
		showSuccess = true;
		streak += 1;

		// Wait for animation then show next note
		setTimeout(() => {
			nextNote();
		}, 1000);
	}

	function startGame() {
		isGameStarted = true;
		tuner.start();
		nextNote();
	}

	// If instrument changes during game, pick a new note from the new range
	$effect(() => {
		if (isGameStarted) {
			nextNote();
		}
	});

	onMount(() => {
		tuner.checkSupport();
		tuner.refreshDevices();
	});

	onDestroy(() => {
		tuner.destroy();
	});
</script>

<svelte:window />

{#if !isGameStarted}
	<div class="flex min-h-screen items-center justify-center bg-off-white">
		<div class="max-w-md text-center">
			<h1 class="mb-4">Sight Reading Game</h1>
			<p class="mb-6 text-slate-700">Play the notes shown on the staff with your instrument</p>

			<!-- Instrument selector -->
			<div class="mb-6">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<div class="mb-2 block text-sm font-medium text-slate-700">Select your instrument</div>
				<div class="mx-auto grid max-w-sm grid-cols-2 gap-2 sm:grid-cols-3">
					{#each instrumentConfigs as instrument}
						<button
							onclick={() => (selectedInstrument = instrument.id)}
							class={`rounded-lg px-4 py-3 text-sm font-semibold transition ${
								selectedInstrument === instrument.id
									? 'bg-dark-blue text-white'
									: 'bg-white text-slate-900 hover:bg-slate-100'
							}`}
						>
							{instrument.label}
						</button>
					{/each}
				</div>
			</div>

			{#if tuner.state.error}
				<p class="mb-4 text-sm text-red-600">{tuner.state.error}</p>
			{/if}
			<button
				onclick={startGame}
				class="rounded-lg bg-dark-blue px-8 py-4 text-lg font-semibold text-white transition hover:-translate-y-px hover:shadow"
			>
				Start Game
			</button>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-off-white py-12">
		<div class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4">
			<header class="text-center">
				<div class="flex items-center justify-center gap-2">
					<p class="text-sm tracking-[0.08em] text-slate-500 uppercase">Sight reading game</p>
				</div>
				<h1 class="mt-1">Read the note</h1>
				<p class="mx-auto mt-2 max-w-2xl text-slate-700">
					Play the note shown on the {selectedConfig.clef} staff with your {selectedInstrument}.
				</p>
			</header>

			{#if currentNote}
				<!-- Streak and detected -->
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="rounded-2xl bg-white p-6 text-center shadow-sm">
						<p class="text-xs tracking-[0.08em] text-slate-500 uppercase">Streak</p>
						<p
							class={`mt-2 text-4xl font-bold ${streak > 0 ? 'text-green-600' : 'text-slate-500'}`}
						>
							{streak}
						</p>
					</div>
					<div class="rounded-2xl bg-white p-6 text-center shadow-sm">
						<p class="text-xs tracking-[0.08em] text-slate-500 uppercase">Detected</p>
						<p class="mt-2 text-4xl font-bold text-blue-600">{tuner.state.note ?? '--'}</p>
					</div>
				</div>

				<!-- Staff display -->
				<div
					class={`flex justify-center rounded-2xl bg-white p-8 shadow-sm transition-all duration-300 ${
						showSuccess ? 'scale-105 ring-4 ring-green-400' : ''
					}`}
				>
					<Staff
						note={currentNote}
						ghostNote={transposeDetectedNoteForDisplay(tuner.state.note)}
						cents={tuner.state.cents}
						accidental="sharp"
						height={150}
						clef={selectedConfig.clef}
					/>
				</div>

				<!-- Tuner status -->
				<div class="rounded-2xl bg-white p-4 text-center shadow-sm">
					<p class={`text-sm ${tuner.state.isListening ? 'text-green-700' : 'text-slate-600'}`}>
						{tuner.state.isListening
							? 'Listening... Play the note shown above.'
							: 'Microphone not active.'}
					</p>
					{#if showSuccess}
						<p class="mt-2 text-lg font-bold text-green-600">✓ Correct! Next note coming...</p>
					{/if}

					<div class="mt-4 flex justify-center">
						<button
							onclick={nextNote}
							class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-px hover:bg-slate-200 hover:shadow"
						>
							Skip
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
