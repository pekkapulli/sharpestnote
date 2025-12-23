<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Staff from '$lib/components/music/Staff.svelte';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import AmplitudeBar from '$lib/components/ui/AmplitudeBar.svelte';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { DEFAULT_A4 } from '$lib/tuner/tune';
	import { instrumentMap } from '$lib/config/instruments';
	import { getKeySignature, type Mode } from '$lib/config/keys';
	import type { InstrumentId } from '$lib/config/types';
	import {
		transposeForTransposition,
		transposeDetectedNoteForDisplay as transposeDetectedForDisplay
	} from '$lib/util/noteNames';
	import type { MelodyItem, NoteLength } from '$lib/config/melody';

	interface Props {
		instrument: InstrumentId;
		keyNote: string;
		mode: Mode;
		tempoBPM?: number;
		newMelody?: () => MelodyItem[];
	}

	let { instrument, keyNote, mode, tempoBPM = 100, newMelody }: Props = $props();

	const selectedInstrument = $derived(instrumentMap[instrument]);
	const keySignature = $derived(getKeySignature(keyNote, mode));

	// Keep tuner accidental aligned with the current key signature
	$effect(() => {
		if (tuner) {
			tuner.accidental = keySignature.preferredAccidental;
		}
	});

	function getRequiredHoldLength(length: NoteLength): number {
		// Sustaining instruments can hold notes full length
		if (selectedInstrument?.sustaining) {
			return Math.ceil(length * 0.8);
		}
		// Plucked/non-sustained instruments: require only 50% of note length
		return Math.ceil(length * 0.3);
	}

	let melody = $state<MelodyItem[] | null>(null);
	let currentIndex = $state(0);
	let streak = $state(0);
	let showSuccess = $state(false);
	let requireFreshAttack = $state(false);
	let hadPauseSinceLastSuccess = $state(true);
	let lastSuccessNote = $state<string | null>(null);
	const MIN_INACTIVE_MS = 120;
	let inactiveSince = $state<number | null>(null);

	const tuner = createTuner({
		a4: DEFAULT_A4,
		// svelte-ignore state_referenced_locally
		tempoBPM,
		debounceTime: 50,
		// svelte-ignore state_referenced_locally
		instrument
	});

	// Check if current note matches and fresh attack requirement is satisfied
	const isCurrentNoteHit = $derived(() => {
		if (!tuner.state.note || !melody || !melody.length) return false;
		const target = melody[currentIndex].note;
		const expectedNote = selectedInstrument
			? transposeForTransposition(
					target,
					selectedInstrument.transpositionSemitones,
					keySignature.preferredAccidental
				)
			: target;
		if (expectedNote !== tuner.state.note) return false;
		// If fresh attack is required, check that we've had a pause
		if (requireFreshAttack && !hadPauseSinceLastSuccess) return false;
		return true;
	});

	// Track when note becomes inactive (amplitude drops) or note changes to detect fresh attacks
	// Require a short inactive window to avoid flicker-based pauses on sustained instruments
	$effect(() => {
		const now = performance.now();

		if (!tuner.state.isNoteActive) {
			if (inactiveSince === null) {
				inactiveSince = now;
			}
			if (now - inactiveSince >= MIN_INACTIVE_MS) {
				hadPauseSinceLastSuccess = true;
			}
		} else {
			inactiveSince = null;
			if (tuner.state.note !== lastSuccessNote) {
				hadPauseSinceLastSuccess = true;
			}
		}
	});

	// Watch for correct note detection
	$effect(() => {
		if (tuner.state.note && melody && melody.length && !showSuccess) {
			const target = melody[currentIndex].note;
			const expectedNote = selectedInstrument
				? transposeForTransposition(
						target,
						selectedInstrument.transpositionSemitones,
						keySignature.preferredAccidental
					)
				: target;
			if (expectedNote && tuner.state.note === expectedNote) {
				// Require a fresh attack after each successful note
				if (requireFreshAttack && !hadPauseSinceLastSuccess) {
					return; // Don't count this note until there's a fresh attack
				}

				const requiredLength = getRequiredHoldLength(melody[currentIndex].length ?? 4);
				if (tuner.state.heldSixteenths >= requiredLength) {
					handleCorrectNote();
				}
			}
		}
	});

	function refreshMelody() {
		const nextMelody = newMelody ? newMelody() : [];
		melody = nextMelody;
		currentIndex = 0;
		showSuccess = false;
		requireFreshAttack = false;
		hadPauseSinceLastSuccess = true;
		lastSuccessNote = null;
	}

	function handleCorrectNote() {
		// Store the note that just succeeded
		lastSuccessNote = tuner.state.note;

		// Reset hold duration so player must start a fresh note
		tuner.resetHoldDuration();

		// Require a fresh attack on the next note
		requireFreshAttack = true;
		hadPauseSinceLastSuccess = false;

		// Advance within melody first
		if (melody) {
			if (currentIndex < melody.length - 1) {
				currentIndex += 1;
				return;
			}
		}

		// Melody completed
		showSuccess = true;
		streak += 1;
		setTimeout(() => {
			refreshMelody();
		}, 800);
	}

	onMount(() => {
		tuner.checkSupport();
		tuner.refreshDevices();
	});

	function startListening() {
		tuner.start();
		if (!melody) refreshMelody();
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
				<h1 class="mt-1">Read the melody</h1>
				<p class="mx-auto mt-2 max-w-2xl text-center text-slate-700">
					Play the notes shown on the {selectedInstrument.clef} staff with your {instrument}.
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

		{#if melody}
			<!-- Staff display -->
			<div
				class={`flex justify-center rounded-2xl bg-white p-8 shadow-sm transition-all duration-300 ${
					showSuccess ? 'scale-105 ring-4 ring-green-400' : ''
				}`}
			>
				<Staff
					sequence={melody}
					{currentIndex}
					heldSixteenths={tuner.state.heldSixteenths}
					ghostNote={requireFreshAttack && !hadPauseSinceLastSuccess
						? null
						: selectedInstrument
							? transposeDetectedForDisplay(
									tuner.state.note,
									selectedInstrument.transpositionSemitones,
									keySignature.preferredAccidental
								)
							: tuner.state.note}
					cents={tuner.state.cents}
					height={150}
					clef={selectedInstrument.clef}
					{keySignature}
					isCurrentNoteHit={isCurrentNoteHit()}
					isSequenceComplete={showSuccess}
				/>
			</div>

			<!-- Note labels -->
			<div class="flex justify-center">
				<details class="rounded-lg bg-dark-blue px-8 py-4 text-center" open>
					<summary
						class="cursor-pointer text-sm tracking-[0.08em] text-slate-300 uppercase hover:text-white"
					>
						Show note names
					</summary>
					<div class="mt-3">
						<p class="text-sm tracking-[0.08em] text-slate-300 uppercase">Current melody</p>
						<p class="mt-1 text-xl font-bold text-white">
							{#each melody as item, i}
								<span
									class={i === currentIndex
										? 'text-white'
										: i < currentIndex
											? 'text-emerald-300'
											: 'text-slate-300'}
								>
									{item.note}{i < melody.length - 1 ? ' ' : ''}
								</span>
							{/each}
						</p>
						<div class="my-2 border-t border-slate-600"></div>
						<p class="text-sm tracking-[0.08em] text-slate-300 uppercase">Detected</p>
						<div class="mt-2 flex flex-col items-center gap-2">
							<p class="text-2xl font-bold text-slate-300">{tuner.state.note ?? '--'}</p>
							<AmplitudeBar amplitude={tuner.state.amplitude} width={180} height={16} />
						</div>
					</div>
				</details>
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
						onclick={refreshMelody}
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
