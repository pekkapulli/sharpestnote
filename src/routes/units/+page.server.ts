import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'Units - The Sharpest Note',
			description: 'Browse our collection of interactive music units for orchestral instruments',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
