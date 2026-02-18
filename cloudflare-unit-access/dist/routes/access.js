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
exports.handleAccessLookup = exports.handleAccessRoutes = void 0;
const types_1 = require("../types");
const units_1 = require("./units");
// Simple in-memory rate limit tracking (IP -> { count, resetTime })
// For production, use Cloudflare KV or add a WAF rate limit rule
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 60 seconds
const RATE_LIMIT_MAX_ATTEMPTS = 10;
function getClientIP(request) {
    var _a, _b;
    // Cloudflare provides CF-Connecting-IP header with the real client IP
    const cfConnectingIP = (((_b = (_a = request.headers) === null || _a === void 0 ? void 0 : _a.get) === null || _b === void 0 ? void 0 : _b.call(_a, 'CF-Connecting-IP')) || '').toString();
    return cfConnectingIP || 'unknown';
}
function checkRateLimit(ip) {
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    if (!record || now > record.resetTime) {
        // First request or window expired, reset
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return { allowed: true };
    }
    if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        return { allowed: false, retryAfter };
    }
    record.count += 1;
    return { allowed: true };
}
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
    const unit = (0, units_1.findUnitByCode)(unitCode);
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
const handleAccessLookup = (request) => __awaiter(void 0, void 0, void 0, function* () {
    const clientIP = getClientIP(request);
    const rateLimitCheck = checkRateLimit(clientIP);
    if (!rateLimitCheck.allowed) {
        return new Response(JSON.stringify({
            error: 'Too many requests. Please try again later.'
        }), {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': (rateLimitCheck.retryAfter || 60).toString()
            }
        });
    }
    const { keyCode } = (yield request.json());
    if (!keyCode) {
        return new Response(JSON.stringify({
            error: 'Missing keyCode'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    const trimmedKey = keyCode.trim().toUpperCase();
    // Direct lookup by keyCode (O(1) because unitDatabase is keyed by keyCode)
    const normalizedKey = (0, types_1.createKeyCode)(trimmedKey);
    const unit = units_1.unitDatabase[normalizedKey];
    if (!unit) {
        return new Response(JSON.stringify({ error: 'Key code not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    return new Response(JSON.stringify({ unitCode: unit.code }), {
        headers: { 'Content-Type': 'application/json' }
    });
});
exports.handleAccessLookup = handleAccessLookup;
