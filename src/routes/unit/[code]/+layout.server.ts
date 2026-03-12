import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUnitByCode, normalizeUnitCode } from '$lib/config/units';
import { createCustomUnitStub, isCustomUnitCode } from '$lib/util/unitPieceRoute';

export const load: LayoutServerLoad = async ({ params }) => {
	const normalizedCode = normalizeUnitCode(params.code);
	const unit = isCustomUnitCode(params.code) ? createCustomUnitStub() : getUnitByCode(params.code);

	if (!unit) {
		throw error(404, 'Unit not found');
	}

	return {
		unit,
		code: normalizedCode
	};
};
