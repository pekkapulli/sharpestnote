/**
 * Core game logic for the sight-reading game.
 * Handles melody state, note detection, progression, and synth playback.
 */

import { onDestroy } from 'svelte';
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

interface SightGameConfig {
	getInstrument: () => InstrumentId;
	getKeyNote: () => string;
	getMode: () => Mode;
	getTempoBPM?: () => number;
	getMelody: () => MelodyItem[];
	getOnMelodyComplete?: () => (() => void) | undefined;
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
	let currentNoteSuccess = $state(false);
	let lastOnsetHeldSixteenths = $state<number>(0);
	let lastOnsetNoteIndex = $state<number>(-1);
	let synthEnabled = $state(true);
	let greatIntonationIndices = $state<number[]>([]);
	let isPlayingMelody = $state(false);
	let playheadPosition = $state<number | null>(null);
	let ignoreInputUntil = $state(0);

	// Create tuner with onset handler
	const tuner = createTuner({
		a4: DEFAULT_A4,
		accidental: 'sharp',
		debug: false,
		gain: 15,
		maxGain: 500,
		onOnset: (onsetData) => {
			const now = performance.now();
			if (now < ignoreInputUntil) return;
			if (!melody || !melody.length) return;
			if (showSuccess || isPlayingMelody) return;
			if (currentNoteSuccess) return;

			const target = melody[currentIndex].note;
			if (target === null) return;

			const detectedNote = onsetData.note;
			if (!detectedNote) return;
		}
	});

	// Create synth for playback
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

	// Update synth with instrument-specific ADSR settings
	$effect(() => {
		if (selectedInstrument.adsrConfig) {
			synth.setOptions(selectedInstrument.adsrConfig);
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
			lastOnsetHeldSixteenths = -1;
			lastOnsetNoteIndex = -1;
			greatIntonationIndices = [];

			// Reset tuner state
			tuner.resetHoldDuration();
			tuner.state.note = null;
			tuner.state.cents = null;
			tuner.state.isNoteActive = false;
			tuner.state.heldSixteenths = 0;

			// Schedule auto-play only after user has started listening
			if (synthEnabled && tuner.state.isListening) {
				setTimeout(() => {
					playMelodyWithSynth();
				}, 0);
			}
		}
	});

	// Detect new onsets by watching for heldSixteenths resetting
	$effect(() => {
		const held = tuner.state.heldSixteenths;
		const now = performance.now();

		if (now < ignoreInputUntil) {
			lastOnsetHeldSixteenths = Math.max(lastOnsetHeldSixteenths, 2);
			return;
		}

		const descendingAttack = held < 0.5 && lastOnsetHeldSixteenths >= 1;
		const risingFirstAttack =
			held >= 0.5 && lastOnsetHeldSixteenths < 0.2 && lastOnsetNoteIndex !== currentIndex;

		if (descendingAttack || risingFirstAttack) {
			const isNewNoteIndex = lastOnsetNoteIndex !== currentIndex;
			if (isNewNoteIndex) {
				currentNoteSuccess = false;
			}
			lastOnsetNoteIndex = currentIndex;
		}

		lastOnsetHeldSixteenths = held;
	});

	// Check if current note matches expected note
	const isCurrentNoteHit = $derived(() => {
		if (!melody || !melody.length || isPlayingMelody) return false;
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
		const playing = isPlayingMelody;
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

	// Watch for note being held long enough to count as success
	$effect(() => {
		const detectedNote = tuner.state.note;

		if (!melody || !melody.length) return;
		if (currentNoteSuccess) return;
		if (showSuccess || isPlayingMelody) return;
		if (!detectedNote) return;
		if (lastOnsetNoteIndex !== currentIndex) return;

		const target = melody[currentIndex].note;
		if (target === null) return;

		const expectedNote = selectedInstrument
			? transposeForTransposition(
					target,
					selectedInstrument.transpositionSemitones,
					keySignature.preferredAccidental
				)
			: target;

		if (detectedNote === expectedNote) {
			markNoteAsSuccess();
		}
	});

	// Handle rests automatically
	$effect(() => {
		if (melody && melody.length && currentIndex < melody.length && !showSuccess) {
			const currentNote = melody[currentIndex].note;

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
		if (currentNoteSuccess) return;

		currentNoteSuccess = true;

		// Track great intonation (within 15 cents)
		if (tuner.state.cents !== null && Math.abs(tuner.state.cents) < 15) {
			greatIntonationIndices.push(currentIndex);
		}

		advanceToNextNote();
	}

	function advanceToNextNote() {
		handleCorrectNote();
	}

	function handleCorrectNote() {
		if (melody) {
			if (currentIndex < melody.length - 1) {
				currentIndex += 1;
				currentNoteSuccess = false;
				lastOnsetNoteIndex = -1;
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

	async function playMelodyWithSynth() {
		if (!melody || isPlayingMelody) return;

		isPlayingMelody = true;
		playheadPosition = 0;

		tuner.pause();

		try {
			let currentSixteenth = 0;
			const bpm = getTempoBPM?.() ?? 100;

			for (const item of melody) {
				const noteLength = item.length;
				const noteDurationMs = lengthToMs(noteLength, bpm);
				const startTime = performance.now();

				const animatePlayhead = () => {
					const elapsed = performance.now() - startTime;
					const progress = Math.min(elapsed / noteDurationMs, 1);
					playheadPosition = currentSixteenth + progress * noteLength;

					if (progress < 1) {
						requestAnimationFrame(animatePlayhead);
					}
				};
				animatePlayhead();

				await synth.playNote(item, bpm);
				currentSixteenth += noteLength;
				playheadPosition = currentSixteenth;
			}
		} catch (err) {
			console.error('Error playing melody:', err);
		} finally {
			isPlayingMelody = false;

			// Reset tuner state
			tuner.resetHoldDuration();
			tuner.state.note = null;
			tuner.state.cents = null;
			tuner.state.isNoteActive = false;
			tuner.state.heldSixteenths = 0;

			// Unpause with cooldown
			setTimeout(() => {
				const cooldownMs = 700;
				ignoreInputUntil = performance.now() + cooldownMs;
				tuner.unpause();
			}, 400);

			// Clear playhead after transition
			setTimeout(() => {
				playheadPosition = null;
			}, 500);
		}
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
		synthEnabled: () => synthEnabled,
		isPlayingMelody: () => isPlayingMelody,
		playheadPosition: () => playheadPosition,
		greatIntonationIndices: () => greatIntonationIndices,

		// Derived values
		selectedInstrument,
		keySignature,
		isCurrentNoteHit,
		ghostNoteDisplay,

		// Tuner
		tuner,

		// Actions
		playMelodyWithSynth,
		setSynthEnabled: (enabled: boolean) => {
			synthEnabled = enabled;
		}
	};
}
