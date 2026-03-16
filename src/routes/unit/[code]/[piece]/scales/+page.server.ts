import type { PageServerLoad } from './$types';
import { getUnitPieceRouteData } from '$lib/util/unitPieceRoute';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const routeData = await getUnitPieceRouteData(params, { supabase: locals.supabase });

	return {
		unit: routeData.unit,
		piece: routeData.piece,
		code: routeData.code,
		pieceCode: routeData.pieceCode,
		imageUrl: routeData.imageUrl,
		pageUrl: url.href
	};
};
