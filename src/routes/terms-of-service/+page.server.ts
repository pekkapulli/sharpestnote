import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'Terms of Service - The Sharpest Note',
			description: 'Terms of service for The Sharpest Note',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
