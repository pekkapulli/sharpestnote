import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

type ShareCreateResponse = {
	id: string;
	shortUrl: string;
	targetUrl: string;
	ttlSeconds: number;
};

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = await request.json();

		type CFPlatform = { env?: { WORKER_URL?: string } };
		const cfEnvUrl = (platform as unknown as CFPlatform)?.env?.WORKER_URL;
		const workerBase = cfEnvUrl ?? env.WORKER_URL ?? 'http://localhost:8787';
		const res = await fetch(`${workerBase}/share/custom`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});

		if (!res.ok) {
			let message = 'Failed to create share link.';
			try {
				const errorPayload = (await res.json()) as { error?: string; message?: string };
				message = errorPayload.message || errorPayload.error || message;
			} catch {
				const text = await res.text();
				if (text) message = text;
			}

			return new Response(JSON.stringify({ error: message }), {
				status: res.status,
				headers: { 'content-type': 'application/json' }
			});
		}

		const data = (await res.json()) as ShareCreateResponse;
		if (!data?.shortUrl) {
			return new Response(JSON.stringify({ error: 'Invalid short-link response from worker.' }), {
				status: 502,
				headers: { 'content-type': 'application/json' }
			});
		}

		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		});
	} catch (error) {
		console.error('Share short-link creation failed:', error);
		return new Response(JSON.stringify({ error: 'Share short-link creation failed' }), {
			status: 500,
			headers: { 'content-type': 'application/json' }
		});
	}
};
