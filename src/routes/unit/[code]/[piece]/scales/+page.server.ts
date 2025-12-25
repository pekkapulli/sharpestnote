import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUnitByCode, normalizeUnitCode } from '$lib/config/units';

export const load: PageServerLoad = async ({ params }) => {
	const normalizedCode = normalizeUnitCode(params.code);
	const unit = getUnitByCode(params.code);

	if (!unit) {
		throw error(404, 'Unit not found');
	}

	const piece = unit.pieces.find((p) => p.code === params.piece);
	if (!piece) {
		throw error(404, 'Piece not found');
	}

	return {
		unit,
		piece,
		code: normalizedCode,
		pieceCode: params.piece
	};
};
