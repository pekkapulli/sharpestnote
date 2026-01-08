import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'FAQ - The Sharpest Note',
			description:
				'Frequently asked questions about The Sharpest Note and our interactive music units',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
