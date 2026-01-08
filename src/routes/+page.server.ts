import type { PageServerLoad } from './$types';
import type { SharePreviewData } from '$lib/util/sharePreview';

export const load: PageServerLoad = ({ url }) => {
	const sharePreviewData: SharePreviewData = {
		title: 'The Sharpest Note',
		description: 'Beginner music units with interactive practice tools for orchestral instruments',
		type: 'website',
		image: `${url.origin}/og-logo.png`,
		url: url.href
	};

	return {
		sharePreviewData
	};
};
