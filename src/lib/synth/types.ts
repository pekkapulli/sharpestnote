export interface SynthOptions {
	waveform?: OscillatorType; // 'sine', 'square', 'sawtooth', 'triangle'
	a4?: number; // Reference A4 frequency (default 442)
	attack?: number; // Attack time in seconds
	decay?: number; // Decay time in seconds
	sustain?: number; // Sustain level (0-1)
	release?: number; // Release time in seconds
	volume?: number; // Master volume (0-1)
	reverbMix?: number; // Reverb wet/dry mix (0 = dry, 1 = wet)
	reverbDecay?: number; // Reverb decay time (1-10 seconds)
}

export interface SynthVoice {
	/**
	 * Play a single note from a MelodyItem
	 * @param item The melody item containing note and duration information
	 * @param tempoBPM The tempo in beats per minute for calculating duration
	 */
	playNote: (item: import('$lib/config/melody').MelodyItem, tempoBPM: number) => Promise<void>;

	/**
	 * Stop all currently playing notes
	 */
	stopAll: () => void;

	/**
	 * Check if the synth is currently playing
	 */
	isPlaying: () => boolean;

	/**
	 * Update synth options
	 */
	setOptions: (options: Partial<SynthOptions>) => void;
}
