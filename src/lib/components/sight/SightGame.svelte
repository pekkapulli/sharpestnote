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
	let lastOnsetNoteIndex = $state<number>(-1); // Track which note index had the last onset
	let advanceTimeoutId: number | null = null;
	let synthEnabled = $state(true);
	let greatIntonationIndices = $state<number[]>([]);

	const tuner = createTuner({
		a4: DEFAULT_A4,
		accidental: 'sharp',
		debug: false,
		gain: 15,
		maxGain: 500,
		onOnset: handleOnset()
	});

	function handleOnset():
		| ((
				event: import('/Users/pekkapulli/Documents/pekkapulli/Projects/sharpestnote/src/lib/tuner/types').OnsetEvent
		  ) => void)
		| undefined {
		return (onsetData) => {
			// Check if this onset is for the current note we're expecting
			const now = performance.now();
			if (now < ignoreInputUntil) return;
			if (!melody || !melody.length) return;
			if (showSuccess || isPlayingMelody) return;
			if (currentNoteSuccess) return; // Already succeeded on current note

			const target = melody[currentIndex].note;
			if (target === null) return; // Skip rests

			const detectedNote = onsetData.note;
			if (!detectedNote) return;

			const expectedNote = selectedInstrument
				? transposeForTransposition(
						target,
						selectedInstrument.transpositionSemitones,
						keySignature.preferredAccidental
					)
				: target;

			if (detectedNote === expectedNote) {
				console.log('[onOnset] Correct note detected!', {
					detectedNote,
					expectedNote,
					currentIndex,
					held: tuner.state.heldSixteenths
				});
				// Wait for note to be held for at least 1 sixteenth before marking success
				// We'll check this in a separate effect that watches heldSixteenths
			}
		};
	}

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
	let ignoreInputUntil = $state(0); // Timestamp; ignore tuner until this time after unpausing
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
		const now = performance.now();

		// Ignore input right after unpausing to let synth tail dissipate
		if (now < ignoreInputUntil) {
			// Prime onset detector but do not disturb current held value
			lastOnsetHeldSixteenths = Math.max(lastOnsetHeldSixteenths, 2);
			return;
		}

		const descendingAttack = held < 0.5 && lastOnsetHeldSixteenths >= 1; // new strike after a held note
		const risingFirstAttack =
			held >= 0.5 && lastOnsetHeldSixteenths < 0.2 && lastOnsetNoteIndex !== currentIndex; // first note or new note after reset

		if (descendingAttack || risingFirstAttack) {
			// Accept new onsets even if currentNoteSuccess is true (since we don't animate anymore)
			// Only reset note success if this onset belongs to a different note index
			const isNewNoteIndex = lastOnsetNoteIndex !== currentIndex;
			if (isNewNoteIndex) {
				currentNoteSuccess = false;
				lastSuccessNote = null;
			}
			lastOnsetNoteIndex = currentIndex; // Mark that this note index had an onset
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
		// Require an onset for the current note before we treat it as a hit
		if (lastOnsetNoteIndex !== currentIndex) return false;
		const expectedNote = selectedInstrument
			? transposeForTransposition(
					target,
					selectedInstrument.transpositionSemitones,
					keySignature.preferredAccidental
				)
			: target;
		const isHit = expectedNote === tuner.state.note;
		if (isHit) {
			console.log('[isCurrentNoteHit] Returning TRUE - note matches!', {
				expectedNote,
				detectedNote: tuner.state.note,
				currentIndex,
				lastOnsetNoteIndex
			});
		}
		return isHit;
	});

	const ghostNoteDisplay = $derived(
		!isPlayingMelody && lastOnsetNoteIndex === currentIndex && tuner.state.note
			? selectedInstrument
				? transposeDetectedForDisplay(
						tuner.state.note,
						selectedInstrument.transpositionSemitones,
						keySignature.preferredAccidental
					)
				: tuner.state.note
			: null
	);

	// Watch for note being held long enough to count as success
	$effect(() => {
		const held = tuner.state.heldSixteenths;
		const detectedNote = tuner.state.note;

		// Skip if conditions aren't met
		if (!melody || !melody.length) return;
		if (currentNoteSuccess) return; // Already succeeded
		if (showSuccess || isPlayingMelody) return;
		if (!detectedNote) return;
		if (lastOnsetNoteIndex !== currentIndex) return; // No onset detected for this index yet
		if (held < 1) return; // Not held long enough

		const target = melody[currentIndex].note;
		if (target === null) return; // Skip rests

		const expectedNote = selectedInstrument
			? transposeForTransposition(
					target,
					selectedInstrument.transpositionSemitones,
					keySignature.preferredAccidental
				)
			: target;

		if (detectedNote === expectedNote) {
			console.log('[Effect] Note held long enough - marking as success', {
				detectedNote,
				held,
				currentIndex
			});
			markNoteAsSuccess();
		}
	});

	// Handle rests automatically
	$effect(() => {
		if (melody && melody.length && currentIndex < melody.length && !showSuccess) {
			const currentNote = melody[currentIndex].note;

			// If current note is a rest (null), automatically advance after 100ms
			if (currentNote === null) {
				const timeoutId = setTimeout(() => {
					advanceToNextNote();
				}, 100);

				return () => {
					clearTimeout(timeoutId);
				};
			}
		}
	});

	function markNoteAsSuccess() {
		if (currentNoteSuccess) {
			return; // Already marked as success
		}
		console.log('[markNoteAsSuccess] Marking note as success at index', currentIndex);
		currentNoteSuccess = true;
		lastSuccessNote = tuner.state.note;

		// Track great intonation (within 15 cents)
		if (tuner.state.cents !== null && Math.abs(tuner.state.cents) < 15) {
			greatIntonationIndices.push(currentIndex);
		}

		// Clear any existing advance timeout
		if (advanceTimeoutId !== null) {
			clearTimeout(advanceTimeoutId);
		}

		// Wait 100ms before advancing to allow the current note to register
		console.log('[markNoteAsSuccess] Setting timeout to advance in 100ms');
		advanceTimeoutId = setTimeout(() => {
			console.log('[setTimeout callback] Executing after 100ms, calling advanceToNextNote');
			advanceTimeoutId = null;
			advanceToNextNote();
		}, 100) as unknown as number;
	}

	function advanceToNextNote() {
		console.log('[advanceToNextNote] Advancing from index', currentIndex);
		// Just advance - handleCorrectNote will reset the state
		handleCorrectNote();
	}

	function refreshMelody() {
		// Clear any pending timeout
		if (advanceTimeoutId !== null) {
			clearTimeout(advanceTimeoutId);
			advanceTimeoutId = null;
		}
		// Reset state
		greatIntonationIndices = [];

		const nextMelody = newMelody ? newMelody() : [];
		// Deep copy to guarantee a new reference and avoid stale reactivity
		melody = nextMelody.map((i) => ({ ...i }));
		currentIndex = 0;
		showSuccess = false;
		lastSuccessNote = null;
		currentNoteSuccess = false;
		lastOnsetHeldSixteenths = -1;
		lastOnsetNoteIndex = -1;

		// Reset tuner state to prevent prior note from lighting up the first note of the new phrase
		tuner.resetHoldDuration();
		tuner.state.note = null;
		tuner.state.cents = null;
		tuner.state.isNoteActive = false;
		tuner.state.heldSixteenths = 0;

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

		// Pause tuner during synth playback to prevent audio feedback
		tuner.pause();

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
			// Reset tuner state before unpausing
			tuner.resetHoldDuration();
			tuner.state.note = null;
			tuner.state.cents = null;
			tuner.state.isNoteActive = false;
			tuner.state.heldSixteenths = 0;
			// Unpause after a short tail-off, then ignore input for a cooldown window
			setTimeout(() => {
				const cooldownMs = 700;
				ignoreInputUntil = performance.now() + cooldownMs;
				tuner.unpause();
			}, 400);
			// Delay clearing playhead to allow CSS fade-out transition to complete
			setTimeout(() => {
				playheadPosition = null;
			}, 500); // Match the CSS transition duration
		}
	}

	function handleCorrectNote() {
		console.log(
			'[handleCorrectNote] Called at index',
			currentIndex,
			'melody length:',
			melody?.length
		);
		// Advance within melody first
		if (melody) {
			if (currentIndex < melody.length - 1) {
				console.log(
					'[handleCorrectNote] Advancing index from',
					currentIndex,
					'to',
					currentIndex + 1
				);
				currentIndex += 1;
				currentNoteSuccess = false; // Reset for next note
				lastOnsetNoteIndex = -1; // Always require new onset for next note
				console.log('[handleCorrectNote] New index is now', currentIndex);
				return;
			}
		}

		// Melody completed
		console.log('[handleCorrectNote] Melody completed!');
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
					animatingIndex={null}
					animationProgress={null}
					{playheadPosition}
					ghostNote={ghostNoteDisplay}
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
