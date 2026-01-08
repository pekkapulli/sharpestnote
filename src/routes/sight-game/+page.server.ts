import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'Sight Game - The Sharpest Note',
			description: 'Interactive sight-reading practice game',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
