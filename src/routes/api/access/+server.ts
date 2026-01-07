import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		const res = await fetch('http://localhost:8787/access', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});

		const data = await res.json();

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
