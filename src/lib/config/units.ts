import type { NoteName } from '$lib/config/keys';
import type { Mode } from './keys';
import type { MelodyItem } from './melody';
import type { InstrumentId } from './types';

export type Units = Record<string, UnitMaterial>;

export type Speed = 'slow' | 'medium' | 'fast';

export interface Piece {
	code: string;
	label: string;
	tracks: Record<Speed, TrackVariant>;
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
	published?: boolean;
	code: string;
	instrument: InstrumentId;
	title: string;
	description: string;
	gumroadUrl: string;
	pieces: Piece[];
	extraLinks?: { label: string; url: string }[];
}

export const fileStore = 'https://f002.backblazeb2.com/file/sharpestnote/unit';

export const units: Units = {
	'tw-v': {
		published: true,
		code: 'tw-v',
		instrument: 'violin',
		title: 'Twinkle Twinkle Little Star for Violin',
		description:
			'A musical, playable way to practice Twinkle — phrase by phrase, by ear, and with real accompaniment. Free demo from The Sharpest Note.',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/twinkle-violin',
		pieces: [
			{
				code: 'twinkle-twinkle-little-star',
				label: 'Twinkle Twinkle Little Star',
				notationStartPercent: 0.118,
				notationEndPercent: 0.794,
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
					{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
					{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
					{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
					{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
					{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
					{ note: 'B4', length: 4, finger: 1, string: 'Mom' }
				],
				melody: [
					[
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'B4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'B4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'B4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'B4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: null, length: 4 }
					]
				]
			}
		]
	},
	'tw-va': {
		code: 'tw-va',
		instrument: 'viola',
		title: 'Twinkle Twinkle Little Star for Viola',
		description: 'See how the Sharpest Note materials work with a classic tune.',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/twinkle-viola',
		pieces: [
			{
				code: 'twinkle-twinkle-little-star',
				label: 'Twinkle Twinkle Little Star',
				notationStartPercent: 0.118,
				notationEndPercent: 0.794,
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
					{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
					{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
					{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
					{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
					{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
					{ note: 'B4', length: 4, finger: 1, string: 'Mom' }
				],
				melody: [
					[
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'B4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'B4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'B4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'B4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'G4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'F#4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: null, length: 4 }
					]
				]
			}
		]
	},
	'tw-r': {
		published: false,
		code: 'tw-r',
		instrument: 'recorder',
		title: 'Twinkle Twinkle Little Star for Recorder',
		description:
			'A musical, playable way to practice Twinkle — phrase by phrase, by ear, and with real accompaniment. Free demo from The Sharpest Note.',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/twinkle-recorder',
		pieces: [
			{
				code: 'twinkle-twinkle-little-star',
				label: 'Twinkle Twinkle Little Star',
				notationStartPercent: 0.118,
				notationEndPercent: 0.794,
				tracks: {
					slow: {
						tempo: 80,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Recorder+80BPM+Full+track.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Recorder+80BPM+Backing+track.mp3'
					},
					medium: {
						tempo: 90,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Recorder+90BPM+Full+track.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Recorder+90BPM+Backing+track.mp3'
					},
					fast: {
						tempo: 100,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Recorder+100BPM+Full+track.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Recorder+100BPM+Backing+track.mp3'
					}
				},
				key: 'C',
				mode: 'major',
				barLength: 16,
				scale: [
					{ note: 'C4', length: 4 },
					{ note: 'D4', length: 4 },
					{ note: 'E4', length: 4 },
					{ note: 'F4', length: 4 },
					{ note: 'G4', length: 4 },
					{ note: 'A4', length: 4 }
				],
				melody: [
					[
						{ note: 'C4', length: 4 },
						{ note: 'C4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'F4', length: 4 },
						{ note: 'F4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: 'D4', length: 4 },
						{ note: 'D4', length: 4 },
						{ note: 'C4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'G4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: 'F4', length: 4 },
						{ note: 'F4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: 'D4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'G4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: 'F4', length: 4 },
						{ note: 'F4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: 'D4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'C4', length: 4 },
						{ note: 'C4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'G4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'F4', length: 4 },
						{ note: 'F4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: 'E4', length: 4 },
						{ note: 'D4', length: 4 },
						{ note: 'D4', length: 4 },
						{ note: 'C4', length: 4 },
						{ note: null, length: 4 }
					]
				]
			}
		]
	},
	'tw-c': {
		code: 'tw-c',
		instrument: 'cello',
		title: 'Twinkle Twinkle Little Star for Cello',
		description: 'See how the Sharpest Note materials work with a classic tune.',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/twinkle-cello',
		pieces: [
			{
				code: 'twinkle-twinkle-little-star',
				label: 'Twinkle Twinkle Little Star',
				notationStartPercent: 0.118,
				notationEndPercent: 0.794,
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
					{ note: 'D3', length: 4, finger: 0, string: 'Dad' },
					{ note: 'E3', length: 4, finger: 1, string: 'Dad' },
					{ note: 'F#3', length: 4, finger: 2, string: 'Dad' },
					{ note: 'G3', length: 4, finger: 3, string: 'Dad' },
					{ note: 'A3', length: 4, finger: 0, string: 'Mom' },
					{ note: 'B3', length: 4, finger: 1, string: 'Mom' }
				],
				melody: [
					[
						{ note: 'D3', length: 4, finger: 0, string: 'Dad' },
						{ note: 'D3', length: 4, finger: 0, string: 'Dad' },
						{ note: 'A3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'B3', length: 4, finger: 1, string: 'Mom' },
						{ note: 'B3', length: 4, finger: 1, string: 'Mom' },
						{ note: 'A3', length: 4, finger: 0, string: 'Mom' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'G3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'G3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'F#3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'F#3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'E3', length: 4, finger: 1, string: 'Dad' },
						{ note: 'E3', length: 4, finger: 1, string: 'Dad' },
						{ note: 'D3', length: 4, finger: 0, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'A3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'G3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'G3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'F#3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'F#3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'E3', length: 4, finger: 1, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'A3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'G3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'G3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'F#3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'F#3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'E3', length: 4, finger: 1, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'D3', length: 4, finger: 0, string: 'Dad' },
						{ note: 'D3', length: 4, finger: 0, string: 'Dad' },
						{ note: 'A3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'B3', length: 4, finger: 1, string: 'Mom' },
						{ note: 'B3', length: 4, finger: 1, string: 'Mom' },
						{ note: 'A3', length: 4, finger: 0, string: 'Mom' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'G3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'G3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'F#3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'F#3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'E3', length: 4, finger: 1, string: 'Dad' },
						{ note: 'E3', length: 4, finger: 1, string: 'Dad' },
						{ note: 'D3', length: 4, finger: 0, string: 'Dad' },
						{ note: null, length: 4 }
					]
				]
			}
		]
	},
	'1st-finger-nature-va': {
		code: '1st-finger-nature-va',
		instrument: 'viola',
		title: 'First-finger Nature Pieces for Viola',
		description: 'Musical pieces for first-finger performance.',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/first-finger-nature-viola',
		pieces: [
			{
				code: 'in-the-wind',
				label: 'In the Wind',
				notationStartPercent: 0.18,
				notationEndPercent: 0.88,
				tracks: {
					slow: {
						tempo: 90,
						audioUrl: 'In+the+Wind+Viola+90BPM+Full+track.mp3',
						backingTrackUrl: 'In+the+Wind+Viola+90BPM+Backing+track.mp3'
					},
					medium: {
						tempo: 100,
						audioUrl: 'In+the+Wind+Viola+100BPM+Full+track.mp3',
						backingTrackUrl: 'In+the+Wind+Viola+100BPM+Backing+track.mp3'
					},
					fast: {
						tempo: 110,
						audioUrl: 'In+the+Wind+Viola+110BPM+Full+track.mp3',
						backingTrackUrl: 'In+the+Wind+Viola+110BPM+Backing+track.mp3'
					}
				},
				key: 'D',
				mode: 'major',
				barLength: 16,
				scale: [
					{ note: 'G3', length: 4, finger: 0, string: 'Bear' },
					{ note: 'A3', length: 4, finger: 1, string: 'Bear' },
					{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
					{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
					{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
					{ note: 'B4', length: 4, finger: 1, string: 'Mom' }
				],
				melody: [
					[
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A4', length: 8, finger: 0, string: 'Mom' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A4', length: 8, finger: 0, string: 'Mom' }
					],
					[
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'B4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'D4', length: 8, finger: 0, string: 'Dad' },
						{ note: null, length: 8 }
					],
					[
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A4', length: 8, finger: 0, string: 'Mom' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'A4', length: 8, finger: 0, string: 'Mom' }
					],
					[
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'B4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'D4', length: 8, finger: 0, string: 'Dad' },
						{ note: null, length: 8 }
					],
					[
						{ note: 'G3', length: 4, finger: 0, string: 'Bear' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'D4', length: 8, finger: 0, string: 'Dad' },
						{ note: 'G3', length: 4, finger: 0, string: 'Bear' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'D4', length: 8, finger: 0, string: 'Dad' }
					],
					[
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'A4', length: 8, finger: 0, string: 'Mom' },
						{ note: null, length: 8 }
					],
					[
						{ note: 'G3', length: 4, finger: 0, string: 'Bear' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'D4', length: 8, finger: 0, string: 'Dad' },
						{ note: 'G3', length: 4, finger: 0, string: 'Bear' },
						{ note: 'D4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'D4', length: 8, finger: 0, string: 'Dad' }
					],
					[
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'B4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'A4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'E4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'D4', length: 8, finger: 0, string: 'Dad' },
						{ note: null, length: 8 }
					]
				]
			},
			{
				code: 'raindrops',
				label: 'Raindrops',
				notationStartPercent: 0.182,
				notationEndPercent: 0.864,
				tracks: {
					slow: {
						tempo: 90,
						audioUrl: 'Raindrops+Viola+90BPM+Full+track.mp3',
						backingTrackUrl: 'Raindrops+Viola+90BPM+Backing+track.mp3'
					},
					medium: {
						tempo: 100,
						audioUrl: 'Raindrops+Viola+100BPM+Full+track.mp3',
						backingTrackUrl: 'Raindrops+Viola+100BPM+Backing+track.mp3'
					},
					fast: {
						tempo: 110,
						audioUrl: 'Raindrops+Viola+110BPM+Full+track.mp3',
						backingTrackUrl: 'Raindrops+Viola+110BPM+Backing+track.mp3'
					}
				},
				key: 'C',
				mode: 'major',
				barLength: 16,
				scale: [
					{ note: 'G3', length: 4 },
					{ note: 'A3', length: 4 },
					{ note: 'D4', length: 4 },
					{ note: 'E4', length: 4 },
					{ note: 'A4', length: 4 },
					{ note: 'B4', length: 4 }
				],
				melody: [
					[
						{ note: 'G3', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'G3', length: 4 },
						{ note: 'B4', length: 4 }
					],
					[
						{ note: 'D4', length: 4 },
						{ note: 'B4', length: 2 },
						{ note: 'D4', length: 2 },
						{ note: 'E4', length: 4 },
						{ note: 'B4', length: 4 }
					],
					[
						{ note: 'G3', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'G3', length: 4 },
						{ note: 'B4', length: 4 }
					],
					[
						{ note: 'D4', length: 4 },
						{ note: 'B4', length: 2 },
						{ note: 'D4', length: 2 },
						{ note: 'A4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'G3', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'G3', length: 4 },
						{ note: 'B4', length: 4 }
					],
					[
						{ note: 'D4', length: 4 },
						{ note: 'B4', length: 2 },
						{ note: 'D4', length: 2 },
						{ note: 'E4', length: 4 },
						{ note: 'B4', length: 4 }
					],
					[
						{ note: 'G3', length: 4 },
						{ note: 'A4', length: 4 },
						{ note: 'G3', length: 4 },
						{ note: 'B4', length: 4 }
					],
					[
						{ note: 'D4', length: 4 },
						{ note: 'B4', length: 2 },
						{ note: 'G3', length: 2 },
						{ note: 'G3', length: 8 }
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
