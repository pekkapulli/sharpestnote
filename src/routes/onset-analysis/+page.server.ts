import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'Audio Analysis - The Sharpest Note',
			description: 'Interactive audio analysis tool for understanding sound and intonation',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
