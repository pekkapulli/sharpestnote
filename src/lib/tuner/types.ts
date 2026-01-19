import type { Accidental } from '$lib/tuner/tune';
import type { InstrumentId } from '$lib/config/types';

export type InstrumentKind = InstrumentId | 'generic';

export interface TunerState {
	isListening: boolean;
	frequency: number | null;
	cents: number | null;
	note: string | null;
	error: string | null;
	/** True when browser blocks AudioContext until user gesture */
	needsUserGesture?: boolean;
	devices: MediaDeviceInfo[];
	selectedDeviceId: string | null;
	amplitude: number;
	isNoteActive: boolean;
	hasPitch: boolean; // True when there's a stable pitch (even without onset)
	heldSixteenths: number;
	spectrum: Uint8Array | null;
	phases: Float32Array | null; // Phase angles in radians for each frequency bin
	lastOnsetRule: string | null; // Which rule triggered the most recent onset (A, B1, B2, B3, B4, B5, B6, C, D)
	spectralFlux: number; // Current frame spectral flux
	phaseDeviation: number; // Current frame phase deviation
	highFrequencyEnergy: number; // Energy above 3kHz (useful for onset detection)
	mlOnsetDetected: boolean; // ML model onset prediction (experimental)
	mlOnsetProbability: number; // ML model onset probability (0-1)
}

export interface TunerOptions {
	a4?: number;
	accidental?: Accidental;
	debounceTime?: number;
	amplitudeThreshold?: number;
	instrument?: InstrumentKind;
	tempoBPM?: number;
	gain?: number;
	autoGain?: boolean;
	targetAmplitude?: number;
	maxGain?: number;
	minGain?: number;
	gainAdjustRate?: number;
	autoGainInterval?: number;
	basePath?: string; // Base path for asset resolution
	debug?: boolean; // Enable debug logging
	onOnset?: (event: OnsetEvent) => void; // Callback when an onset is detected
}

export interface OnsetEvent {
	frequency: number; // Detected frequency in Hz
	note: string | null; // Detected note name (may not be debounced yet)
	rule: string | null; // Which rule triggered (A, B1, B2, B3, B4, B5, D)
	amplitude: number; // Current amplitude
	timestamp: number; // Performance.now() timestamp
}
