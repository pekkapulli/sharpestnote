import type { Accidental } from '$lib/tuner/tune';
import type { InstrumentId } from '$lib/config/types';

export type InstrumentKind = InstrumentId | 'generic';

export interface TunerState {
	isListening: boolean;
	frequency: number | null;
	cents: number | null;
	note: string | null;
	error: string | null;
	devices: MediaDeviceInfo[];
	selectedDeviceId: string | null;
	amplitude: number;
	isNoteActive: boolean;
	heldSixteenths: number;
	spectrum: Uint8Array | null;
	phases: Float32Array | null; // Phase angles in radians for each frequency bin
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
}
