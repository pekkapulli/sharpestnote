import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'Admin Units - The Sharpest Note',
			description: 'Admin listing of all units',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
