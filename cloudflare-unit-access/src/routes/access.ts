import type { IRequest } from 'itty-router';
import type { AccessStatus } from '../types';
import { unitDatabase } from './units';

// Simple in-memory rate limit tracking (IP -> { count, resetTime })
// For production, use Cloudflare KV or add a WAF rate limit rule
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 60 seconds
const RATE_LIMIT_MAX_ATTEMPTS = 10;

function getClientIP(request: IRequest): string {
	// Cloudflare provides CF-Connecting-IP header with the real client IP
	const cfConnectingIP = (request.headers?.get?.('CF-Connecting-IP') || '').toString();
	return cfConnectingIP || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
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

export const handleAccessRoutes = async (request: IRequest): Promise<Response> => {
	const { unitCode, keyCode } = (await request.json()) as { unitCode?: string; keyCode?: string };

	if (!unitCode || !keyCode) {
		return new Response(
			JSON.stringify({
				error: 'Missing unitCode or keyCode',
				message: 'Both unitCode and keyCode are required'
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const unit = unitDatabase[unitCode];

	if (!unit) {
		return new Response(
			JSON.stringify({ error: 'Unit not found', message: 'The requested unit does not exist' }),
			{
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const hasAccess = keyCode.trim().toUpperCase() === unit.keyCode.trim().toUpperCase();

	const response: AccessStatus = {
		unitCode,
		hasAccess,
		message: hasAccess ? 'Access granted' : 'Invalid key code'
	};

	return new Response(JSON.stringify(response), {
		headers: { 'Content-Type': 'application/json' }
	});
};

export const handleAccessLookup = async (request: IRequest): Promise<Response> => {
	const clientIP = getClientIP(request);
	const rateLimitCheck = checkRateLimit(clientIP);

	if (!rateLimitCheck.allowed) {
		return new Response(
			JSON.stringify({
				error: 'Too many requests. Please try again later.'
			}),
			{
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': (rateLimitCheck.retryAfter || 60).toString()
				}
			}
		);
	}

	const { keyCode } = (await request.json()) as { keyCode?: string };

	if (!keyCode) {
		return new Response(
			JSON.stringify({
				error: 'Missing keyCode'
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const trimmedKey = keyCode.trim().toUpperCase();

	// Find unit by key code
	const unit = Object.values(unitDatabase).find(
		(u) => u.keyCode.trim().toUpperCase() === trimmedKey
	);

	if (!unit) {
		return new Response(JSON.stringify({ error: 'Key code not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(JSON.stringify({ unitCode: unit.code }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
