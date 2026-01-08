import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { instrumentMap } from '$lib/config/instruments';
import { getUnitByCode, normalizeUnitCode } from '$lib/config/units';
import { getImageUrl } from '$lib/util/getImageUrl';

export const load: PageServerLoad = async ({ params, url }) => {
	const unit = getUnitByCode(params.code);
	const imageUrl = getImageUrl(params.code);
	const instrumentLabel = unit ? (instrumentMap[unit.instrument]?.label ?? unit.instrument) : '';

	if (!unit) {
		throw error(404, 'Unit not found');
	}

	return {
		unit,
		code: normalizeUnitCode(params.code),
		imageUrl,
		instrumentLabel,
		pageUrl: url.href
	};
};
