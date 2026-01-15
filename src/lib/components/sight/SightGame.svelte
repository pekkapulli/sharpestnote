<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Staff from '$lib/components/music/Staff.svelte';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import AmplitudeBar from '$lib/components/ui/AmplitudeBar.svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { createSynth } from '$lib/synth/useSynth.svelte';
	import { DEFAULT_A4 } from '$lib/tuner/tune';
	import { instrumentMap } from '$lib/config/instruments';
	import { getKeySignature, type Mode } from '$lib/config/keys';
	import type { InstrumentId } from '$lib/config/types';
	import {
		transposeForTransposition,
		transposeDetectedNoteForDisplay as transposeDetectedForDisplay
	} from '$lib/util/noteNames';
	import type { MelodyItem } from '$lib/config/melody';
	import { lengthToMs } from '$lib/config/melody';
	import { vexFlowToDisplay } from '$lib/util/noteConverter';

	interface Props {
		instrument: InstrumentId;
		keyNote: string;
		mode: Mode;
		tempoBPM?: number;
		barLength?: number;
		newMelody?: () => MelodyItem[];
		onMelodyComplete?: () => void;
		suppressAutoPlay?: boolean;
	}

	let {
		instrument,
		keyNote,
		mode,
		tempoBPM = 100,
		barLength = 16,
		newMelody,
		onMelodyComplete,
		suppressAutoPlay = false
	}: Props = $props();
	const selectedInstrument = $derived(instrumentMap[instrument]);
	const keySignature = $derived(getKeySignature(keyNote, mode));

	// Keep tuner accidental aligned with the current key signature
	$effect(() => {
		if (tuner) {
			tuner.accidental = keySignature.preferredAccidental;
		}
	});

	// Update tuner instrument when prop changes
	$effect(() => {
		if (tuner) {
			tuner.instrument = instrument;
		}
	});

	let melody = $state<MelodyItem[] | null>(null);
	let currentIndex = $state(0);
	let streak = $state(0);
	let showSuccess = $state(false);
	let lastSuccessNote = $state<string | null>(null);
	let currentNoteSuccess = $state(false);
	let lastOnsetHeldSixteenths = $state<number>(0);
	let animationTimeoutId: number | null = null;
	let animationIntervalId: number | null = null;
	let simulatedHeldSixteenths = $state<number | null>(null);
	let animatingNoteIndex = $state<number | null>(null);
	let synthEnabled = $state(true);
	let greatIntonationIndices = $state<number[]>([]);

	const tuner = createTuner({
		a4: DEFAULT_A4,
		accidental: 'sharp',
		debug: false,
		gain: 15,
		maxGain: 500
	});

	// Create synth voice for playing back melodies
	const synth = createSynth({
		waveform: 'sine',
		volume: 0.25,
		attack: 0.02,
		decay: 0.1,
		sustain: 0.7,
		release: 0.1,
		a4: DEFAULT_A4,
		reverbMix: 0.1,
		reverbDecay: 2
	});

	// Update synth with instrument-specific ADSR settings
	$effect(() => {
		if (selectedInstrument.adsrConfig) {
			synth.setOptions(selectedInstrument.adsrConfig);
		}
	});

	let isPlayingMelody = $state(false);
	let playheadPosition = $state<number | null>(null); // Position in sixteenths for playback animation
	let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);
	let staffMinWidth = $state(400);
	let staffMaxWidth = $state('none');

	// Update min/maxWidth based on viewport width
	$effect(() => {
		if (typeof window !== 'undefined') {
			const handleResize = () => {
				windowWidth = window.innerWidth;
				// On narrow devices (<640px), use responsive width that fits the screen with padding
				// On wider devices, use a minimum of 400px for readable notation
				staffMinWidth = windowWidth < 640 ? Math.max(320, windowWidth - 40) : 400;
				// Constrain maxWidth on small screens to prevent overflow
				staffMaxWidth = windowWidth < 640 ? `${windowWidth - 40}px` : 'none';
			};
			window.addEventListener('resize', handleResize);
			handleResize(); // Call once to set initial value
			return () => window.removeEventListener('resize', handleResize);
		}
	});

	// Detect new onsets by watching for heldSixteenths resetting to near-zero
	// This is more reliable than waiting for note to become inactive
	$effect(() => {
		const held = tuner.state.heldSixteenths;

		// Detect onset: heldSixteenths drops below 0.5 (indicating a new attack)
		// and we previously saw it above 1 (indicating the last note was held)
		if (held < 0.5 && lastOnsetHeldSixteenths >= 1) {
			// New onset detected! Reset success state for this new attack
			currentNoteSuccess = false;
			lastSuccessNote = null;
		}

		lastOnsetHeldSixteenths = held;
	});

	// Check if current note matches
	const isCurrentNoteHit = $derived(() => {
		if (!melody || !melody.length || isPlayingMelody) return false;
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
		return true;
	});

	// Watch for correct note detection
	$effect(() => {
		if (tuner.state.note && melody && melody.length && !showSuccess && !isPlayingMelody) {
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
				// Check if this is a fresh attack (not already succeeded)
				if (currentNoteSuccess) {
					return; // Already succeeded on this note
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
						tuner.state.heldSixteenths < 0.5
					) {
						// Player hit the next note with a fresh attack (low heldSixteenths)
						// Allow advancing even during animation
						advanceToNextNote();
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
				const restDurationMs = lengthToMs(restLength, tempoBPM) * 0.5; // Double speed

				animatingNoteIndex = currentIndex;

				// Clear any existing animation
				if (animationTimeoutId !== null) {
					clearTimeout(animationTimeoutId);
					animationTimeoutId = null;
				}
				if (animationIntervalId !== null) {
					clearInterval(animationIntervalId);
				}

				// Simulate held sixteenths progressing
				simulatedHeldSixteenths = 0;
				const updateInterval = 50; // Update every 50ms
				const totalUpdates = Math.ceil(restDurationMs / updateInterval);
				let updateCount = 0;

				animationIntervalId = setInterval(() => {
					updateCount++;
					// Calculate progress based on animation duration
					const progress = Math.min(updateCount / totalUpdates, 1);
					simulatedHeldSixteenths = progress * restLength;

					if (updateCount >= totalUpdates) {
						clearInterval(animationIntervalId!);
						animationIntervalId = null;
					}
				}, updateInterval) as unknown as number;

				// Advance to next note after rest duration
				animationTimeoutId = setTimeout(() => {
					simulatedHeldSixteenths = null;
					animatingNoteIndex = null;
					advanceToNextNote();
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

		// Track great intonation (within 15 cents)
		if (tuner.state.cents !== null && Math.abs(tuner.state.cents) < 15) {
			greatIntonationIndices.push(currentIndex);
		}

		// Start animation simulation for the successfully detected note
		if (melody) {
			const noteLength = melody[currentIndex].length ?? 4;
			const isLastNote = currentIndex === melody.length - 1;
			// For the last note, animate only 50% of the duration for faster completion
			const animationSpeedMultiplier = isLastNote ? 0.5 : 1.0;
			const noteDurationMs = lengthToMs(noteLength, tempoBPM) * animationSpeedMultiplier * 0.5; // Double speed animation

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
			const totalUpdates = Math.ceil(noteDurationMs / updateInterval);
			let updateCount = 0;

			animationIntervalId = setInterval(() => {
				updateCount++;
				// Calculate progress based on adjusted animation duration
				const progress = Math.min(updateCount / totalUpdates, 1);
				simulatedHeldSixteenths = progress * noteLength;

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
		greatIntonationIndices = [];

		const nextMelody = newMelody ? newMelody() : [];
		// Deep copy to guarantee a new reference and avoid stale reactivity
		melody = nextMelody.map((i) => ({ ...i }));
		currentIndex = 0;
		showSuccess = false;
		lastSuccessNote = null;
		currentNoteSuccess = false;
		lastOnsetHeldSixteenths = -1;

		// Automatically play the new melody if synth is enabled and auto-play is not suppressed
		if (synthEnabled && !suppressAutoPlay) {
			playMelodyWithSynth();
		}
	}

	// Public method for parent to trigger refresh and play
	export function refreshAndPlayMelody() {
		refreshMelody();
	}

	async function playMelodyWithSynth() {
		if (!melody || isPlayingMelody) return;

		isPlayingMelody = true;
		playheadPosition = 0;

		try {
			let currentSixteenth = 0;

			for (const item of melody) {
				const noteLength = item.length;
				const noteDurationMs = lengthToMs(noteLength, tempoBPM);
				const startTime = performance.now();

				// Animate playhead during note playback
				const animatePlayhead = () => {
					const elapsed = performance.now() - startTime;
					const progress = Math.min(elapsed / noteDurationMs, 1);
					playheadPosition = currentSixteenth + progress * noteLength;

					if (progress < 1) {
						requestAnimationFrame(animatePlayhead);
					}
				};
				animatePlayhead();

				await synth.playNote(item, tempoBPM);
				currentSixteenth += noteLength;
				playheadPosition = currentSixteenth;
			}
		} catch (err) {
			console.error('Error playing melody:', err);
		} finally {
			isPlayingMelody = false;
			// Delay clearing playhead to allow CSS fade-out transition to complete
			setTimeout(() => {
				playheadPosition = null;
			}, 500); // Match the CSS transition duration
		}
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

		// Call completion callback if provided
		if (onMelodyComplete) {
			onMelodyComplete();
		}

		// Only auto-refresh if auto-play is not suppressed (i.e., don't refresh when modal is showing)
		if (!suppressAutoPlay) {
			setTimeout(() => {
				refreshMelody();
			}, 400);
		}
	}

	onMount(() => {
		tuner.checkSupport();
		tuner.refreshDevices();

		// Test helper: Arrow right to mark current note as success
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowRight' && melody && currentIndex < melody.length) {
				const currentNote = melody[currentIndex].note;
				if (currentNote !== null) {
					markNoteAsSuccess();
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

	async function startListening() {
		console.log(
			'[SightGame] startListening called, needsUserGesture:',
			tuner.state.needsUserGesture
		);
		try {
			// Safari may require a second user gesture after being blocked
			if (tuner.state.needsUserGesture) {
				console.log('[SightGame] Calling resumeAfterGesture...');
				await tuner.resumeAfterGesture();
			} else {
				console.log('[SightGame] Calling start...');
				await tuner.start();
			}
			console.log('[SightGame] Start/resume completed, isListening:', tuner.state.isListening);
			if (!melody) refreshMelody();
		} catch (err) {
			console.error('[SightGame] Failed to start listening:', err);
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
	<div class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-0 sm:px-4">
		<header class="text-center">
			<div class="flex flex-col items-center justify-center gap-2">
				<p class="mx-auto mt-2 max-w-xl text-center text-slate-700">
					Play the notes shown on the {selectedInstrument.clef} staff with your {instrument}. A star
					means you hit the note perfectly!
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
				class={`flex flex-col items-center justify-center rounded-2xl bg-white p-0 py-4 shadow-sm transition-all duration-300 ${
					showSuccess ? 'scale-105 ring-4 ring-green-400' : ''
				} sm:p-6 lg:p-8`}
			>
				<Staff
					bars={[melody]}
					minWidth={staffMinWidth}
					showTimeSignature={false}
					{currentIndex}
					animatingIndex={animatingNoteIndex}
					animationProgress={simulatedHeldSixteenths}
					{playheadPosition}
					ghostNote={isPlayingMelody
						? null
						: selectedInstrument
							? transposeDetectedForDisplay(
									tuner.state.note,
									selectedInstrument.transpositionSemitones,
									keySignature.preferredAccidental
								)
							: tuner.state.note}
					cents={isPlayingMelody ? null : tuner.state.cents}
					clef={selectedInstrument.clef}
					{keySignature}
					isCurrentNoteHit={isCurrentNoteHit()}
					isSequenceComplete={showSuccess}
					{barLength}
					{greatIntonationIndices}
				/>
			</div>

			<!-- Synth toggle -->
			<div class="flex justify-center">
				<PillSelector
					options={[
						{ label: 'Play melodies', value: 'play' },
						{ label: 'Mute', value: 'mute' }
					]}
					selected={synthEnabled ? 'play' : 'mute'}
					onSelect={(value) => {
						synthEnabled = value === 'play';
					}}
				/>
			</div>

			<!-- Note labels -->
			<div class="flex justify-center">
				<details class="rounded-lg bg-dark-blue px-8 py-4 text-center">
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
									{item.note ? vexFlowToDisplay(item.note) : '--'}{i < melody.length - 1 ? ' ' : ''}
								</span>
							{/each}
						</p>
						<div class="my-2 border-t border-slate-600"></div>
						<p class="text-sm tracking-[0.08em] text-slate-300 uppercase">Detected</p>
						<div class="mt-2 flex flex-col items-center gap-2">
							<p class="text-2xl font-bold text-slate-300">
								{tuner.state.note ? vexFlowToDisplay(tuner.state.note) : '--'}
							</p>
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
					<p class="mt-2 text-lg font-bold text-green-600" role="status" aria-live="polite">
						✓ Correct!
					</p>
				{/if}

				<div class="mt-4 flex justify-center gap-2">
					<button
						type="button"
						onclick={refreshMelody}
						class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-px hover:bg-slate-200 hover:shadow"
					>
						Skip
					</button>
					<button
						type="button"
						onclick={playMelodyWithSynth}
						disabled={isPlayingMelody}
						class="rounded-lg bg-dark-blue px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-dark-blue-highlight hover:shadow disabled:cursor-not-allowed disabled:bg-slate-300"
					>
						{isPlayingMelody ? 'Playing...' : 'Play Melody'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
