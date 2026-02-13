import type { IRequest } from 'itty-router';
import type { Unit } from '../types';

export const unitDatabase: Record<string, Unit> = {
	'tw-v': { code: 'tw-v', keyCode: 'LHXQ' },
	'tw-va': { code: 'tw-va', keyCode: 'QPRT' },
	'tw-r': { code: 'tw-r', keyCode: 'AEIH' },
	'tw-c': { code: 'tw-c', keyCode: 'AOEG' },
	'1st-finger-nature-va': {
		code: '1st-finger-nature-va',
		keyCode: 'ZKWD'
	},
	'viljan-biisit-va': { code: 'viljan-biisit-va', keyCode: 'XYZA' },
	'happy-bd-song': { code: 'happy-bd-song', keyCode: 'MBRA' },
	'4-animal-pieces-v': { code: '4-animal-pieces-v', keyCode: 'UHBC' }
};

export const handleUnitRoutes = async (request: IRequest): Promise<Response> => {
	const { code } = request.params as { code?: string };

	if (!code) {
		return new Response(JSON.stringify(Object.values(unitDatabase)), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const unit = unitDatabase[code];

	if (!unit) {
		return new Response(JSON.stringify({ error: 'Unit not found' }), { status: 404 });
	}

	return new Response(JSON.stringify(unit), {
		headers: { 'Content-Type': 'application/json' }
	});
};
