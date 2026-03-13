import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'Composer - Teacher Tools - The Sharpest Note',
			description: 'Compose a piece and share it with your student as a Sharpest Note piece!',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
