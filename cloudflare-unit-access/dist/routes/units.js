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
/** Map of keyCode -> Unit. KeyCode is the primary identifier to prevent duplicates. */
exports.unitDatabase = {
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
