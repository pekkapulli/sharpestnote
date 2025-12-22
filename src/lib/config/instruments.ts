import type { Clef, InstrumentId } from './types';

export interface InstrumentConfig {
	id: InstrumentId;
	label: string;
	clef: Clef;
	transpositionSemitones: number; // written -> sounding
	bottomNote: string; // lowest written note
	topNote: string; // highest written note
}

export const instrumentConfigs: InstrumentConfig[] = [
	{
		id: 'violin',
		label: 'Violin',
		clef: 'treble',
		transpositionSemitones: 0,
		bottomNote: 'G3',
		topNote: 'G5'
	},
	{
		id: 'guitar',
		label: 'Guitar',
		clef: 'treble',
		transpositionSemitones: -12, // sounds an octave lower than written
		bottomNote: 'E3',
		topNote: 'E5'
	},
	{
		id: 'viola',
		label: 'Viola',
		clef: 'alto',
		transpositionSemitones: 0,
		bottomNote: 'C3',
		topNote: 'D5'
	},
	{
		id: 'cello',
		label: 'Cello',
		clef: 'bass',
		transpositionSemitones: 0,
		bottomNote: 'C2',
		topNote: 'G4'
	},
	{
		id: 'flute',
		label: 'Flute',
		clef: 'treble',
		transpositionSemitones: 0,
		bottomNote: 'C4',
		topNote: 'C6'
	},
	{
		id: 'recorder',
		label: 'Recorder',
		clef: 'treble',
		transpositionSemitones: 12, // sounds an octave higher than written
		bottomNote: 'C4',
		topNote: 'C5'
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
