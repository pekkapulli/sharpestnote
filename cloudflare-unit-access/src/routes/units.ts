import type { IRequest } from 'itty-router';
import type { Unit, KeyCode } from '../types';
import { createKeyCode } from '../types';

/** Map of keyCode -> Unit. KeyCode is the primary identifier to prevent duplicates. */
export const unitDatabase: Record<KeyCode, Unit> = {
	[createKeyCode('LHXQ')]: { code: 'tw-v', keyCode: createKeyCode('LHXQ') },
	[createKeyCode('QPRT')]: { code: 'tw-va', keyCode: createKeyCode('QPRT') },
	[createKeyCode('AEIH')]: { code: 'tw-r', keyCode: createKeyCode('AEIH') },
	[createKeyCode('AOEG')]: { code: 'tw-c', keyCode: createKeyCode('AOEG') },
	[createKeyCode('ZKWD')]: { code: '1st-finger-nature-va', keyCode: createKeyCode('ZKWD') },
	[createKeyCode('XYZA')]: { code: 'viljan-biisit-va', keyCode: createKeyCode('XYZA') },
	[createKeyCode('MBRA')]: { code: 'happy-bd-song', keyCode: createKeyCode('MBRA') },
	[createKeyCode('JNEK')]: { code: 'u3-playful-second-finger-v', keyCode: createKeyCode('JNEK') },
	[createKeyCode('MIXT')]: { code: 'u3-playful-second-finger-va', keyCode: createKeyCode('MIXT') },
	[createKeyCode('UHBC')]: { code: 'u4-third-finger-tales-v', keyCode: createKeyCode('UHBC') },
	[createKeyCode('LNEL')]: { code: 'u4-third-finger-tales-va', keyCode: createKeyCode('LNEL') },
	[createKeyCode('PIKI')]: {
		code: 'u5-third-finger-hobby-songs-v',
		keyCode: createKeyCode('PIKI')
	},
	[createKeyCode('AJNE')]: {
		code: 'u5-third-finger-hobby-songs-va',
		keyCode: createKeyCode('AJNE')
	},
	[createKeyCode('AGEM')]: { code: 'u6-four-finger-spooks-v', keyCode: createKeyCode('AGEM') },
	[createKeyCode('YQWE')]: { code: 'u6-four-finger-spooks-va', keyCode: createKeyCode('YQWE') }
};

/** Validates that the unitDatabase has no duplicate keyCodes (runtime check) */
function validateNoDuplicateKeyCodes(): void {
	const keyCodes = new Set<string>();
	for (const unit of Object.values(unitDatabase)) {
		if (keyCodes.has(unit.keyCode)) {
			throw new Error(`Duplicate keyCode detected: ${unit.keyCode}`);
		}
		keyCodes.add(unit.keyCode);
	}
}

// Validate on module load
validateNoDuplicateKeyCodes();

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
