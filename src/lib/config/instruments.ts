import type { Clef, InstrumentId } from './types';

export interface InstrumentConfig {
	id: InstrumentId;
	label: string;
	clef: Clef;
	transpositionSemitones: number; // written -> sounding
	writtenRange: string[]; // note names (written)
}

export const instrumentConfigs: InstrumentConfig[] = [
	{
		id: 'violin',
		label: 'Violin',
		clef: 'treble',
		transpositionSemitones: 0,
		writtenRange: [
			'G3',
			'A3',
			'B3',
			'C4',
			'D4',
			'E4',
			'F4',
			'G4',
			'A4',
			'B4',
			'C5',
			'D5',
			'E5',
			'F5',
			'G5'
		]
	},
	{
		id: 'guitar',
		label: 'Guitar',
		clef: 'treble',
		transpositionSemitones: -12, // sounds an octave lower than written
		writtenRange: [
			'E3',
			'F3',
			'G3',
			'A3',
			'B3',
			'C4',
			'D4',
			'E4',
			'F4',
			'G4',
			'A4',
			'B4',
			'C5',
			'D5',
			'E5'
		]
	},
	{
		id: 'viola',
		label: 'Viola',
		clef: 'alto',
		transpositionSemitones: 0,
		writtenRange: [
			'C3',
			'D3',
			'E3',
			'F3',
			'G3',
			'A3',
			'B3',
			'C4',
			'D4',
			'E4',
			'F4',
			'G4',
			'A4',
			'B4',
			'C5',
			'D5'
		]
	},
	{
		id: 'cello',
		label: 'Cello',
		clef: 'bass',
		transpositionSemitones: 0,
		writtenRange: [
			'C2',
			'D2',
			'E2',
			'F2',
			'G2',
			'A2',
			'B2',
			'C3',
			'D3',
			'E3',
			'F3',
			'G3',
			'A3',
			'B3',
			'C4',
			'D4',
			'E4',
			'F4',
			'G4'
		]
	},
	{
		id: 'recorder',
		label: 'Recorder',
		clef: 'treble',
		transpositionSemitones: 12, // sounds an octave higher than written
		writtenRange: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
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
