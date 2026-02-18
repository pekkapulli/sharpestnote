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
	'u3-playful-second-finger-v': { code: 'u3-playful-second-finger-v', keyCode: 'JNEK' },
	'u3-playful-second-finger-va': { code: 'u3-playful-second-finger-va', keyCode: 'MIXT' },
	'u4-third-finger-tales-v': { code: 'u4-third-finger-tales-v', keyCode: 'UHBC' },
	'u4-third-finger-tales-va': { code: 'u4-third-finger-tales-va', keyCode: 'LNEL' },
	'u5-third-finger-hobby-songs-v': { code: 'u5-third-finger-hobby-songs-v', keyCode: 'PIKI' },
	'u5-third-finger-hobby-songs-va': { code: 'u5-third-finger-hobby-songs-va', keyCode: 'AJNE' },
	'u6-four-finger-spooks-v': { code: 'u6-four-finger-spooks-v', keyCode: 'AGEM' },
	'u6-four-finger-spooks-va': { code: 'u6-four-finger-spooks-va', keyCode: 'YQWE' }
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
