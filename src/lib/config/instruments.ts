import type { Clef, InstrumentId } from './types';

export interface DetectionConfig {
	// Onset detection settings
	onsetMinAmplitude: number; // minimum amplitude for onset to trigger
	// Gentle note end detection
	endHoldMs: number; // how long low amplitude/pitch loss must persist
	endMinAmplitudeRatio: number; // relative to onsetMinAmplitude
	endRelativeDropRatio: number; // end when amplitude falls below this fraction of post-onset peak
	// Phase deviation detection
	usePhaseDeviation: boolean; // enable phase-based onset detection
	phaseWeight: number; // weight for phase deviation (0-1, rest goes to flux)
	strongPhaseThreshold: number; // normalized phase (0-1) for strong onset (phase alone)
	moderatePhaseThreshold: number; // normalized phase (0-1) for moderate onset (phase + amplitude)
}

export interface InstrumentConfig {
	id: InstrumentId;
	label: string;
	clef: Clef;
	transpositionSemitones: number; // written -> sounding
	sustaining: boolean; // whether the instrument can sustain notes
	bottomNote: string; // lowest written note
	topNote: string; // highest written note
	detectionConfig: DetectionConfig;
	strings?: string[]; // open string tuning from lowest to highest
	adsrConfig?: {
		attack: number;
		decay: number;
		sustain: number;
		release: number;
	};
}

export const genericDetectionConfig: DetectionConfig = {
	onsetMinAmplitude: 0.1, // Minimum amplitude for onset to trigger
	endHoldMs: 40, // end sooner to allow rapid re-articulations
	endMinAmplitudeRatio: 0.3, // end threshold = onsetMinAmplitude * ratio
	endRelativeDropRatio: 0.8, // end when amplitude drops below 80% of peak since onset
	usePhaseDeviation: true, // enable phase-based detection for repeat notes
	phaseWeight: 0.2, // 20% phase, 80% flux
	strongPhaseThreshold: 0.1, // 20% of π - phase alone triggers onset (was hardcoded 0.25)
	moderatePhaseThreshold: 0.8 // 15% of π - phase + amplitude triggers (was hardcoded 0.18)
};

export const instrumentConfigs: InstrumentConfig[] = [
	{
		id: 'violin',
		label: 'Violin',
		clef: 'treble',
		sustaining: true,
		transpositionSemitones: 0,
		bottomNote: 'G3',
		topNote: 'G5',
		strings: ['G3', 'D4', 'A4', 'E5'],
		detectionConfig: {
			...genericDetectionConfig,
			endRelativeDropRatio: 0.3
		},
		adsrConfig: {
			attack: 0.05, // Slow bow attack
			decay: 0.15, // Gentle decay to sustain
			sustain: 0.85, // High sustain for bowed notes
			release: 0.15 // Smooth bow release
		}
	},
	{
		id: 'guitar',
		label: 'Guitar',
		clef: 'treble',
		sustaining: false,
		transpositionSemitones: -12, // sounds an octave lower than written
		bottomNote: 'E3',
		topNote: 'E5',
		strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
		detectionConfig: {
			...genericDetectionConfig,
			endRelativeDropRatio: 0.5
		},
		adsrConfig: {
			attack: 0.005, // Very fast pluck
			decay: 0.3, // Natural string decay
			sustain: 0.4, // Moderate sustain as string rings
			release: 0.2 // Gradual fade
		}
	},
	{
		id: 'viola',
		label: 'Viola',
		clef: 'alto',
		sustaining: true,
		transpositionSemitones: 0,
		bottomNote: 'C3',
		topNote: 'D5',
		strings: ['C3', 'G3', 'D4', 'A4'],
		detectionConfig: {
			...genericDetectionConfig,
			endRelativeDropRatio: 0.3
		},
		adsrConfig: {
			attack: 0.05, // Slow bow attack
			decay: 0.15, // Gentle decay
			sustain: 0.85, // High sustain for bowed notes
			release: 0.15 // Smooth bow release
		}
	},
	{
		id: 'cello',
		label: 'Cello',
		clef: 'bass',
		sustaining: true,
		transpositionSemitones: 0,
		bottomNote: 'C2',
		topNote: 'G4',
		strings: ['C2', 'G2', 'D3', 'A3'],
		detectionConfig: genericDetectionConfig,
		adsrConfig: {
			attack: 0.06, // Slightly slower bow attack for deeper tone
			decay: 0.2, // Rich decay
			sustain: 0.8, // Strong sustain
			release: 0.18 // Warm release
		}
	},
	{
		id: 'flute',
		label: 'Flute',
		clef: 'treble',
		sustaining: true,
		transpositionSemitones: 0,
		bottomNote: 'C4',
		topNote: 'C6',
		detectionConfig: genericDetectionConfig,
		adsrConfig: {
			attack: 0.03, // Quick breath attack
			decay: 0.08, // Short decay
			sustain: 0.9, // Very high sustain with steady breath
			release: 0.1 // Quick breath cutoff
		}
	},
	{
		id: 'recorder',
		label: 'Recorder',
		clef: 'treble',
		sustaining: true,
		transpositionSemitones: 12, // sounds an octave higher than written
		bottomNote: 'C4',
		topNote: 'C5',
		detectionConfig: genericDetectionConfig,
		adsrConfig: {
			attack: 0.02, // Very quick breath attack
			decay: 0.05, // Minimal decay
			sustain: 0.92, // Nearly full sustain
			release: 0.08 // Quick cutoff
		}
	}
];

export const instrumentMap: Record<InstrumentId, InstrumentConfig> = instrumentConfigs.reduce(
	(map, cfg) => {
		map[cfg.id] = cfg;
		return map;
	},
	{} as Record<InstrumentId, InstrumentConfig>
);

export const defaultInstrumentId: InstrumentId = 'violin';
