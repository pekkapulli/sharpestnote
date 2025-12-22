<script lang="ts">
	import { page } from '$app/state';
	import { onDestroy, onMount } from 'svelte';
	import Staff from '$lib/Staff.svelte';
	import MicrophoneSelector from '$lib/MicrophoneSelector.svelte';
	import { createTuner } from '$lib/useTuner.svelte';
	import { DEFAULT_A4, noteNameFromMidi } from '$lib';
	import { instrumentMap, type InstrumentConfig } from '$lib/config/instruments';
	import { getKeySignature, type Mode } from '$lib/config/keys';
	import { getInstrumentRangeForKey } from '$lib/util/getInstrumentRangeForKey';
	import type { InstrumentId } from '$lib/config/types';

	const params = $derived(page.params);
	const instrument = $derived(params.instrument as InstrumentId);
	const keyNote = $derived(params.key ?? 'C');
	const mode = $derived((params.mode as Mode) ?? 'major');

	const selectedConfig = $derived(instrumentMap[instrument]);
	const keySignature = $derived(getKeySignature(keyNote, mode));
	const availableNotes = $derived(
		selectedConfig ? getInstrumentRangeForKey(instrument, keyNote, mode) : []
	);

	$effect(() => {
		console.log('Available notes:', availableNotes);
	});

	let currentNote = $state<string | null>(null);
	let streak = $state(0);
	let showSuccess = $state(false);

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
		console.log(tuner.state.note, currentNote, showSuccess);
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
		if (!list || list.length === 0) {
			return selectedConfig?.bottomNote ?? 'C4';
		}
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

	onMount(() => {
		tuner.checkSupport();
		tuner.refreshDevices();
	});

	function startListening() {
		tuner.start();
		if (!currentNote) {
			nextNote();
		}
	}

	function handleDeviceChange(deviceId: string) {
		tuner.state.selectedDeviceId = deviceId;
	}

	onDestroy(() => {
		tuner.destroy();
	});
</script>

<div class="min-h-screen bg-off-white py-12">
	<div class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4">
		<header class="text-center">
			<div class="flex flex-col items-center justify-center gap-2">
				<p class="text-sm tracking-[0.08em] text-slate-500 uppercase">Sight reading game</p>
				<h1 class="mt-1">Read the note</h1>
				<p class="mx-auto mt-2 max-w-2xl text-center text-slate-700">
					Play the note shown on the {selectedConfig.clef} staff with your {instrument}.
					{#if keySignature}
						<span class="mt-1 block text-center text-sm text-slate-600">
							Key: {keyNote}
							{mode === 'natural_minor' ? 'minor' : 'major'}
						</span>
					{/if}
				</p>
			</div>
		</header>

		{#if !tuner.state.isListening}
			<MicrophoneSelector
				tunerState={tuner.state}
				onStartListening={startListening}
				onDeviceChange={handleDeviceChange}
			/>
		{/if}

		{#if currentNote}
			<!-- Streak and detected -->
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="rounded-2xl bg-white p-6 text-center shadow-sm">
					<p class="text-xs tracking-[0.08em] text-slate-500 uppercase">Streak</p>
					<p class={`mt-2 text-4xl font-bold ${streak > 0 ? 'text-green-600' : 'text-slate-500'}`}>
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
					height={150}
					clef={selectedConfig.clef}
					{keySignature}
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

				<div class="mt-4 flex justify-center gap-2">
					<button
						onclick={nextNote}
						class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-px hover:bg-slate-200 hover:shadow"
					>
						Skip
					</button>
					<a
						href="/sight-game"
						class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-px hover:bg-slate-200 hover:shadow"
					>
						Back to Selection
					</a>
				</div>
			</div>
		{/if}
	</div>
</div>
