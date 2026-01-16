/**
 * Synth playback hook for the sight-reading game.
 * Handles melody playback with animated playhead and state management.
 */

import { onDestroy } from 'svelte';
import { createSynth } from '$lib/synth/useSynth.svelte';
import { DEFAULT_A4 } from '$lib/tuner/tune';
import type { MelodyItem } from '$lib/config/melody';
import { lengthToMs } from '$lib/config/melody';
import type { InstrumentId } from '$lib/config/types';
import { instrumentMap } from '$lib/config/instruments';

interface SightGameSynthConfig {
	getInstrument: () => InstrumentId;
	getTempoBPM?: () => number;
	onPlaybackStart?: () => void;
	onPlaybackEnd?: () => void;
}

export function useSightGameSynth(config: SightGameSynthConfig) {
	const { getInstrument, getTempoBPM, onPlaybackStart, onPlaybackEnd } = config;

	const selectedInstrument = $derived(instrumentMap[getInstrument()]);

	let synthEnabled = $state(true);
	let isPlayingMelody = $state(false);
	let playheadPosition = $state<number | null>(null);

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

	// Update synth with instrument-specific ADSR settings
	$effect(() => {
		if (selectedInstrument.adsrConfig) {
			synth.setOptions(selectedInstrument.adsrConfig);
		}
	});

	async function playMelodyWithSynth(melody: MelodyItem[]) {
		if (!melody || isPlayingMelody) return;

		isPlayingMelody = true;
		playheadPosition = 0;

		onPlaybackStart?.();

		try {
			let currentSixteenth = 0;
			const bpm = getTempoBPM?.() ?? 80;

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

			onPlaybackEnd?.();

			// Clear playhead after transition
			setTimeout(() => {
				playheadPosition = null;
			}, 500);
		}
	}

	// Cleanup
	onDestroy(() => {
		// Synth cleanup if needed
	});

	return {
		// State
		synthEnabled: () => synthEnabled,
		isPlayingMelody: () => isPlayingMelody,
		playheadPosition: () => playheadPosition,

		// Actions
		playMelodyWithSynth,
		setSynthEnabled: (enabled: boolean) => {
			synthEnabled = enabled;
		}
	};
}
