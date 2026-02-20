import type { Mode, NoteName } from './keys';
import type { MelodyItem } from './melody';

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

export type Units = Record<string, UnitMaterial>;

export type Speed = 'slow' | 'medium' | 'fast';

export interface Piece {
	code: string;
	label: string;
	composer: string;
	arranger: string;
	practiceTempi?: { [key in Speed]?: number };
	tracks?: Record<Speed, TrackVariant>;
	mode: Mode;
	key: NoteName;
	barLength: number;
	melody: MelodyItem[][];
	scale: MelodyItem[];
	notationStartPercent: number;
	notationEndPercent: number;
}

export interface TrackVariant {
	tempo: number;
	audioUrl: string;
	backingTrackUrl: string;
}

export interface UnitMaterial {
	published: boolean;
	demo?: string;
	code: string;
	instrument: InstrumentId;
	title: string;
	description: string;
	gumroadUrl: string;
	pieces: Piece[];
	extraLinks?: { label: string; url: string }[];
	photo?: {
		url: string;
		credit: string;
	};
}
