import type { IRequest } from 'itty-router';
import type { Unit } from '../types';

export const unitDatabase: Record<string, Unit> = {
	'tw-v': { code: 'tw-v', keyCode: 'LHXQ', backendCode: 'unit_001' },
	'tw-va': { code: 'tw-va', keyCode: 'QPRT', backendCode: 'unit_002' },
	'tw-r': { code: 'tw-r', keyCode: 'AEIH', backendCode: 'unit_003' },
	'tw-c': { code: 'tw-c', keyCode: 'AOEG', backendCode: 'unit_004' },
	'1st-finger-nature-va': {
		code: '1st-finger-nature-va',
		keyCode: 'ZKWD',
		backendCode: 'unit_005'
	},
	'viljan-biisit-va': { code: 'viljan-biisit-va', keyCode: 'XYZA', backendCode: 'unit_006' },
	'happy-bd-song': { code: 'happy-bd-song', keyCode: 'MBRA', backendCode: 'unit_007' }
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
