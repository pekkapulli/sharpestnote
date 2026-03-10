import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		sharePreviewData: {
			title: 'Tone Lab - Free Intonation Practice',
			description:
				'Practice your pitch accuracy with our free tone lab. Match random notes and improve your intonation skills.',
			url: 'https://sharpestnote.com/tone-lab',
			imageUrl: 'https://sharpestnote.com/og-image.png'
		}
	};
};
