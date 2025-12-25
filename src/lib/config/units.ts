import type { NoteName } from '$lib/config/keys';
import type { Mode } from './keys';
import type { MelodyItem } from './melody';
import type { InstrumentId } from './types';

export type Units = Record<string, UnitMaterial>;

export type Speed = 'slow' | 'medium' | 'fast';

export interface TrackVariant {
	tempo: number;
	audioUrl: string;
	backingTrackUrl: string;
}

export interface UnitMaterial {
	code: string;
	instrument: InstrumentId;
	title: string;
	description: string;
	pieces: {
		code: string;
		label: string;
		tracks: Record<Speed, TrackVariant>;
		mode: Mode;
		key: NoteName;
		barLength: number;
		melody: MelodyItem[][];
		scale: MelodyItem[];
	}[];
	extraLinks?: { label: string; url: string }[];
}

export const fileStore = 'https://f002.backblazeb2.com/file/sharpestnote/unit';

export const units: Units = {
	'tw-v': {
		code: 'tw-v',
		instrument: 'violin',
		title: 'Twinkle Twinkle Little Star for Violin',
		description: 'See how the Sharpest Note materials work with a classic tune.',
		pieces: [
			{
				code: 'twinkle-twinkle-little-star',
				label: 'Twinkle Twinkle Little Star',
				tracks: {
					slow: {
						tempo: 60,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Violin+60BPM+Full+track.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Violin+60BPM+Backing+track.mp3'
					},
					medium: {
						tempo: 80,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Violin+80BPM+Full+track.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Violin+80BPM+Backing+track.mp3'
					},
					fast: {
						tempo: 100,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Violin+100BPM+Full+track.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Violin+100BPM+Backing+track.mp3'
					}
				},
				key: 'D',
				mode: 'major',
				barLength: 16,
				scale: [
					{ note: 'D4', length: 4 },
					{ note: 'E4', length: 4 },
					{ note: 'F#4', length: 4 },
					{ note: 'G4', length: 4 },
					{ note: 'A4', length: 4 },
					{ note: 'B4', length: 4 }
				],
				melody: [
					[
						{ note: 'D4', length: 4 },
						{ note: 'D4', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'B4', length: 4 },
						{ note: 'B4', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'G4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: 'F#4', length: 4 },
						{ note: 'F#4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: 'D4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'A4', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: 'F#4', length: 4 },
						{ note: 'F#4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'A4', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: 'F#4', length: 4 },
						{ note: 'F#4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'D4', length: 4 },
						{ note: 'D4', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'B4', length: 4 },
						{ note: 'B4', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'G4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: 'F#4', length: 4 },
						{ note: 'F#4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: 'D4', length: 4 },
						{ note: null, length: 4 }
					]
				]
			}
		]
	}
};

export const normalizeUnitCode = (code: string | null | undefined): string =>
	(code ?? '').trim().toLowerCase();

export const unitOptions = Object.values(units).map((unit) => ({
	value: unit.code,
	label: unit.title
}));

export const getUnitByCode = (code: string | null | undefined): UnitMaterial | null => {
	const normalized = normalizeUnitCode(code);
	return normalized ? (units[normalized] ?? null) : null;
};
