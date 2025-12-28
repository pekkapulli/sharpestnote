import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { instrumentMap } from '$lib/config/instruments';
import { fileStore, getUnitByCode, normalizeUnitCode } from '$lib/config/units';

export const load: PageServerLoad = async ({ params }) => {
	const normalizedCode = normalizeUnitCode(params.code);
	const unit = getUnitByCode(params.code);
	const imageUrl = `${fileStore}/${normalizedCode}/${normalizedCode}.jpg`;
	const instrumentLabel = unit ? (instrumentMap[unit.instrument]?.label ?? unit.instrument) : '';

	if (!unit) {
		throw error(404, 'Unit not found');
	}

	return {
		unit,
		code: normalizedCode,
		imageUrl,
		instrumentLabel
	};
};
