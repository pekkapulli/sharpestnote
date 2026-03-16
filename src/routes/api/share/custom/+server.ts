import type { RequestHandler } from '@sveltejs/kit';

type ShareCreateResponse = {
	id: string;
	shortUrl: string;
	targetUrl: string;
	consumedCredit: boolean;
	creditsRemaining: number;
	hasUnlimitedCredits: boolean;
	createdNew: boolean;
};

type ShareCreateRequest = {
	teacherPieceId?: string;
};

type EnsureShortLinkRpcResult = {
	short_link_id: unknown;
	consumed_credit: unknown;
	has_unlimited_credits: unknown;
	remaining_credits: unknown;
	created_new: unknown;
};

const SHORT_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const SHORT_ID_LENGTH = 7;
const MAX_COLLISION_RETRIES = 8;

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function generateShortId(length: number): string {
	const random = new Uint32Array(length);
	crypto.getRandomValues(random);
	let output = '';

	for (let i = 0; i < length; i++) {
		output += SHORT_ID_ALPHABET[random[i] % SHORT_ID_ALPHABET.length];
	}

	return output;
}

export const POST: RequestHandler = async ({ request, locals, url }) => {
	try {
		const { session } = await locals.safeGetSession();
		if (!session) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'content-type': 'application/json' }
			});
		}

		const body = (await request.json()) as ShareCreateRequest;
		const teacherPieceId = (body.teacherPieceId || '').trim();
		if (!teacherPieceId || !isUuid(teacherPieceId)) {
			return new Response(JSON.stringify({ error: 'teacherPieceId is required.' }), {
				status: 400,
				headers: { 'content-type': 'application/json' }
			});
		}

		const targetUrl = `${url.origin}/unit/custom/tp_${teacherPieceId}`;

		for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
			const id = generateShortId(SHORT_ID_LENGTH);

			const { data: rpcData, error: rpcError } = await locals.supabase
				.rpc('ensure_short_link_for_piece', {
					input_teacher_piece_id: teacherPieceId,
					input_short_link_id: id
				})
				.single();

			if (rpcError) {
				if (rpcError.code === '23505') {
					continue;
				}

				if (rpcError.message?.includes('INSUFFICIENT_CREDITS')) {
					return new Response(
						JSON.stringify({ error: 'You do not have enough credits to share this piece.' }),
						{
							status: 403,
							headers: { 'content-type': 'application/json' }
						}
					);
				}

				if (rpcError.message?.includes('Teacher piece not found')) {
					return new Response(JSON.stringify({ error: 'Teacher piece not found.' }), {
						status: 404,
						headers: { 'content-type': 'application/json' }
					});
				}

				console.error('Short-link RPC failed:', rpcError);
				return new Response(JSON.stringify({ error: 'Failed to create share link.' }), {
					status: 500,
					headers: { 'content-type': 'application/json' }
				});
			}

			const row = rpcData as EnsureShortLinkRpcResult | null;
			const shortLinkId = typeof row?.short_link_id === 'string' ? row.short_link_id : '';
			if (!shortLinkId) {
				return new Response(JSON.stringify({ error: 'Invalid short-link response.' }), {
					status: 502,
					headers: { 'content-type': 'application/json' }
				});
			}

			const hasUnlimitedCredits = Boolean(row?.has_unlimited_credits);
			const remainingCredits =
				typeof row?.remaining_credits === 'number' && Number.isFinite(row.remaining_credits)
					? Math.max(0, Math.trunc(row.remaining_credits))
					: 0;

			const data: ShareCreateResponse = {
				id: shortLinkId,
				shortUrl: `${url.origin}/s/${shortLinkId}`,
				targetUrl,
				consumedCredit: Boolean(row?.consumed_credit),
				creditsRemaining: remainingCredits,
				hasUnlimitedCredits,
				createdNew: Boolean(row?.created_new)
			};

			return new Response(JSON.stringify(data), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({ error: 'Unable to generate short link. Please retry.' }), {
			status: 503,
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
