import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, locals }) => {
	const { session, user } = await locals.safeGetSession();

	return {
		origin: url.origin,
		pathname: url.pathname,
		session,
		user
	};
};
