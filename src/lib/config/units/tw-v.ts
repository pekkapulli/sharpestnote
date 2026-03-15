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
						audioUrl: 'Twinkle+Twinkle+Little+Star+Violin+60BPM+Full+track_160k.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Violin+60BPM+Backing+track_160k.mp3'
					},
					medium: {
						tempo: 80,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Violin+80BPM+Full+track_160k.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Violin+80BPM+Backing+track_160k.mp3'
					},
					fast: {
						tempo: 100,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Violin+100BPM+Full+track_160k.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Violin+100BPM+Backing+track_160k.mp3'
					}
				},
				key: 'D',
				mode: 'major',
				barLength: 16,
				scale: [
					{ note: 'd/4', length: 4, finger: 0 },
					{ note: 'e/4', length: 4, finger: 1 },
					{ note: 'f#/4', length: 4, finger: 2 },
					{ note: 'g/4', length: 4, finger: 3 },
					{ note: 'a/4', length: 4, finger: 0 },
					{ note: 'b/4', length: 4, finger: 1 }
				],
				melody: [
					[
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'b/4', length: 4, finger: 1 },
						{ note: 'b/4', length: 4, finger: 1 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'b/4', length: 4, finger: 1 },
						{ note: 'b/4', length: 4, finger: 1 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: null, length: 4 }
					]
				]
			}
		]
	}
} as const satisfies Units;
