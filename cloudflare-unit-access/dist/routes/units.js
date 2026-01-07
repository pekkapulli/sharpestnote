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
exports.unitDatabase = {
    'tw-v': { code: 'tw-v', keyCode: 'LHXQ', backendCode: 'unit_001' },
    'tw-va': { code: 'tw-va', keyCode: 'QPRT', backendCode: 'unit_002' },
    'tw-r': { code: 'tw-r', keyCode: 'AEIH', backendCode: 'unit_003' },
    'tw-c': { code: 'tw-c', keyCode: 'AOEG', backendCode: 'unit_004' },
    '1st-finger-nature-va': { code: '1st-finger-nature-va', keyCode: 'ZKWD', backendCode: 'unit_005' }
};
const handleUnitRoutes = (request) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = request.params;
    if (!code) {
        return new Response(JSON.stringify(Object.values(exports.unitDatabase)), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    const unit = exports.unitDatabase[code];
    if (!unit) {
        return new Response(JSON.stringify({ error: 'Unit not found' }), { status: 404 });
    }
    return new Response(JSON.stringify(unit), {
        headers: { 'Content-Type': 'application/json' }
    });
});
exports.handleUnitRoutes = handleUnitRoutes;
