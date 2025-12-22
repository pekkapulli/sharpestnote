export type InstrumentId = 'violin' | 'guitar' | 'viola' | 'cello' | 'flute' | 'recorder';

export type Clef = 'treble' | 'alto' | 'bass';

export interface StaffLine {
	position: number;
	label: string;
}

export interface StaffLayout {
	clef: Clef;
	basePositions: Record<string, number>;
	staffLines: StaffLine[];
}
