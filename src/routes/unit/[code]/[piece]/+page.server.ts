import type { PageServerLoad } from './$types';
import { getUnitPieceRouteData } from '$lib/util/unitPieceRoute';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const routeData = await getUnitPieceRouteData(params, { supabase: locals.supabase });

	return {
		...routeData,
		pageUrl: url.href
	};
};
