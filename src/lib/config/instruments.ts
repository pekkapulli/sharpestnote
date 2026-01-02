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
}

export const genericDetectionConfig: DetectionConfig = {
	onsetMinAmplitude: 0.15, // Minimum amplitude for onset to trigger
	endHoldMs: 60, // end sooner to allow rapid re-articulations
	endMinAmplitudeRatio: 0.3, // end threshold = onsetMinAmplitude * ratio
	endRelativeDropRatio: 0.8, // end when amplitude drops below 80% of peak since onset
	usePhaseDeviation: true, // enable phase-based detection for repeat notes
	phaseWeight: 0.3, // 30% phase, 70% flux
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
		detectionConfig: {
			...genericDetectionConfig,
			endRelativeDropRatio: 0.4
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
		detectionConfig: genericDetectionConfig
	},
	{
		id: 'viola',
		label: 'Viola',
		clef: 'alto',
		sustaining: true,
		transpositionSemitones: 0,
		bottomNote: 'C3',
		topNote: 'D5',
		detectionConfig: {
			...genericDetectionConfig,
			endRelativeDropRatio: 0.4
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
		detectionConfig: genericDetectionConfig
	},
	{
		id: 'flute',
		label: 'Flute',
		clef: 'treble',
		sustaining: true,
		transpositionSemitones: 0,
		bottomNote: 'C4',
		topNote: 'C6',
		detectionConfig: genericDetectionConfig
	},
	{
		id: 'recorder',
		label: 'Recorder',
		clef: 'treble',
		sustaining: true,
		transpositionSemitones: 12, // sounds an octave higher than written
		bottomNote: 'C4',
		topNote: 'C5',
		detectionConfig: genericDetectionConfig
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
