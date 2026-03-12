import type { IRequest } from 'itty-router';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 180; // 180 days
const MIN_TTL_SECONDS = 60 * 60 * 24; // 1 day
const MAX_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year
const SHORT_ID_LENGTH = 7;
const MAX_COLLISION_RETRIES = 5;
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

type ShareCreateRequest = {
	targetUrl?: string;
	ttlSeconds?: number;
};

type ShareRecord = {
	targetUrl: string;
	createdAt: string;
};

type KvStore = {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

type WorkerEnv = {
	SHORT_LINKS?: KvStore;
};

export async function handleCreateCustomShare(
	request: IRequest,
	env: WorkerEnv
): Promise<Response> {
	if (!env.SHORT_LINKS) {
		return json(
			{
				error: 'KV namespace is not configured',
				message: 'SHORT_LINKS binding is missing on this Worker.'
			},
			500
		);
	}

	const body = (await request.json()) as ShareCreateRequest;
	const targetUrl = (body.targetUrl || '').trim();
	const ttlSeconds = clampTtl(body.ttlSeconds);

	if (!targetUrl) {
		return json(
			{
				error: 'Missing targetUrl',
				message: 'targetUrl is required.'
			},
			400
		);
	}

	const requestUrl = new URL(request.url);
	if (!isAllowedTargetUrl(targetUrl, requestUrl)) {
		return json(
			{
				error: 'Invalid targetUrl',
				message: 'Short links only support same-origin Sharpest Note URLs.'
			},
			400
		);
	}

	for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
		const id = generateShortId(SHORT_ID_LENGTH);
		const existing = await env.SHORT_LINKS.get(id);
		if (existing) continue;

		const record: ShareRecord = {
			targetUrl,
			createdAt: new Date().toISOString()
		};

		await env.SHORT_LINKS.put(id, JSON.stringify(record), {
			expirationTtl: ttlSeconds
		});

		return json({
			id,
			shortUrl: `${requestUrl.origin}/s/${id}`,
			targetUrl,
			ttlSeconds
		});
	}

	return json(
		{
			error: 'Unable to generate short link',
			message: 'Please retry link creation.'
		},
		503
	);
}

export async function handleResolveCustomShare(
	request: IRequest,
	env: WorkerEnv
): Promise<Response> {
	if (!env.SHORT_LINKS) {
		return new Response('Short link storage is not configured.', { status: 500 });
	}

	const { id } = request.params as { id?: string };
	const normalizedId = (id || '').trim();
	if (!normalizedId) {
		return new Response('Short link not found.', { status: 404 });
	}

	const recordText = await env.SHORT_LINKS.get(normalizedId);
	if (!recordText) {
		return new Response('Short link not found or expired.', { status: 404 });
	}

	let record: ShareRecord;
	try {
		record = JSON.parse(recordText) as ShareRecord;
	} catch {
		return new Response('Short link is invalid.', { status: 500 });
	}

	if (!record?.targetUrl) {
		return new Response('Short link is invalid.', { status: 500 });
	}

	const requestUrl = new URL(request.url);
	if (!isAllowedTargetUrl(record.targetUrl, requestUrl)) {
		return new Response('Short link target is not allowed.', { status: 400 });
	}

	return Response.redirect(record.targetUrl, 302);
}

function generateShortId(length: number): string {
	let output = '';
	const random = new Uint32Array(length);
	crypto.getRandomValues(random);

	for (let i = 0; i < length; i++) {
		output += ID_ALPHABET[random[i] % ID_ALPHABET.length];
	}

	return output;
}

function clampTtl(ttlSeconds: number | undefined): number {
	if (!Number.isFinite(ttlSeconds)) return DEFAULT_TTL_SECONDS;
	const safeValue = Math.floor(ttlSeconds as number);
	return Math.max(MIN_TTL_SECONDS, Math.min(MAX_TTL_SECONDS, safeValue));
}

function isAllowedTargetUrl(targetUrl: string, requestUrl: URL): boolean {
	let parsed: URL;
	try {
		parsed = new URL(targetUrl);
	} catch {
		return false;
	}

	if (parsed.protocol !== 'https:') return false;

	const targetOrigin = parsed.origin.toLowerCase();
	const requestOrigin = requestUrl.origin.toLowerCase();

	const allowedOrigins = new Set<string>([
		requestOrigin,
		'https://sharpestnote.com',
		'https://www.sharpestnote.com'
	]);

	return allowedOrigins.has(targetOrigin);
}

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
