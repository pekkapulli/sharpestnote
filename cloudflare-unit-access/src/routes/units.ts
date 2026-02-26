import type { IRequest } from 'itty-router';
import type { Unit } from '../types';

/** Map of keyCode -> Unit. KeyCode is the primary identifier to prevent duplicates. */
export const unitDatabase: Record<string, Unit> = {
	LHXQ: { code: 'tw-v' },
	QPRT: { code: 'tw-va' },
	AEIH: { code: 'tw-r' },
	AOEG: { code: 'tw-c' },
	ZKWD: { code: '1st-finger-nature-va' },
	XYZA: { code: 'viljan-biisit-va' },
	MBRA: { code: 'happy-bd-song' },
	JNEK: { code: 'u3-playful-second-finger-v' },
	MIXT: { code: 'u3-playful-second-finger-va' },
	UHBC: { code: 'u4-third-finger-tales-v' },
	LNEL: { code: 'u4-third-finger-tales-va' },
	PIKI: {
		code: 'u5-third-finger-hobby-songs-v'
	},
	AJNE: {
		code: 'u5-third-finger-hobby-songs-va'
	},
	AGEM: { code: 'u6-four-finger-shadows-v' },
	YQWE: { code: 'u6-four-finger-shadows-va' }
};

/** Helper to find a unit by its code (for backward compatibility) */
export function findUnitByCode(code: string): Unit | undefined {
	return Object.values(unitDatabase).find((unit) => unit.code === code);
}

export const handleUnitRoutes = async (request: IRequest): Promise<Response> => {
	const { code } = request.params as { code?: string };

	if (!code) {
		return new Response(JSON.stringify(Object.values(unitDatabase)), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Look up by unit code (backward compatibility)
	const unit = findUnitByCode(code);

	if (!unit) {
		return new Response(JSON.stringify({ error: 'Unit not found' }), { status: 404 });
	}

	return new Response(JSON.stringify(unit), {
		headers: { 'Content-Type': 'application/json' }
	});
};
