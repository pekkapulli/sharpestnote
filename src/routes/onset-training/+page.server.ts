import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'Onset Training - The Sharpest Note',
			description: 'Record and analyze audio data for machine learning training',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
