import type { Units } from '../types';

export default {
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
				practiceTempi: {
					slow: 50,
					medium: 70,
					fast: 90
				},
				tracks: {
					slow: {
						tempo: 50,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Cello+50BPM+Full+track_160k.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Cello+50BPM+Backing+track_160k.mp3'
					},
					medium: {
						tempo: 80,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Cello+80BPM+Full+track_160k.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Cello+80BPM+Backing+track_160k.mp3'
					},
					fast: {
						tempo: 100,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Cello+100BPM+Full+track_160k.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Cello+100BPM+Backing+track_160k.mp3'
					}
				},
				key: 'D',
				mode: 'major',
				barLength: 16,
				scale: [
					{ note: 'd/3', length: 4, finger: 0 },
					{ note: 'e/3', length: 4, finger: 1 },
					{ note: 'f#/3', length: 4, finger: 3 },
					{ note: 'g/3', length: 4, finger: 4 },
					{ note: 'a/3', length: 4, finger: 0 },
					{ note: 'b/3', length: 4, finger: 1 }
				],
				melody: [
					[
						{ note: 'd/3', length: 4, finger: 0 },
						{ note: 'd/3', length: 4, finger: 0 },
						{ note: 'a/3', length: 4, finger: 0 },
						{ note: 'a/3', length: 4, finger: 0 },
						{ note: 'b/3', length: 4, finger: 1 },
						{ note: 'b/3', length: 4, finger: 1 },
						{ note: 'a/3', length: 4, finger: 0 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/3', length: 4, finger: 4 },
						{ note: 'g/3', length: 4, finger: 4 },
						{ note: 'f#/3', length: 4, finger: 3 },
						{ note: 'f#/3', length: 4, finger: 3 },
						{ note: 'e/3', length: 4, finger: 1 },
						{ note: 'e/3', length: 4, finger: 1 },
						{ note: 'd/3', length: 4, finger: 0 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'a/3', length: 4, finger: 0 },
						{ note: 'a/3', length: 4, finger: 0 },
						{ note: 'g/3', length: 4, finger: 4 },
						{ note: 'g/3', length: 4, finger: 4 },
						{ note: 'f#/3', length: 4, finger: 3 },
						{ note: 'f#/3', length: 4, finger: 3 },
						{ note: 'e/3', length: 4, finger: 1 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'a/3', length: 4, finger: 0 },
						{ note: 'a/3', length: 4, finger: 0 },
						{ note: 'g/3', length: 4, finger: 4 },
						{ note: 'g/3', length: 4, finger: 4 },
						{ note: 'f#/3', length: 4, finger: 3 },
						{ note: 'f#/3', length: 4, finger: 3 },
						{ note: 'e/3', length: 4, finger: 1 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'd/3', length: 4, finger: 0 },
						{ note: 'd/3', length: 4, finger: 0 },
						{ note: 'a/3', length: 4, finger: 0 },
						{ note: 'a/3', length: 4, finger: 0 },
						{ note: 'b/3', length: 4, finger: 1 },
						{ note: 'b/3', length: 4, finger: 1 },
						{ note: 'a/3', length: 4, finger: 0 },
						{ note: null, length: 4 }
					],
					[
						{ note: 'g/3', length: 4, finger: 4 },
						{ note: 'g/3', length: 4, finger: 4 },
						{ note: 'f#/3', length: 4, finger: 3 },
						{ note: 'f#/3', length: 4, finger: 3 },
						{ note: 'e/3', length: 4, finger: 1 },
						{ note: 'e/3', length: 4, finger: 1 },
						{ note: 'd/3', length: 4, finger: 0 },
						{ note: null, length: 4 }
					]
				]
			}
		]
	}
} as const satisfies Units;
