import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, parent }) => {
	const { user } = await parent();
	if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
		throw redirect(303, '/');
	}
	return {
		sharePreviewData: {
			title: 'Admin Units - The Sharpest Note',
			description: 'Admin listing of all units',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		}
	};
};
