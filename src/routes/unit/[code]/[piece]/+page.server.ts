import type { PageServerLoad } from './$types';
import { getUnitPieceRouteData } from '$lib/util/unitPieceRoute';

export const load: PageServerLoad = async ({ params, url }) => {
	const routeData = getUnitPieceRouteData(params);

	return {
		...routeData,
		pageUrl: url.href
	};
};
