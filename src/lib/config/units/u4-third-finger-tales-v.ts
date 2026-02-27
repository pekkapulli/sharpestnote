import type { Units } from '../types';

export default {
	'u4-third-finger-tales-v': {
		code: 'u4-third-finger-tales-v',
		instrument: 'violin',
		title: 'Third-Finger Tales for Violin',
		description:
			'Three animal-themed pieces for beginner violinists practicing the third finger on the D string.',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/u4-third-finger-tales-violin',
		photo: {
			url: 'https://unsplash.com/@vincentvanzalinge',
			credit: 'Vincent van Zalinge'
		},
		published: false,
		pieces: [
			{
				code: 'the-lazy-turtle',
				label: 'The Lazy Turtle',
				composer: 'Tarmo Anttila',
				arranger: 'Tarmo Anttila',
				practiceTempi: {
					slow: 60,
					medium: 75,
					fast: 90
				},
				tracks: {
					slow: {
						tempo: 60,
						backingTrackUrl: 'U4-1-The-Lazy-Turtle+60BPM+Violin+Backing+track_160k.mp3',
						audioUrl: 'U4-1-The-Lazy-Turtle+60BPM+Violin+Full+track_160k.mp3'
					},
					medium: {
						tempo: 75,
						backingTrackUrl: 'U4-1-The-Lazy-Turtle+75BPM+Violin+Backing+track_160k.mp3',
						audioUrl: 'U4-1-The-Lazy-Turtle+75BPM+Violin+Full+track_160k.mp3'
					},
					fast: {
						tempo: 90,
						backingTrackUrl: 'U4-1-The-Lazy-Turtle+90BPM+Violin+Backing+track_160k.mp3',
						audioUrl: 'U4-1-The-Lazy-Turtle+90BPM+Violin+Full+track_160k.mp3'
					}
				},
				notationStartPercent: 0.125,
				notationEndPercent: 0.815,
				key: 'D',
				mode: 'major',
				barLength: 16,
				melody: [
					[
						{
							note: 'g/4',
							length: 8,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 8,
							finger: 2
						},
						{
							note: null,
							length: 8
						}
					],
					[
						{
							note: 'f#/4',
							length: 8,
							finger: 2
						},
						{
							note: 'g/4',
							length: 8,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 8,
							finger: 2
						},
						{
							note: null,
							length: 8
						}
					],
					[
						{
							note: 'g/4',
							length: 8,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 8,
							finger: 2
						},
						{
							note: null,
							length: 8
						}
					],
					[
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 8,
							finger: 2
						},
						{
							note: 'g/4',
							length: 8,
							finger: 3
						}
					],
					[
						{
							note: 'a/4',
							length: 8,
							finger: 0
						},
						{
							note: 'e/5',
							length: 8,
							finger: 0
						},
						{
							note: 'e/5',
							length: 16,
							finger: 0
						},
						{
							note: 'e/5',
							length: 16,
							finger: 0
						}
					]
				],
				scale: [
					{
						note: 'f#/4',
						length: 4,
						finger: 2
					},
					{
						note: 'g/4',
						length: 4,
						finger: 3
					},
					{
						note: 'a/4',
						length: 4,
						finger: 0
					},
					{
						note: 'e/5',
						length: 4,
						finger: 0
					}
				]
			},
			{
				code: 'simo-the-greedy-squirrel',
				label: 'Simo the Greedy Squirrel',
				composer: 'Tarmo Anttila',
				arranger: 'Tarmo Anttila',
				practiceTempi: {
					slow: 40,
					medium: 50,
					fast: 70
				},
				tracks: {
					slow: {
						tempo: 40,
						backingTrackUrl: 'U4-2-Simo-the-Greedy-Squirrel+40BPM+Violin+Backing+track_160k.mp3',
						audioUrl: 'U4-2-Simo-the-Greedy-Squirrel+40BPM+Violin+Full+track_160k.mp3'
					},
					medium: {
						tempo: 55,
						backingTrackUrl: 'U4-2-Simo-the-Greedy-Squirrel+55BPM+Violin+Backing+track_160k.mp3',
						audioUrl: 'U4-2-Simo-the-Greedy-Squirrel+55BPM+Violin+Full+track_160k.mp3'
					},
					fast: {
						tempo: 70,
						backingTrackUrl: 'U4-2-Simo-the-Greedy-Squirrel+70BPM+Violin+Backing+track_160k.mp3',
						audioUrl: 'U4-2-Simo-the-Greedy-Squirrel+70BPM+Violin+Full+track_160k.mp3'
					}
				},
				key: 'D',
				mode: 'major',
				barLength: 16,
				melody: [
					[
						{
							note: 'f#/4',
							length: 2,
							beamStart: true,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 2,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							beamEnd: true,
							finger: 3
						},
						{
							note: 'd/4',
							length: 8,
							finger: 0
						},
						{
							note: 'f#/4',
							length: 2,
							beamStart: true,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 2,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							beamEnd: true,
							finger: 3
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						}
					],
					[
						{
							note: 'f#/4',
							length: 2,
							beamStart: true,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 2,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							beamEnd: true,
							finger: 3
						},
						{
							note: 'd/4',
							length: 8,
							finger: 0
						},
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						}
					],
					[
						{
							note: 'e/5',
							length: 4,
							finger: 0
						},
						{
							note: 'e/5',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'e/5',
							length: 4,
							finger: 0
						},
						{
							note: 'e/5',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						}
					],
					[
						{
							note: 'e/5',
							length: 4,
							finger: 0
						},
						{
							note: 'e/5',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'g/4',
							length: 2,
							beamStart: true,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 2,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 2,
							beamEnd: true,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						}
					],
					[
						{
							note: 'f#/4',
							length: 2,
							beamStart: true,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 2,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							beamEnd: true,
							finger: 3
						},
						{
							note: 'd/4',
							length: 8,
							finger: 0
						},
						{
							note: 'f#/4',
							length: 2,
							beamStart: true,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 2,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							beamEnd: true,
							finger: 3
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						}
					],
					[
						{
							note: 'f#/4',
							length: 2,
							beamStart: true,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 2,
							finger: 2
						},
						{
							note: 'g/4',
							length: 2,
							beamEnd: true,
							finger: 3
						},
						{
							note: 'd/4',
							length: 8,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'd/4',
							length: 8,
							finger: 0
						}
					]
				],
				scale: [
					{
						note: 'd/4',
						length: 4,
						finger: 0
					},
					{
						note: 'f#/4',
						length: 4,
						finger: 2
					},
					{
						note: 'g/4',
						length: 4,
						finger: 3
					},
					{
						note: 'a/4',
						length: 4,
						finger: 0
					},
					{
						note: 'e/5',
						length: 4,
						finger: 0
					}
				],
				notationStartPercent: 0.12,
				notationEndPercent: 0.875
			},
			{
				code: 'fluffy',
				label: 'Fluffy',
				composer: 'Tarmo Anttila',
				arranger: 'Tarmo Anttila',
				practiceTempi: {
					slow: 40,
					medium: 50,
					fast: 70
				},
				tracks: {
					slow: {
						tempo: 40,
						backingTrackUrl: 'U4-3-Fluffy+40BPM+Violin+Backing+track_160k.mp3',
						audioUrl: 'U4-3-Fluffy+40BPM+Violin+Full+track_160k.mp3'
					},
					medium: {
						tempo: 55,
						backingTrackUrl: 'U4-3-Fluffy+55BPM+Violin+Backing+track_160k.mp3',
						audioUrl: 'U4-3-Fluffy+55BPM+Violin+Full+track_160k.mp3'
					},
					fast: {
						tempo: 70,
						backingTrackUrl: 'U4-3-Fluffy+70BPM+Violin+Backing+track_160k.mp3',
						audioUrl: 'U4-3-Fluffy+70BPM+Violin+Full+track_160k.mp3'
					}
				},
				key: 'D',
				mode: 'major',
				barLength: 16,
				melody: [
					[
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'd/4',
							length: 8,
							finger: 0
						},
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'a/4',
							length: 8,
							finger: 0
						}
					],
					[
						{
							note: 'a/4',
							length: 8,
							finger: 0
						},
						{
							note: 'g/4',
							length: 8,
							finger: 3
						},
						{
							note: 'g/4',
							length: 8,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 8,
							finger: 2
						}
					],
					[
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'd/4',
							length: 8,
							finger: 0
						},
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'a/4',
							length: 8,
							finger: 0
						}
					],
					[
						{
							note: 'g/4',
							length: 8,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 8,
							finger: 2
						},
						{
							note: 'a/4',
							length: 8,
							finger: 0
						},
						{
							note: 'a/4',
							length: 8,
							finger: 0
						}
					],
					[
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 8,
							finger: 2
						},
						{
							note: 'g/4',
							length: 8,
							finger: 3
						}
					],
					[
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'a/4',
							length: 8,
							finger: 0
						},
						{
							note: 'a/4',
							length: 8,
							finger: 0
						}
					],
					[
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 4,
							finger: 2
						},
						{
							note: 'g/4',
							length: 4,
							finger: 3
						},
						{
							note: 'f#/4',
							length: 8,
							finger: 2
						},
						{
							note: 'g/4',
							length: 8,
							finger: 3
						}
					],
					[
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 4,
							finger: 0
						},
						{
							note: 'a/4',
							length: 8,
							finger: 0
						},
						{
							note: 'a/4',
							length: 8,
							finger: 0
						}
					],
					[
						{
							note: 'g/4',
							length: 16,
							finger: 3
						}
					]
				],
				scale: [
					{
						note: 'd/4',
						length: 4,
						finger: 0
					},
					{
						note: 'f#/4',
						length: 4,
						finger: 2
					},
					{
						note: 'g/4',
						length: 4,
						finger: 3
					},
					{
						note: 'a/4',
						length: 4,
						finger: 0
					}
				],
				notationStartPercent: 0.1,
				notationEndPercent: 0.95
			}
		]
	}
} as const satisfies Units;
