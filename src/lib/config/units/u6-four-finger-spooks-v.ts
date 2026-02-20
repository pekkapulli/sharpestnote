import type { Units } from '../types';

export default {
	'u6-four-finger-spooks-v': {
		code: 'u6-four-finger-spooks-v',
		instrument: 'violin',
		title: 'Four-Finger Spooks for Violin',
		description: 'Three spooky-themed pieces for beginner violinists practicing the fourth finger.',
		gumroadUrl: 'https://sharpestnote.gumroad.com/l/u6-four-finger-spooks-violin',
		photo: {
			url: 'https://unsplash.com/@cnbrightskies',
			credit: 'Carlos Nunez'
		},
		published: false,
		pieces: []
	}
} as const satisfies Units;
