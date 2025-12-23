import type { Clef, InstrumentId } from './types';

export interface DetectionConfig {
	spectralFluxThreshold: number;
	highFluxFrameThreshold: number;
	amplitudeDropThreshold: number;
	amplitudeRecoveryThreshold: number;
	highFreqBurstThreshold: number;
	highFreqBurstFrameThreshold: number;
	burstRequiresDecay: boolean;
	burstMinDecayRatio: number;
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
	spectralFluxThreshold: 0.15,
	highFluxFrameThreshold: 1,
	amplitudeDropThreshold: 2,
	amplitudeRecoveryThreshold: 0.7,
	highFreqBurstThreshold: 0.8,
	highFreqBurstFrameThreshold: 2,
	burstRequiresDecay: false,
	burstMinDecayRatio: 0.7
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
			highFreqBurstThreshold: 0.8,
			highFreqBurstFrameThreshold: 2,
			burstRequiresDecay: false
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
		detectionConfig: {
			...genericDetectionConfig,
			highFreqBurstThreshold: 1.4,
			highFreqBurstFrameThreshold: 3,
			burstRequiresDecay: true,
			burstMinDecayRatio: 0.65
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
		detectionConfig: {
			...genericDetectionConfig
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
		detectionConfig: {
			...genericDetectionConfig
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
		detectionConfig: {
			...genericDetectionConfig,
			highFreqBurstThreshold: 0.8,
			highFreqBurstFrameThreshold: 2,
			burstRequiresDecay: false
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
		detectionConfig: {
			...genericDetectionConfig
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
