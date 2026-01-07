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
exports.handleAccessRoutes = void 0;
const units_1 = require("./units");
const handleAccessRoutes = (request) => __awaiter(void 0, void 0, void 0, function* () {
    const { unitCode, keyCode } = (yield request.json());
    if (!unitCode || !keyCode) {
        return new Response(JSON.stringify({
            error: 'Missing unitCode or keyCode',
            message: 'Both unitCode and keyCode are required'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    const unit = units_1.unitDatabase[unitCode];
    if (!unit) {
        return new Response(JSON.stringify({ error: 'Unit not found', message: 'The requested unit does not exist' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    const hasAccess = keyCode.trim().toUpperCase() === unit.keyCode.trim().toUpperCase();
    const response = {
        unitCode,
        hasAccess,
        message: hasAccess ? 'Access granted' : 'Invalid key code'
    };
    return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
    });
});
exports.handleAccessRoutes = handleAccessRoutes;
