"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUnitRoutes = exports.unitDatabase = void 0;
exports.findUnitByCode = findUnitByCode;
const types_1 = require("../types");
/** Map of keyCode -> Unit. KeyCode is the primary identifier to prevent duplicates. */
exports.unitDatabase = {
    [(0, types_1.createKeyCode)('LHXQ')]: { code: 'tw-v', keyCode: (0, types_1.createKeyCode)('LHXQ') },
    [(0, types_1.createKeyCode)('QPRT')]: { code: 'tw-va', keyCode: (0, types_1.createKeyCode)('QPRT') },
    [(0, types_1.createKeyCode)('AEIH')]: { code: 'tw-r', keyCode: (0, types_1.createKeyCode)('AEIH') },
    [(0, types_1.createKeyCode)('AOEG')]: { code: 'tw-c', keyCode: (0, types_1.createKeyCode)('AOEG') },
    [(0, types_1.createKeyCode)('ZKWD')]: { code: '1st-finger-nature-va', keyCode: (0, types_1.createKeyCode)('ZKWD') },
    [(0, types_1.createKeyCode)('XYZA')]: { code: 'viljan-biisit-va', keyCode: (0, types_1.createKeyCode)('XYZA') },
    [(0, types_1.createKeyCode)('MBRA')]: { code: 'happy-bd-song', keyCode: (0, types_1.createKeyCode)('MBRA') },
    [(0, types_1.createKeyCode)('JNEK')]: { code: 'u3-playful-second-finger-v', keyCode: (0, types_1.createKeyCode)('JNEK') },
    [(0, types_1.createKeyCode)('MIXT')]: { code: 'u3-playful-second-finger-va', keyCode: (0, types_1.createKeyCode)('MIXT') },
    [(0, types_1.createKeyCode)('UHBC')]: { code: 'u4-third-finger-tales-v', keyCode: (0, types_1.createKeyCode)('UHBC') },
    [(0, types_1.createKeyCode)('LNEL')]: { code: 'u4-third-finger-tales-va', keyCode: (0, types_1.createKeyCode)('LNEL') },
    [(0, types_1.createKeyCode)('PIKI')]: { code: 'u5-third-finger-hobby-songs-v', keyCode: (0, types_1.createKeyCode)('PIKI') },
    [(0, types_1.createKeyCode)('AJNE')]: { code: 'u5-third-finger-hobby-songs-va', keyCode: (0, types_1.createKeyCode)('AJNE') },
    [(0, types_1.createKeyCode)('AGEM')]: { code: 'u6-four-finger-spooks-v', keyCode: (0, types_1.createKeyCode)('AGEM') },
    [(0, types_1.createKeyCode)('YQWE')]: { code: 'u6-four-finger-spooks-va', keyCode: (0, types_1.createKeyCode)('YQWE') }
};
/** Validates that the unitDatabase has no duplicate keyCodes (runtime check) */
function validateNoDuplicateKeyCodes() {
    const keyCodes = new Set();
    for (const unit of Object.values(exports.unitDatabase)) {
        if (keyCodes.has(unit.keyCode)) {
            throw new Error(`Duplicate keyCode detected: ${unit.keyCode}`);
        }
        keyCodes.add(unit.keyCode);
    }
}
// Validate on module load
validateNoDuplicateKeyCodes();
/** Helper to find a unit by its code (for backward compatibility) */
function findUnitByCode(code) {
    return Object.values(exports.unitDatabase).find((unit) => unit.code === code);
}
const handleUnitRoutes = (request) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = request.params;
    if (!code) {
        return new Response(JSON.stringify(Object.values(exports.unitDatabase)), {
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
});
exports.handleUnitRoutes = handleUnitRoutes;
