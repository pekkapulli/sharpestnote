import type { Units } from '../types';

export default {
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
				practiceTempi: {
					slow: 60,
					medium: 80,
					fast: 100
				},
				tracks: {
					slow: {
						tempo: 80,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Recorder+80BPM+Full+track_160k.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Recorder+80BPM+Backing+track_160k.mp3'
					},
					medium: {
						tempo: 90,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Recorder+90BPM+Full+track_160k.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Recorder+90BPM+Backing+track_160k.mp3'
					},
					fast: {
						tempo: 100,
						audioUrl: 'Twinkle+Twinkle+Little+Star+Recorder+100BPM+Full+track_160k.mp3',
						backingTrackUrl: 'Twinkle+Twinkle+Little+Star+Recorder+100BPM+Backing+track_160k.mp3'
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
	}
} as const satisfies Units;
