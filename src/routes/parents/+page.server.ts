import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'For Parents - The Sharpest Note',
			description:
				'Information for parents about The Sharpest Note and how it helps with music practice',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
