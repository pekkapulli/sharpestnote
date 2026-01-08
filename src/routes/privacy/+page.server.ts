import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'Privacy - The Sharpest Note',
			description: 'Privacy policy for The Sharpest Note',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
