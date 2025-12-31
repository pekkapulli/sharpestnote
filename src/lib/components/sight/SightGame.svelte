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
	import { lengthToMs } from '$lib/config/melody';

	interface Props {
		instrument: InstrumentId;
		keyNote: string;
		mode: Mode;
		tempoBPM?: number;
		barLength?: number;
		newMelody?: () => MelodyItem[];
	}

	let { instrument, keyNote, mode, tempoBPM = 100, barLength = 16, newMelody }: Props = $props();
	const selectedInstrument = $derived(instrumentMap[instrument]);
	const keySignature = $derived(getKeySignature(keyNote, mode));

	// Keep tuner accidental aligned with the current key signature
	$effect(() => {
		if (tuner) {
			tuner.accidental = keySignature.preferredAccidental;
		}
	});

	function getRequiredHoldLength(length: NoteLength): number {
		// Always require just 1 sixteenth for success
		return 1;
	}

	let melody = $state<MelodyItem[] | null>(null);
	let currentIndex = $state(0);
	let streak = $state(0);
	let showSuccess = $state(false);
	let requireFreshAttack = $state(false);
	let hadPauseSinceLastSuccess = $state(true);
	let lastSuccessNote = $state<string | null>(null);
	let currentNoteSuccess = $state(false);
	const MIN_INACTIVE_MS = 120;
	let inactiveSince = $state<number | null>(null);
	let animationTimeoutId: number | null = null;
	let animationIntervalId: number | null = null;
	let simulatedHeldSixteenths = $state<number | null>(null);
	let animatingNoteIndex = $state<number | null>(null);

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
		if (!melody || !melody.length) return false;
		const target = melody[currentIndex].note;

		// Rests are automatically "hit"
		if (target === null) return true;

		if (!tuner.state.note) return false;
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

			// Skip if current note is a rest
			if (target === null) return;

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

				// Only require 1 sixteenth to be held
				if (tuner.state.heldSixteenths >= 1) {
					// Mark as success but continue animating
					markNoteAsSuccess();
				}
			}

			// Check if player is playing the NEXT note while current one is still animating
			if (currentNoteSuccess && currentIndex < melody.length - 1) {
				const nextTarget = melody[currentIndex + 1].note;
				if (nextTarget !== null) {
					const expectedNextNote = selectedInstrument
						? transposeForTransposition(
								nextTarget,
								selectedInstrument.transpositionSemitones,
								keySignature.preferredAccidental
							)
						: nextTarget;

					if (
						expectedNextNote &&
						tuner.state.note === expectedNextNote &&
						hadPauseSinceLastSuccess
					) {
						// Player hit the next note with a fresh attack - advance at 50% animation or later
						if (tuner.state.heldSixteenths >= 1) {
							const noteLength = melody[currentIndex].length ?? 4;
							const halfLength = noteLength / 2;
							if (simulatedHeldSixteenths !== null && simulatedHeldSixteenths >= halfLength) {
								advanceToNextNote();
							}
						}
					}
				}
			}
		}
	});

	// Handle rests automatically
	$effect(() => {
		if (melody && melody.length && currentIndex < melody.length && !showSuccess) {
			const currentNote = melody[currentIndex].note;

			// If current note is a rest (null), automatically advance after the rest duration
			if (currentNote === null) {
				const restLength = melody[currentIndex].length ?? 4;
				const restDurationMs = lengthToMs(restLength, tempoBPM);

				animatingNoteIndex = currentIndex;

				// Clear any existing animation
				if (animationTimeoutId !== null) {
					clearTimeout(animationTimeoutId);
				}
				if (animationIntervalId !== null) {
					clearInterval(animationIntervalId);
				}

				// Simulate held sixteenths progressing
				simulatedHeldSixteenths = 0;
				const updateInterval = 50; // Update every 50ms
				const sixteenthDurationMs = lengthToMs(1, tempoBPM);
				const updates = Math.ceil(restDurationMs / updateInterval);
				let updateCount = 0;

				animationIntervalId = setInterval(() => {
					updateCount++;
					simulatedHeldSixteenths = Math.min(
						(updateCount * updateInterval) / sixteenthDurationMs,
						restLength
					);

					if (updateCount >= updates) {
						clearInterval(animationIntervalId!);
						animationIntervalId = null;
					}
				}, updateInterval) as unknown as number;

				// Advance to next note after rest duration
				animationTimeoutId = setTimeout(() => {
					simulatedHeldSixteenths = null;
					animatingNoteIndex = null;
					handleCorrectNote();
					animationTimeoutId = null;
				}, restDurationMs) as unknown as number;

				return () => {
					if (animationTimeoutId !== null) {
						clearTimeout(animationTimeoutId);
						animationTimeoutId = null;
					}
					if (animationIntervalId !== null) {
						clearInterval(animationIntervalId);
						animationIntervalId = null;
					}
					simulatedHeldSixteenths = null;
					animatingNoteIndex = null;
				};
			} else {
				// Don't clear animation if we're currently animating a successful note
				if (animatingNoteIndex !== currentIndex) {
					simulatedHeldSixteenths = null;
					animatingNoteIndex = null;
				}
			}
		}
	});

	function markNoteAsSuccess() {
		if (currentNoteSuccess) return; // Already marked as success

		currentNoteSuccess = true;
		lastSuccessNote = tuner.state.note;
		requireFreshAttack = true;
		hadPauseSinceLastSuccess = false;

		// Reset hold duration so player must start a fresh note
		tuner.resetHoldDuration();

		// Start animation simulation for the successfully detected note
		if (melody) {
			const noteLength = melody[currentIndex].length ?? 4;
			const isLastNote = currentIndex === melody.length - 1;
			// For the last note, animate only 50% of the duration for faster completion
			const animationSpeedMultiplier = isLastNote ? 0.5 : 1.0;
			const noteDurationMs = lengthToMs(noteLength, tempoBPM) * animationSpeedMultiplier;

			animatingNoteIndex = currentIndex;

			// Clear any existing animation
			if (animationTimeoutId !== null) {
				clearTimeout(animationTimeoutId);
				animationTimeoutId = null;
			}
			if (animationIntervalId !== null) {
				clearInterval(animationIntervalId);
				animationIntervalId = null;
			}

			// Start animation from 0
			simulatedHeldSixteenths = 0;
			const updateInterval = 50; // Update every 50ms
			const sixteenthDurationMs = lengthToMs(1, tempoBPM);
			const totalUpdates = Math.ceil(noteDurationMs / updateInterval);
			let updateCount = 0;

			animationIntervalId = setInterval(() => {
				updateCount++;
				simulatedHeldSixteenths = Math.min(
					(updateCount * updateInterval) / sixteenthDurationMs,
					noteLength
				);

				if (updateCount >= totalUpdates) {
					clearInterval(animationIntervalId!);
					animationIntervalId = null;
					// Animation complete - advance to next note
					advanceToNextNote();
				}
			}, updateInterval) as unknown as number;
		}
	}

	function advanceToNextNote() {
		// Clear animation state
		if (animationIntervalId !== null) {
			clearInterval(animationIntervalId);
			animationIntervalId = null;
		}
		if (animationTimeoutId !== null) {
			clearTimeout(animationTimeoutId);
			animationTimeoutId = null;
		}
		simulatedHeldSixteenths = null;
		animatingNoteIndex = null;

		// Advance
		handleCorrectNote();
	}

	function refreshMelody() {
		// Clear any pending animation
		if (animationTimeoutId !== null) {
			clearTimeout(animationTimeoutId);
			animationTimeoutId = null;
		}
		if (animationIntervalId !== null) {
			clearInterval(animationIntervalId);
			animationIntervalId = null;
		}
		simulatedHeldSixteenths = null;
		animatingNoteIndex = null;

		const nextMelody = newMelody ? newMelody() : [];
		// Deep copy to guarantee a new reference and avoid stale reactivity
		melody = nextMelody.map((i) => ({ ...i }));
		currentIndex = 0;
		showSuccess = false;
		requireFreshAttack = false;
		hadPauseSinceLastSuccess = true;
		lastSuccessNote = null;
		currentNoteSuccess = false;
	}

	function handleCorrectNote() {
		// Advance within melody first
		if (melody) {
			if (currentIndex < melody.length - 1) {
				currentIndex += 1;
				currentNoteSuccess = false; // Reset for next note
				return;
			}
		}

		// Melody completed
		showSuccess = true;
		streak += 1;
		setTimeout(() => {
			refreshMelody();
		}, 400);
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
	<div class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-1 sm:px-4">
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
				class={`flex flex-col items-center justify-center rounded-2xl bg-white p-1 py-4 shadow-sm transition-all duration-300 ${
					showSuccess ? 'scale-105 ring-4 ring-green-400' : ''
				} sm:p-6 lg:p-8`}
			>
				<Staff
					sequence={melody}
					{currentIndex}
					animatingIndex={animatingNoteIndex}
					animationProgress={simulatedHeldSixteenths}
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
					clef={selectedInstrument.clef}
					{keySignature}
					isCurrentNoteHit={isCurrentNoteHit()}
					isSequenceComplete={showSuccess}
					{barLength}
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
