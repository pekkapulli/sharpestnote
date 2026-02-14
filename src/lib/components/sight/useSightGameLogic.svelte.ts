/**
 * Core game logic for the sight-reading game.
 * Handles melody state, note detection, and progression.
 */

import { onDestroy } from 'svelte';
import { createTuner } from '$lib/tuner/useTuner.svelte';
import { useSightGameSynth } from './useSightGameSynth.svelte';
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

interface SightGameConfig {
	getInstrument: () => InstrumentId;
	getKeyNote: () => string;
	getMode: () => Mode;
	getTempoBPM?: () => number;
	getMelody: () => MelodyItem[];
	getOnMelodyComplete?: () => (() => void) | undefined;
}

/**
 * Calculate cooldown duration in milliseconds based on note length and tempo.
 * Uses note length * 0.8 to allow detection after most of the note has played.
 */
function getNoteCooldownMs(noteLength: number, tempoBPM?: number): number {
	const bpm = tempoBPM ?? 100; // Default to 100 BPM if not provided
	const durationMs = lengthToMs(noteLength, bpm);
	return durationMs * 0.8; // 80% of note length
}

export function useSightGameLogic(config: SightGameConfig) {
	const { getInstrument, getKeyNote, getMode, getTempoBPM, getMelody, getOnMelodyComplete } =
		config;

	const selectedInstrument = $derived(instrumentMap[getInstrument()]);
	const keySignature = $derived(getKeySignature(getKeyNote(), getMode()));

	// Game state
	let melody = $state<MelodyItem[]>([]);
	let currentIndex = $state(0);
	let streak = $state(0);
	let showSuccess = $state(false);
	let currentTempoBPM = $state<number | undefined>(getTempoBPM?.());
	let currentNoteSuccess = $state(false);
	let lastOnsetNoteIndex = $state<number>(-1);
	let lastOnsetHeldSixteenths = $state<number>(0);
	let greatIntonationIndices = $state<number[]>([]);
	let ignoreInputUntil = $state(0);

	// Create tuner with onset handler
	const tuner = createTuner({
		a4: DEFAULT_A4,
		accidental: keySignature.preferredAccidental,
		debug: false,
		gain: 15,
		maxGain: 500,
		onsetMode: 'hybrid',
		onOnset: (onsetData) => {
			const now = performance.now();
			const held = tuner.state.heldSixteenths;

			if (now < ignoreInputUntil) return;
			if (!melody || !melody.length) return;
			if (showSuccess || sightSynth.isPlayingMelody()) return;

			// Filter spurious onsets: ignore if note is sustained AND we already successfully
			// detected this note (prevents multiple detections on single held note)
			const isNoteSustained = held > 2 && lastOnsetHeldSixteenths > 2;
			const alreadyDetectedThisNote = currentNoteSuccess && lastOnsetNoteIndex === currentIndex;

			if (isNoteSustained && alreadyDetectedThisNote) {
				lastOnsetHeldSixteenths = held;
				return;
			}

			// Update tracking for sustained note detection
			lastOnsetHeldSixteenths = held;

			const target = melody[currentIndex].note;
			if (target === null) return;

			const detectedNote = onsetData.note;
			if (!detectedNote) return;

			const expectedNote = selectedInstrument
				? transposeForTransposition(
						target,
						selectedInstrument.transpositionSemitones,
						keySignature.preferredAccidental
					)
				: target;

			// Immediate success on onset match (faster than waiting heldSixteenths)
			if (detectedNote === expectedNote) {
				const isNewNoteIndex = lastOnsetNoteIndex !== currentIndex;
				if (isNewNoteIndex) {
					currentNoteSuccess = false;
				}
				lastOnsetNoteIndex = currentIndex;
				markNoteAsSuccess();
				// Cooldown based on note length and tempo to avoid accidental onsets
				const effectiveTempo = currentTempoBPM ?? getTempoBPM?.();
				const cooldownMs = getNoteCooldownMs(melody[currentIndex].length, effectiveTempo);
				ignoreInputUntil = performance.now() + cooldownMs;
				return;
			}

			// Track onset even for wrong notes
			const isNewNoteIndex = lastOnsetNoteIndex !== currentIndex;
			if (isNewNoteIndex) {
				currentNoteSuccess = false;
			}
			lastOnsetNoteIndex = currentIndex;
			const effectiveTempo = currentTempoBPM ?? getTempoBPM?.();
			const cooldownMs = getNoteCooldownMs(melody[currentIndex].length, effectiveTempo);
			ignoreInputUntil = performance.now() + cooldownMs;
		}
	});

	// Create synth hook for melody playback
	const sightSynth = useSightGameSynth({
		getInstrument,
		getTempoBPM,
		onPlaybackStart: () => {
			tuner.pause();
		},
		onPlaybackEnd: () => {
			// Reset tuner state
			tuner.resetHoldDuration();
			tuner.state.note = null;
			tuner.state.cents = null;
			tuner.state.isNoteActive = false;
			tuner.state.heldSixteenths = 0;

			// Unpause with cooldown
			setTimeout(() => {
				const cooldownMs = 300;
				ignoreInputUntil = performance.now() + cooldownMs;
				tuner.unpause();
			}, 300);
		}
	});

	// Keep tuner accidental aligned with key signature
	$effect(() => {
		if (tuner) {
			tuner.accidental = keySignature.preferredAccidental;
		}
	});

	// Update tuner instrument
	$effect(() => {
		if (tuner) {
			tuner.instrument = getInstrument();
		}
	});

	// Track heldSixteenths even during cooldown periods
	$effect(() => {
		const held = tuner.state.heldSixteenths;
		const now = performance.now();

		if (now < ignoreInputUntil) {
			lastOnsetHeldSixteenths = Math.max(lastOnsetHeldSixteenths, held);
		}
	});

	// Watch for melody changes from parent and reset game
	$effect(() => {
		// Call getMelody to track reactive changes
		const incomingMelody = getMelody();
		if (incomingMelody && incomingMelody.length > 0) {
			// Deep copy to ensure reactivity
			melody = incomingMelody.map((i) => ({ ...i }));
			currentIndex = 0;
			showSuccess = false;
			currentNoteSuccess = false;
			lastOnsetNoteIndex = -1;
			lastOnsetHeldSixteenths = 0;
			greatIntonationIndices = [];

			// Reset tuner state
			tuner.resetHoldDuration();
			tuner.state.note = null;
			tuner.state.cents = null;
			tuner.state.isNoteActive = false;
			tuner.state.heldSixteenths = 0;

			// Schedule auto-play only after user has started listening
			if (sightSynth.synthEnabled() && tuner.state.isListening) {
				setTimeout(() => {
					sightSynth.playMelodyWithSynth(melody);
				}, 0);
			}
		}
	});

	// Check if current note matches expected note
	const isCurrentNoteHit = $derived(() => {
		if (!melody || !melody.length || sightSynth.isPlayingMelody()) return false;
		const target = melody[currentIndex].note;

		if (target === null) return true;
		if (!tuner.state.note) return false;
		if (lastOnsetNoteIndex !== currentIndex) return false;

		const expectedNote = selectedInstrument
			? transposeForTransposition(
					target,
					selectedInstrument.transpositionSemitones,
					keySignature.preferredAccidental
				)
			: target;

		const isHit = expectedNote === tuner.state.note;
		return isHit;
	});

	// Ghost note display (show detected note transposed for display)
	const ghostNoteDisplay = $derived(() => {
		const note = tuner.state.note;
		const playing = sightSynth.isPlayingMelody();
		const onsetIndex = lastOnsetNoteIndex;
		const curIndex = currentIndex;

		if (!playing && onsetIndex === curIndex && note) {
			const result = transposeDetectedForDisplay(
				note,
				selectedInstrument.transpositionSemitones,
				keySignature.preferredAccidental
			);
			return result;
		}
		return null;
	});

	// Handle rests automatically
	$effect(() => {
		if (melody && melody.length && currentIndex < melody.length && !showSuccess) {
			const currentNote = melody[currentIndex].note;

			if (currentNote === null) {
				const timeoutId = setTimeout(() => {
					handleCorrectNote();
				}, 100);

				return () => {
					clearTimeout(timeoutId);
				};
			}
		}
	});

	function markNoteAsSuccess() {
		if (currentNoteSuccess) return;

		currentNoteSuccess = true;

		// Track great intonation (within 15 cents)
		if (tuner.state.cents !== null && Math.abs(tuner.state.cents) < 15) {
			greatIntonationIndices.push(currentIndex);
		}

		handleCorrectNote();
	}

	function handleCorrectNote() {
		if (melody) {
			if (currentIndex < melody.length - 1) {
				currentIndex += 1;
				currentNoteSuccess = false;
				lastOnsetNoteIndex = -1;
				lastOnsetHeldSixteenths = 0; // Reset to allow next note detection
				return;
			}
		}

		// Melody completed
		showSuccess = true;
		streak += 1;

		// Wait for success animation to complete (300ms transition + buffer)
		setTimeout(() => {
			const callback = getOnMelodyComplete?.();
			if (callback) {
				callback();
			}
		}, 1000);
	}

	// Cleanup
	onDestroy(() => {
		tuner.destroy();
	});

	return {
		// State
		melody: () => melody,
		currentIndex: () => currentIndex,
		streak: () => streak,
		showSuccess: () => showSuccess,
		synthEnabled: sightSynth.synthEnabled,
		isPlayingMelody: sightSynth.isPlayingMelody,
		playheadPosition: sightSynth.playheadPosition,
		greatIntonationIndices: () => greatIntonationIndices,

		// Derived values
		selectedInstrument,
		keySignature,
		isCurrentNoteHit,
		ghostNoteDisplay,

		// Tuner
		tuner,

		// Actions
		playMelodyWithSynth: () => sightSynth.playMelodyWithSynth(melody),
		setSynthEnabled: sightSynth.setSynthEnabled,
		updateSynthTempo: (tempo: number) => {
			currentTempoBPM = tempo;
			sightSynth.updateTempo(tempo);
		},
		stopMelody: sightSynth.stopMelody
	};
}
