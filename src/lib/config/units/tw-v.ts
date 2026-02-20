import type { Units } from '../types';

export default {
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
				practiceTempi: {
					slow: 50,
					medium: 70,
					fast: 90
				},
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
	}
} as const satisfies Units;
