import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

function getWorkerBaseUrl(platform: App.Platform | undefined): string {
	type CFPlatform = { env?: { WORKER_URL?: string } };
	const cfEnvUrl = (platform as unknown as CFPlatform)?.env?.WORKER_URL;
	return cfEnvUrl ?? env.WORKER_URL ?? 'http://localhost:8787';
}

async function resolveShortLink(request: Request, id: string, platform: App.Platform | undefined) {
	const workerBase = getWorkerBaseUrl(platform);
	const encodedId = encodeURIComponent(id);
	const upstream = await fetch(`${workerBase}/s/${encodedId}`, {
		method: request.method,
		headers: { accept: request.headers.get('accept') ?? '*/*' },
		redirect: 'manual'
	});

	if (upstream.status >= 300 && upstream.status < 400) {
		const location = upstream.headers.get('location');
		if (location) {
			return new Response(null, {
				status: upstream.status,
				headers: { location }
			});
		}
	}

	return new Response(await upstream.text(), {
		status: upstream.status,
		headers: {
			'content-type': upstream.headers.get('content-type') ?? 'text/plain; charset=UTF-8'
		}
	});
}

export const GET: RequestHandler = async ({ request, params, platform }) => {
	if (!params.id) {
		return new Response('Short link not found.', { status: 404 });
	}

	return resolveShortLink(request, params.id, platform);
};

export const HEAD: RequestHandler = async ({ request, params, platform }) => {
	if (!params.id) {
		return new Response(null, { status: 404 });
	}

	return resolveShortLink(request, params.id, platform);
};
