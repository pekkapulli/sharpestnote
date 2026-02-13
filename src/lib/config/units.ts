import type { NoteName } from '$lib/config/keys';
import type { Mode } from './keys';
import type { MelodyItem } from './melody';
import type { InstrumentId } from './types';

export type Units = Record<string, UnitMaterial>;

export type Speed = 'slow' | 'medium' | 'fast';

export interface Piece {
	code: string;
	label: string;
	composer: string;
	arranger: string;
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
	published?: boolean;
	demo?: string;
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
		demo: 'Twinkle-Violin.pdf',
		code: 'tw-v',
		instrument: 'violin',
		title: 'Twinkle Twinkle Little Star for Violin',
		description:
			'A musical, playable way for violin students to practice Twinkle — phrase by phrase, by ear, and with real accompaniment. Free demo from The Sharpest Note.',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/twinkle-violin',
		pieces: [
			{
				code: 'twinkle-twinkle-little-star',
				label: 'Twinkle Twinkle Little Star',
				composer: 'Trad.',
				arranger: 'Pekka Pulli',
				notationStartPercent: 0.118,
				notationEndPercent: 0.814,
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
					{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
					{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
					{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
					{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
					{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
					{ note: 'b/4', length: 4, finger: 1, string: 'Mom' }
				],
				melody: [
					[
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
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
				composer: 'Trad.',
				arranger: 'Pekka Pulli',
				notationStartPercent: 0.118,
				notationEndPercent: 0.814,
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
					{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
					{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
					{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
					{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
					{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
					{ note: 'b/4', length: 4, finger: 1, string: 'Mom' }
				],
				melody: [
					[
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: null, length: 4 }
					]
				]
			}
		]
	},
	'tw-r': {
		published: true,
		demo: 'Twinkle-Recorder.pdf',
		code: 'tw-r',
		instrument: 'recorder',
		title: 'Twinkle Twinkle Little Star for Recorder',
		description:
			'A musical, playable way for recorder students to practice Twinkle — phrase by phrase, by ear, and with real accompaniment. Free demo from The Sharpest Note.',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/twinkle-recorder',
		pieces: [
			{
				code: 'twinkle-twinkle-little-star',
				label: 'Twinkle Twinkle Little Star',
				composer: 'Trad.',
				arranger: 'Pekka Pulli',
				notationStartPercent: 0.118,
				notationEndPercent: 0.814,
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
					{ note: 'c/4', length: 4 },
					{ note: 'd/4', length: 4 },
					{ note: 'e/4', length: 4 },
					{ note: 'f/4', length: 4 },
					{ note: 'g/4', length: 4 },
					{ note: 'a/4', length: 4 }
				],
				melody: [
					[
						{ note: 'c/4', length: 4 },
						{ note: 'c/4', length: 4 },
						{ note: 'g/4', length: 4 },
						{ note: 'g/4', length: 4 },
						{ note: 'a/4', length: 4 },
						{ note: 'a/4', length: 4 },
						{ note: 'g/4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'f/4', length: 4 },
						{ note: 'f/4', length: 4 },
						{ note: 'e/4', length: 4 },
						{ note: 'e/4', length: 4 },
						{ note: 'd/4', length: 4 },
						{ note: 'd/4', length: 4 },
						{ note: 'c/4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/4', length: 4 },
						{ note: 'g/4', length: 4 },
						{ note: 'f/4', length: 4 },
						{ note: 'f/4', length: 4 },
						{ note: 'e/4', length: 4 },
						{ note: 'e/4', length: 4 },
						{ note: 'd/4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/4', length: 4 },
						{ note: 'g/4', length: 4 },
						{ note: 'f/4', length: 4 },
						{ note: 'f/4', length: 4 },
						{ note: 'e/4', length: 4 },
						{ note: 'e/4', length: 4 },
						{ note: 'd/4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'c/4', length: 4 },
						{ note: 'c/4', length: 4 },
						{ note: 'g/4', length: 4 },
						{ note: 'g/4', length: 4 },
						{ note: 'a/4', length: 4 },
						{ note: 'a/4', length: 4 },
						{ note: 'g/4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'f/4', length: 4 },
						{ note: 'f/4', length: 4 },
						{ note: 'e/4', length: 4 },
						{ note: 'e/4', length: 4 },
						{ note: 'd/4', length: 4 },
						{ note: 'd/4', length: 4 },
						{ note: 'c/4', length: 4 },
						{ note: null, length: 4 }
					]
				]
			}
		]
	},
	'tw-c': {
		code: 'tw-c',
		published: true,
		demo: 'Twinkle-Cello.pdf',
		instrument: 'cello',
		title: 'Twinkle Twinkle Little Star for Cello',
		description:
			'A musical, playable way for cello students to practice Twinkle — phrase by phrase, by ear, and with real accompaniment. Free demo from The Sharpest Note.',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/twinkle-cello',
		pieces: [
			{
				code: 'twinkle-twinkle-little-star',
				label: 'Twinkle Twinkle Little Star',
				composer: 'Trad.',
				arranger: 'Pekka Pulli',
				notationStartPercent: 0.118,
				notationEndPercent: 0.814,
				tracks: {
					slow: {
						tempo: 50,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Cello+50BPM+Full+track.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Cello+50BPM+Backing+track.mp3'
					},
					medium: {
						tempo: 80,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Cello+80BPM+Full+track.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Cello+80BPM+Backing+track.mp3'
					},
					fast: {
						tempo: 100,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Cello+100BPM+Full+track.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Cello+100BPM+Backing+track.mp3'
					}
				},
				key: 'D',
				mode: 'major',
				barLength: 16,
				scale: [
					{ note: 'd/3', length: 4, finger: 0, string: 'Dad' },
					{ note: 'e/3', length: 4, finger: 1, string: 'Dad' },
					{ note: 'f#/3', length: 4, finger: 2, string: 'Dad' },
					{ note: 'g/3', length: 4, finger: 3, string: 'Dad' },
					{ note: 'a/3', length: 4, finger: 0, string: 'Mom' },
					{ note: 'b/3', length: 4, finger: 1, string: 'Mom' }
				],
				melody: [
					[
						{ note: 'd/3', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/3', length: 4, finger: 0, string: 'Dad' },
						{ note: 'a/3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'b/3', length: 4, finger: 1, string: 'Mom' },
						{ note: 'b/3', length: 4, finger: 1, string: 'Mom' },
						{ note: 'a/3', length: 4, finger: 0, string: 'Mom' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'g/3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/3', length: 4, finger: 1, string: 'Dad' },
						{ note: 'e/3', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/3', length: 4, finger: 0, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'a/3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'g/3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'g/3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/3', length: 4, finger: 1, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'a/3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'g/3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'g/3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/3', length: 4, finger: 1, string: 'Dad' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'd/3', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/3', length: 4, finger: 0, string: 'Dad' },
						{ note: 'a/3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/3', length: 4, finger: 0, string: 'Mom' },
						{ note: 'b/3', length: 4, finger: 1, string: 'Mom' },
						{ note: 'b/3', length: 4, finger: 1, string: 'Mom' },
						{ note: 'a/3', length: 4, finger: 0, string: 'Mom' },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'g/3', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/3', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/3', length: 4, finger: 1, string: 'Dad' },
						{ note: 'e/3', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/3', length: 4, finger: 0, string: 'Dad' },
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
				composer: 'Pekka Pulli',
				arranger: 'Pekka Pulli',
				notationStartPercent: 0.18,
				notationEndPercent: 0.9,
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
				key: 'C',
				mode: 'major',
				barLength: 16,
				scale: [
					{ note: 'g/3', length: 4, finger: 0, string: 'Bear' },
					{ note: 'a/3', length: 4, finger: 1, string: 'Bear' },
					{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
					{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
					{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
					{ note: 'b/4', length: 4, finger: 1, string: 'Mom' }
				],
				melody: [
					[
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 8, finger: 0, string: 'Mom' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 8, finger: 0, string: 'Mom' }
					],
					[
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 8, finger: 0, string: 'Dad' },
						{ note: null, length: 8 }
					],
					[
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 8, finger: 0, string: 'Mom' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 8, finger: 0, string: 'Mom' }
					],
					[
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 8, finger: 0, string: 'Dad' },
						{ note: null, length: 8 }
					],
					[
						{ note: 'g/3', length: 4, finger: 0, string: 'Bear' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 8, finger: 0, string: 'Dad' },
						{ note: 'g/3', length: 4, finger: 0, string: 'Bear' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 8, finger: 0, string: 'Dad' }
					],
					[
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'a/4', length: 8, finger: 0, string: 'Mom' },
						{ note: null, length: 8 }
					],
					[
						{ note: 'g/3', length: 4, finger: 0, string: 'Bear' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 8, finger: 0, string: 'Dad' },
						{ note: 'g/3', length: 4, finger: 0, string: 'Bear' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 8, finger: 0, string: 'Dad' }
					],
					[
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 8, finger: 0, string: 'Dad' },
						{ note: null, length: 8 }
					]
				]
			},
			{
				code: 'raindrops',
				label: 'Raindrops',
				composer: 'Pekka Pulli',
				arranger: 'Pekka Pulli',
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
					{ note: 'g/3', length: 4 },
					{ note: 'a/3', length: 4 },
					{ note: 'd/4', length: 4 },
					{ note: 'e/4', length: 4 },
					{ note: 'a/4', length: 4 },
					{ note: 'b/4', length: 4 }
				],
				melody: [
					[
						{ note: 'g/3', length: 4 },
						{ note: 'a/4', length: 4 },
						{ note: 'g/3', length: 4 },
						{ note: 'b/4', length: 4 }
					],
					[
						{ note: 'd/4', length: 4 },
						{ note: 'b/4', length: 2 },
						{ note: 'd/4', length: 2 },
						{ note: 'e/4', length: 4 },
						{ note: 'b/4', length: 4 }
					],
					[
						{ note: 'g/3', length: 4 },
						{ note: 'a/4', length: 4 },
						{ note: 'g/3', length: 4 },
						{ note: 'b/4', length: 4 }
					],
					[
						{ note: 'd/4', length: 4 },
						{ note: 'b/4', length: 2 },
						{ note: 'd/4', length: 2 },
						{ note: 'a/4', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/3', length: 4 },
						{ note: 'a/4', length: 4 },
						{ note: 'g/3', length: 4 },
						{ note: 'b/4', length: 4 }
					],
					[
						{ note: 'd/4', length: 4 },
						{ note: 'b/4', length: 2 },
						{ note: 'd/4', length: 2 },
						{ note: 'e/4', length: 4 },
						{ note: 'b/4', length: 4 }
					],
					[
						{ note: 'g/3', length: 4 },
						{ note: 'a/4', length: 4 },
						{ note: 'g/3', length: 4 },
						{ note: 'b/4', length: 4 }
					],
					[
						{ note: 'd/4', length: 4 },
						{ note: 'b/4', length: 2 },
						{ note: 'g/3', length: 2 },
						{ note: 'g/3', length: 8 }
					]
				]
			}
		]
	},
	'test-c': {
		code: 'test-c',
		instrument: 'cello',
		title: 'Testing testing',
		description: 'Just a test unit.',
		gumroadUrl: '',
		pieces: [
			{
				code: 'test-1',
				label: 'Test 1',
				composer: 'Pekka Pulli',
				arranger: 'Pekka Pulli',
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
					{ note: 'g/2', length: 4 },
					{ note: 'a/2', length: 4 },
					{ note: 'd/3', length: 4 },
					{ note: 'e/3', length: 4 },
					{ note: 'a/3', length: 4 },
					{ note: 'b/3', length: 4 }
				],
				melody: [
					[
						{ note: 'g/2', length: 2 },
						{ note: 'a/2', length: 2 },
						{ note: 'g/2', length: 2 },
						{ note: 'b/3', length: 2 },
						{ note: 'g/2', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/2', length: 2 },
						{ note: 'a/2', length: 1 },
						{ note: 'g/2', length: 1 },
						{ note: 'b/2', length: 4 },
						{ note: 'g/2', length: 4 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/2', length: 2 },
						{ note: 'a/2', length: 1 },
						{ note: 'g/2', length: 1 },
						{ note: 'b/2', length: 4 },
						{ note: 'g/2', length: 2 },
						{ note: null, length: 2 },
						{ note: 'g/2', length: 2 },
						{ note: null, length: 2 }
					]
				]
			}
		]
	},
	'viljan-biisit-va': {
		code: 'viljan-biisit-va',
		instrument: 'viola',
		title: 'Viljan Biisit',
		description: 'Viljan biisit!',
		gumroadUrl: '',
		pieces: [
			{
				code: 'ostakaa',
				label: 'Ostakaa makkaraa',
				composer: 'trad.',
				arranger: 'trad.',
				notationStartPercent: 0.18,
				notationEndPercent: 0.9,
				key: 'D',
				mode: 'major',
				barLength: 16,
				scale: [
					{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
					{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
					{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' }
				],
				melody: [
					[
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 8, finger: 0, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 8, finger: 0, string: 'Dad' }
					],
					[
						{ note: 'd/4', length: 2, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 2, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 2, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 2, finger: 0, string: 'Dad' },
						{ note: 'e/4', length: 2, finger: 1, string: 'Dad' },
						{ note: 'e/4', length: 2, finger: 1, string: 'Dad' },
						{ note: 'e/4', length: 2, finger: 1, string: 'Dad' },
						{ note: 'e/4', length: 2, finger: 1, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 8, finger: 0, string: 'Dad' }
					]
				]
			},
			{
				code: 'hämähämähäkki',
				label: 'Hämä hämä häkki',
				composer: 'trad.',
				arranger: 'trad.',
				notationStartPercent: 0.18,
				notationEndPercent: 0.9,
				key: 'D',
				mode: 'major',
				barLength: 16,
				scale: [
					{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
					{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
					{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
					{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
					{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
					{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
					{ note: 'c#/5', length: 4, finger: 2, string: 'Mom' },
					{ note: 'd/5', length: 4, finger: 3, string: 'Mom' }
				],
				melody: [
					[
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'f#/4', length: 8, finger: 2, string: 'Dad' },
						{ note: 'f#/4', length: 8, finger: 2, string: 'Dad' }
					],
					[
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'd/4', length: 8, finger: 0, string: 'Dad' },
						{ note: null, length: 8 }
					],
					[
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'a/4', length: 8, finger: 0, string: 'Mom' },
						{ note: 'a/4', length: 8, finger: 0, string: 'Mom' }
					],
					[
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'g/4', length: 4, finger: 3, string: 'Dad' },
						{ note: 'a/4', length: 4, finger: 0, string: 'Mom' },
						{ note: 'f#/4', length: 8, finger: 2, string: 'Dad' },
						{ note: null, length: 8 }
					],
					[
						{ note: 'd/5', length: 8, finger: 3, string: 'Mom' },
						{ note: 'd/5', length: 4, finger: 3, string: 'Mom' },
						{ note: 'd/5', length: 4, finger: 3, string: 'Mom' },
						{ note: 'c#/5', length: 8, finger: 2, string: 'Mom' },
						{ note: 'c#/5', length: 8, finger: 2, string: 'Mom' }
					],
					[
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'b/4', length: 4, finger: 1, string: 'Mom' },
						{ note: 'a/4', length: 8, finger: 0, string: 'Mom' },
						{ note: null, length: 8 }
					],
					[
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'f#/4', length: 8, finger: 2, string: 'Dad' },
						{ note: 'f#/4', length: 8, finger: 2, string: 'Dad' }
					],
					[
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'd/4', length: 4, finger: 0, string: 'Dad' },
						{ note: 'e/4', length: 4, finger: 1, string: 'Dad' },
						{ note: 'f#/4', length: 4, finger: 2, string: 'Dad' },
						{ note: 'd/4', length: 8, finger: 0, string: 'Dad' },
						{ note: null, length: 8 }
					]
				]
			}
		]
	},
	'happy-bd-song': {
		code: 'happy-bd-song',
		instrument: 'violin',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/happy-birthday-song',
		title: 'Happy Birthday Song',
		description:
			'A musical, playable way for violin students to practice Happy Birthday — phrase by phrase, by ear, and with real accompaniment. Free demo from The Sharpest Note.',
		pieces: [
			{
				code: 'happy-birthday',
				label: 'Happy Birthday',
				composer: 'trad.',
				arranger: 'Pekka Pulli',
				notationStartPercent: 0.18,
				notationEndPercent: 0.9,
				barLength: 12,
				key: 'G',
				mode: 'major',
				scale: [
					{ note: 'd/4', length: 4, finger: 0 },
					{ note: 'e/4', length: 4, finger: 1 },
					{ note: 'f#/4', length: 4, finger: 2 },
					{ note: 'g/4', length: 4, finger: 3 },
					{ note: 'a/4', length: 4, finger: 4 },
					{ note: 'b/4', length: 4, finger: 1 },
					{ note: 'c/5', length: 4, finger: 2 },
					{ note: 'd/5', length: 4, finger: 3 }
				],
				melody: [
					[
						{ note: null, length: 4 },
						{ note: null, length: 4 },
						{ note: 'd/4', length: 3, finger: 0 },
						{ note: 'd/4', length: 1, finger: 0 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: null, length: 8 }
					],
					[
						{ note: null, length: 4 },
						{ note: null, length: 4 },
						{ note: 'd/4', length: 3, finger: 0 },
						{ note: 'd/4', length: 1, finger: 0 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 4 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: null, length: 8 }
					],
					[
						{ note: null, length: 4 },
						{ note: null, length: 4 },
						{ note: 'd/4', length: 3, finger: 0 },
						{ note: 'd/4', length: 1, finger: 0 },
						{ note: 'd/5', length: 4, finger: 3 },
						{ note: 'b/4', length: 4, finger: 1 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: null, length: 4 }
					],
					[
						{ note: null, length: 4 },
						{ note: null, length: 4 },
						{ note: 'c/5', length: 3, finger: 2 },
						{ note: 'c/5', length: 1, finger: 2 },
						{ note: 'b/4', length: 4, finger: 1 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'g/4', length: 8, finger: 3 },
						{ note: null, length: 4 }
					]
				]
			}
		]
	},
	'4-animal-pieces-v': {
		code: '4-animal-pieces-v',
		instrument: 'violin',
		title: 'Animalistic Third Finger Pieces for Violin',
		description: 'Three musical pieces for beginner violinists practicing the third finger.',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/animalistic-third-finger-pieces-violin',
		pieces: [
			{
				code: 'simo-the-greedy-squirrel',
				label: 'Simo the Greedy Squirrel',
				composer: 'Tarmo Anttila',
				arranger: 'Tarmo Anttila',
				notationStartPercent: 0.18,
				notationEndPercent: 0.9,
				key: 'D',
				mode: 'major',
				barLength: 16,
				scale: [
					{ note: 'd/4', length: 4, finger: 0 },
					{ note: 'f#/4', length: 4, finger: 2 },
					{ note: 'g/4', length: 4, finger: 3 },
					{ note: 'a/4', length: 4, finger: 0 },
					{ note: 'e/5', length: 4, finger: 0 }
				],
				melody: [
					[
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'd/4', length: 8, finger: 0 },
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 }
					],
					[
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'd/4', length: 8, finger: 0 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'g/4', length: 4, finger: 3 }
					],
					[
						{ note: 'e/5', length: 4, finger: 0 },
						{ note: 'e/5', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'e/5', length: 4, finger: 0 },
						{ note: 'e/5', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 }
					],
					[
						{ note: 'e/5', length: 4, finger: 0 },
						{ note: 'e/5', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'a/4', length: 2, finger: 0 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'a/4', length: 4, finger: 0 }
					],
					[
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'd/4', length: 8, finger: 0 },
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 }
					],
					[
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'f#/4', length: 2, finger: 2 },
						{ note: 'g/4', length: 2, finger: 3 },
						{ note: 'd/4', length: 8, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'd/4', length: 8, finger: 0 }
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
