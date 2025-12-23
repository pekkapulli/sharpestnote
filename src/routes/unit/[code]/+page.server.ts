import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUnitByCode, normalizeUnitCode } from '$lib/config/units';

export const load: PageServerLoad = async ({ params }) => {
	const normalizedCode = normalizeUnitCode(params.code);
	const unit = getUnitByCode(params.code);

	if (!unit) {
		throw error(404, 'Unit not found');
	}

	return {
		unit,
		code: normalizedCode
	};
};
