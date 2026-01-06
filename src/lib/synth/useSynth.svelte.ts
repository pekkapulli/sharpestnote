import { frequencyFromNoteNumber, DEFAULT_A4 } from '../tuner/tune';
import type { MelodyItem } from '$lib/config/melody';
import { noteNameToMidi } from './noteUtils';
import type { SynthOptions, SynthVoice } from './types';
// @ts-expect-error - no type definitions available
import reverb from 'soundbank-reverb';

/**
 * Create a synth voice for playing melody items.
 *
 * IMPORTANT FOR SAFARI COMPATIBILITY:
 * - The playNote() method must be called from a user gesture event (click, touch) on first use
 * - Do NOT call playNote() from within an async callback or after any awaits initially
 * - Safari (especially iOS) requires AudioContext to be created/resumed from user interaction
 * - After the first user gesture, subsequent calls can be made without user interaction
 */
export function createSynth(options: SynthOptions = {}): SynthVoice {
	let audioContext: AudioContext | null = null;
	let masterGain: GainNode | null = null;
	let dryGain: GainNode | null = null;
	let wetGain: GainNode | null = null;
	let reverbNode: AudioNode | null = null;
	const activeOscillators: Array<{ osc: OscillatorNode; gain: GainNode; pan?: StereoPannerNode }> =
		[];

	// Configuration
	let waveform: OscillatorType = options.waveform ?? 'sine';
	let a4 = options.a4 ?? DEFAULT_A4;
	let attack = options.attack ?? 0.01; // 10ms attack
	let decay = options.decay ?? 0.1; // 100ms decay
	let sustain = options.sustain ?? 0.7; // 70% sustain level
	let release = options.release ?? 0.05; // 50ms release
	let volume = options.volume ?? 0.3; // 30% volume by default
	let reverbMix = options.reverbMix ?? 0.3; // 30% wet by default
	let reverbDecay = options.reverbDecay ?? 2.5; // 2.5 second decay

	/**
	 * Initialize audio context and audio graph if not already done.
	 * Must be called from user interaction on first use.
	 */
	function ensureAudioContext() {
		if (!audioContext) {
			audioContext = new AudioContext();

			// Create dry/wet mixer
			dryGain = audioContext.createGain();
			wetGain = audioContext.createGain();
			masterGain = audioContext.createGain();

			// Create soundbank-reverb
			reverbNode = reverb(audioContext);
			// @ts-expect-error - soundbank-reverb has time and wet properties
			reverbNode.time = reverbDecay;
			// @ts-expect-error - soundbank-reverb properties
			reverbNode.wet.value = 1; // Reverb outputs 100% wet, we'll mix with dry
			// @ts-expect-error - soundbank-reverb properties
			reverbNode.dry.value = 0; // No dry in reverb, we'll use separate dry path

			// Set initial mix levels
			dryGain.gain.value = 1 - reverbMix;
			wetGain.gain.value = reverbMix;
			masterGain.gain.value = volume;

			// Audio graph: sources -> dryGain -> masterGain -> destination
			//                    \-> reverbNode -> wetGain -> masterGain
			dryGain.connect(masterGain);
			if (reverbNode) {
				reverbNode.connect(wetGain);
			}
			wetGain.connect(masterGain);
			masterGain.connect(audioContext.destination);
		}

		// Resume if suspended (handles browser autoplay policies)
		if (audioContext.state === 'suspended') {
			audioContext.resume();
		}
	}

	/**
	 * Play a single note from a MelodyItem
	 */
	async function playNote(item: MelodyItem, tempoBPM: number): Promise<void> {
		// Handle rests (null notes)
		if (item.note === null) {
			const sixteenthMs = 60000 / tempoBPM / 4;
			const durationMs = item.length * sixteenthMs;
			await new Promise((resolve) => setTimeout(resolve, durationMs));
			return;
		}

		ensureAudioContext();

		if (!audioContext || !dryGain || !reverbNode) {
			console.error('[Synth] AudioContext not initialized');
			return;
		}

		// Convert note name to frequency
		const midi = noteNameToMidi(item.note);
		if (midi === null) {
			console.error('[Synth] Invalid note name:', item.note);
			return;
		}

		const frequency = frequencyFromNoteNumber(midi, a4);

		// Calculate duration in milliseconds
		const sixteenthMs = 60000 / tempoBPM / 4;
		const durationMs = item.length * sixteenthMs;
		const durationSec = durationMs / 1000;

		// Create three oscillators for stereo width: center, left, right
		const voices: Array<{ osc: OscillatorNode; gain: GainNode; pan?: StereoPannerNode }> = [];

		// Center voice (main)
		const oscCenter = audioContext.createOscillator();
		const gainCenter = audioContext.createGain();
		oscCenter.type = waveform;
		oscCenter.frequency.value = frequency;
		oscCenter.connect(gainCenter);
		gainCenter.connect(dryGain);
		gainCenter.connect(reverbNode);
		voices.push({ osc: oscCenter, gain: gainCenter });

		const DETUNE = 5; // cents

		// Left voice (slightly detuned down, lower volume)
		const oscLeft = audioContext.createOscillator();
		const gainLeft = audioContext.createGain();
		const panLeft = audioContext.createStereoPanner();
		oscLeft.type = waveform;
		oscLeft.frequency.value = frequency;
		oscLeft.detune.value = -DETUNE; // 10 cents flat
		panLeft.pan.value = -0.5; // Pan left
		oscLeft.connect(gainLeft);
		gainLeft.connect(panLeft);
		panLeft.connect(dryGain);
		panLeft.connect(reverbNode);
		voices.push({ osc: oscLeft, gain: gainLeft, pan: panLeft });

		// Right voice (slightly detuned up, lower volume)
		const oscRight = audioContext.createOscillator();
		const gainRight = audioContext.createGain();
		const panRight = audioContext.createStereoPanner();
		oscRight.type = waveform;
		oscRight.frequency.value = frequency;
		oscRight.detune.value = DETUNE; // 10 cents sharp
		panRight.pan.value = 0.5; // Pan right
		oscRight.connect(gainRight);
		gainRight.connect(panRight);
		panRight.connect(dryGain);
		panRight.connect(reverbNode);
		voices.push({ osc: oscRight, gain: gainRight, pan: panRight });

		// Full ADSR Envelope - applied to all voices
		const now = audioContext.currentTime;
		const attackEndTime = now + attack;
		const decayEndTime = attackEndTime + decay;
		const noteEndTime = now + durationSec;
		const releaseStartTime = Math.max(decayEndTime, noteEndTime - release);

		voices.forEach((voice, index) => {
			const { gain } = voice;
			// Center voice: full amplitude, side voices: 40% amplitude for subtle width
			// Normalize to prevent summing distortion (1 + 0.4 + 0.4 = 1.8, so divide by 1.8)
			const rawAmplitude = index === 0 ? 1 : 0.4;
			const amplitude = rawAmplitude / 2;

			// Attack: 0 -> amplitude
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(amplitude, attackEndTime);

			// Decay: amplitude -> sustain level
			gain.gain.linearRampToValueAtTime(sustain * amplitude, decayEndTime);

			// Sustain: hold at sustain level until release
			if (releaseStartTime > decayEndTime) {
				gain.gain.setValueAtTime(sustain * amplitude, releaseStartTime);
			}

			// Release: sustain level -> 0
			gain.gain.linearRampToValueAtTime(0, noteEndTime);

			// Start and stop
			voice.osc.start(now);
			voice.osc.stop(noteEndTime);

			// Track active oscillator
			activeOscillators.push(voice);
		});

		// Clean up when done (only need to listen to one oscillator)
		voices[0].osc.onended = () => {
			voices.forEach((voice) => {
				const index = activeOscillators.indexOf(voice);
				if (index > -1) {
					activeOscillators.splice(index, 1);
				}
				voice.gain.disconnect();
				voice.osc.disconnect();
				voice.pan?.disconnect();
			});
		};

		// Wait for the note to finish
		await new Promise((resolve) => setTimeout(resolve, durationMs));
	}

	/**
	 * Stop all currently playing notes
	 */
	function stopAll() {
		const now = audioContext?.currentTime ?? 0;
		activeOscillators.forEach(({ osc, gain }) => {
			try {
				// Quick fade out to avoid clicks
				gain.gain.cancelScheduledValues(now);
				gain.gain.setValueAtTime(gain.gain.value, now);
				gain.gain.linearRampToValueAtTime(0, now + 0.01);
				osc.stop(now + 0.01);
			} catch {
				// Ignore if already stopped
			}
		});
		activeOscillators.length = 0;
	}

	/**
	 * Check if the synth is currently playing
	 */
	function isPlaying(): boolean {
		return activeOscillators.length > 0;
	}

	/**
	 * Update synth options
	 */
	function setOptions(opts: Partial<SynthOptions>) {
		if (opts.waveform !== undefined) waveform = opts.waveform;
		if (opts.a4 !== undefined) a4 = opts.a4;
		if (opts.attack !== undefined) attack = opts.attack;
		if (opts.decay !== undefined) decay = opts.decay;
		if (opts.sustain !== undefined) sustain = opts.sustain;
		if (opts.release !== undefined) release = opts.release;
		if (opts.volume !== undefined) {
			volume = opts.volume;
			if (masterGain) {
				masterGain.gain.value = volume;
			}
		}
		if (opts.reverbMix !== undefined) {
			reverbMix = opts.reverbMix;
			if (dryGain && wetGain) {
				dryGain.gain.value = 1 - reverbMix;
				wetGain.gain.value = reverbMix;
			}
		}
		if (opts.reverbDecay !== undefined) {
			reverbDecay = opts.reverbDecay;
			if (reverbNode) {
				// @ts-expect-error - soundbank-reverb properties
				reverbNode.time = reverbDecay;
			}
		}
	}

	return {
		playNote,
		stopAll,
		isPlaying,
		setOptions
	};
}
