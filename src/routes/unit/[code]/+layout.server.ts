import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUnitByCode, normalizeUnitCode } from '$lib/config/units';

const SEARCH_PARAM_KEY = 'key';

export const load: LayoutServerLoad = async ({ params, url }) => {
	const normalizedCode = normalizeUnitCode(params.code);
	const unit = getUnitByCode(params.code);

	if (!unit) {
		throw error(404, 'Unit not found');
	}

	const providedKey = url.searchParams.get(SEARCH_PARAM_KEY)?.trim().toUpperCase() ?? '';
	const hasKeyAccess = providedKey === unit.keyCode;
	const keyQuery = providedKey ? `?${SEARCH_PARAM_KEY}=${encodeURIComponent(providedKey)}` : '';

	return {
		unit,
		code: normalizedCode,
		hasKeyAccess,
		keyQuery
	};
};
