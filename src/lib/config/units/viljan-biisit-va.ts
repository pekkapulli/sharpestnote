import type { Units } from '../types';

export default {
	'viljan-biisit-va': {
		code: 'viljan-biisit-va',
		instrument: 'viola',
		title: 'Viljan Biisit',
		description: 'Viljan biisit!',
		gumroadUrl: '',
		published: false,
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
					{ note: 'd/4', length: 4, finger: 0 },
					{ note: 'e/4', length: 4, finger: 1 },
					{ note: 'f#/4', length: 4, finger: 2 }
				],
				melody: [
					[
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'd/4', length: 8, finger: 0 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'd/4', length: 8, finger: 0 }
					],
					[
						{ note: 'd/4', length: 2, finger: 0 },
						{ note: 'd/4', length: 2, finger: 0 },
						{ note: 'd/4', length: 2, finger: 0 },
						{ note: 'd/4', length: 2, finger: 0 },
						{ note: 'e/4', length: 2, finger: 1 },
						{ note: 'e/4', length: 2, finger: 1 },
						{ note: 'e/4', length: 2, finger: 1 },
						{ note: 'e/4', length: 2, finger: 1 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'd/4', length: 8, finger: 0 }
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
					{ note: 'd/4', length: 4, finger: 0 },
					{ note: 'e/4', length: 4, finger: 1 },
					{ note: 'f#/4', length: 4, finger: 2 },
					{ note: 'g/4', length: 4, finger: 3 },
					{ note: 'a/4', length: 4, finger: 0 },
					{ note: 'b/4', length: 4, finger: 1 },
					{ note: 'c#/5', length: 4, finger: 2 },
					{ note: 'd/5', length: 4, finger: 3 }
				],
				melody: [
					[
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'f#/4', length: 8, finger: 2 },
						{ note: 'f#/4', length: 8, finger: 2 }
					],
					[
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'd/4', length: 8, finger: 0 },
						{ note: null, length: 8 }
					],
					[
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'a/4', length: 8, finger: 0 },
						{ note: 'a/4', length: 8, finger: 0 }
					],
					[
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'g/4', length: 4, finger: 3 },
						{ note: 'a/4', length: 4, finger: 0 },
						{ note: 'f#/4', length: 8, finger: 2 },
						{ note: null, length: 8 }
					],
					[
						{ note: 'd/5', length: 8, finger: 3 },
						{ note: 'd/5', length: 4, finger: 3 },
						{ note: 'd/5', length: 4, finger: 3 },
						{ note: 'c#/5', length: 8, finger: 2 },
						{ note: 'c#/5', length: 8, finger: 2 }
					],
					[
						{ note: 'b/4', length: 4, finger: 1 },
						{ note: 'b/4', length: 4, finger: 1 },
						{ note: 'b/4', length: 4, finger: 1 },
						{ note: 'b/4', length: 4, finger: 1 },
						{ note: 'a/4', length: 8, finger: 0 },
						{ note: null, length: 8 }
					],
					[
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'f#/4', length: 8, finger: 2 },
						{ note: 'f#/4', length: 8, finger: 2 }
					],
					[
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'd/4', length: 4, finger: 0 },
						{ note: 'e/4', length: 4, finger: 1 },
						{ note: 'f#/4', length: 4, finger: 2 },
						{ note: 'd/4', length: 8, finger: 0 },
						{ note: null, length: 8 }
					]
				]
			}
		]
	}
} as const satisfies Units;
