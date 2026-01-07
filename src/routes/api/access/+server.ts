import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = await request.json();

		// Narrow the platform type to a minimal Cloudflare env shape to avoid explicit any
		type CFPlatform = { env?: { WORKER_URL?: string } };
		const cfEnvUrl = (platform as unknown as CFPlatform)?.env?.WORKER_URL;
		const workerBase = cfEnvUrl ?? env.WORKER_URL ?? 'http://localhost:8787';
		const res = await fetch(`${workerBase}/access`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});

		let data: unknown;
		const contentType = res.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			try {
				data = await res.json();
			} catch {
				data = { ok: res.ok, status: res.status };
			}
		} else {
			const text = await res.text();
			data = { ok: res.ok, status: res.status, message: text };
		}

		return new Response(JSON.stringify(data), {
			status: res.status,
			headers: { 'content-type': 'application/json' }
		});
	} catch (error) {
		console.error('Access check failed:', error);
		return new Response(JSON.stringify({ error: 'Access check failed', ok: false }), {
			status: 500,
			headers: { 'content-type': 'application/json' }
		});
	}
};
