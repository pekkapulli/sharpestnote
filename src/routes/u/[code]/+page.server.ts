import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { normalizeUnitCode } from '$lib/config/units';

export const load: PageServerLoad = async ({ params }) => {
	const code = normalizeUnitCode(params.code);

	if (!code) {
		throw redirect(307, '/');
	}

	throw redirect(307, `/unit/${code}`);
};
