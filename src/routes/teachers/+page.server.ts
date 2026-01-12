import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'Teacher Demo - The Sharpest Note',
			description:
				'A teacher-facing look at how The Sharpest Note is designed to support calm, musical home practice.',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
