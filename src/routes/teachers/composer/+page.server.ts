import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		sharePreviewData: {
			title: 'Etude Composer - Teacher Tools - The Sharpest Note',
			description:
				'Manually compose an etude using a VexFlow staff and export it as a Piece-ready JSON object.',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
