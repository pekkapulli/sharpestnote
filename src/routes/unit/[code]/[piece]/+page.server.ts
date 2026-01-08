import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUnitByCode, normalizeUnitCode } from '$lib/config/units';
import { getImageUrl } from '$lib/util/getImageUrl';

export const load: PageServerLoad = async ({ params }) => {
	const normalizedCode = normalizeUnitCode(params.code);
	const unit = getUnitByCode(params.code);
	const imageUrl = getImageUrl(params.code);

	if (!unit) {
		throw error(404, 'Unit not found');
	}

	const currentIndex = unit.pieces.findIndex((p) => p.code === params.piece);
	if (currentIndex === -1) {
		throw error(404, 'Piece not found');
	}

	const piece = unit.pieces[currentIndex];
	const previousPiece = currentIndex > 0 ? unit.pieces[currentIndex - 1] : null;
	const nextPiece = currentIndex < unit.pieces.length - 1 ? unit.pieces[currentIndex + 1] : null;

	return {
		unit,
		piece,
		previousPiece,
		nextPiece,
		code: normalizedCode,
		pieceCode: params.piece,
		imageUrl
	};
};
