import type { Units } from '../types';

export default {
	'happy-bd-song': {
		code: 'happy-bd-song',
		instrument: 'violin',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/happy-birthday-song',
		title: 'Happy Birthday Song',
		description:
			'A musical, playable way for violin students to practice Happy Birthday — phrase by phrase, by ear, and with real accompaniment. Free demo from The Sharpest Note.',
		published: false,
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
				practiceTempi: {
					slow: 60,
					medium: 80,
					fast: 100
				},
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
	}
} as const satisfies Units;
