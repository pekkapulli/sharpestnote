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
	heldSixteenths: number;
	spectrum: Uint8Array | null;
	phases: Float32Array | null; // Phase angles in radians for each frequency bin
	lastOnsetRule: string | null; // Which rule triggered the most recent onset (A, B1, B2, B3, B4, B5, B6, C, D)
	spectralFlux: number; // Current frame spectral flux
	phaseDeviation: number; // Current frame phase deviation
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
	debug?: boolean; // Enable debug logging
}
