import type { PageServerLoad } from '../../$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, parent }) => {
	const { user } = await parent();
	if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
		throw redirect(303, '/');
	}
	return {
		sharePreviewData: {
			title: 'Onset Training - The Sharpest Note',
			description: 'Record and analyze audio data for machine learning training',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
