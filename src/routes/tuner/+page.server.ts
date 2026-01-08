import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'Tuner - The Sharpest Note',
			description: 'Interactive tuner tool for checking your intonation',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
