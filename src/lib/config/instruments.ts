import type { Clef, InstrumentId } from './types';

export interface DetectionConfig {
	// Onset detection settings
	onsetRefractoryMs: number; // minimum time between onsets (prevents false retriggering)
	onsetMinAmplitude: number; // minimum amplitude for onset to trigger
	// Gentle note end detection
	endHoldMs: number; // how long low amplitude/pitch loss must persist
	endMinAmplitudeRatio: number; // relative to onsetMinAmplitude
	// Phase deviation detection
	usePhaseDeviation: boolean; // enable phase-based onset detection
	phaseWeight: number; // weight for phase deviation (0-1, rest goes to flux)
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
	onsetRefractoryMs: 100, // 100ms cooldown prevents vibrato/tremolo retriggering
	onsetMinAmplitude: 0.02, // minimum amplitude for onset
	endHoldMs: 150, // require ~150ms of low energy before ending
	endMinAmplitudeRatio: 0.3, // end threshold = onsetMinAmplitude * ratio
	usePhaseDeviation: true, // enable phase-based detection for repeat notes
	phaseWeight: 0.3 // 30% phase, 70% flux
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
		detectionConfig: genericDetectionConfig
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
		detectionConfig: genericDetectionConfig
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
