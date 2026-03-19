import type { RequestHandler } from '@sveltejs/kit';

type ShareCreateResponse = {
	id: string;
	shortUrl: string;
	targetUrl: string;
	expiresAt: string | null;
	consumedCredit: boolean;
	creditsRemaining: number;
	hasUnlimitedCredits: boolean;
	createdNew: boolean;
	recommendationCreditsAwarded: boolean;
};

type ShareCreateRequest = {
	teacherPieceId?: string;
	renewLink?: boolean;
};

type EnsureShortLinkRpcResult = {
	short_link_id: unknown;
	short_link_expires_at: unknown;
	consumed_credit: unknown;
	has_unlimited_credits: unknown;
	remaining_credits: unknown;
	created_new: unknown;
};

type TeacherPieceRow = {
	id: string;
	is_published: boolean;
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
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'content-type': 'application/json' }
			});
		}

		const body = (await request.json()) as ShareCreateRequest;
		const teacherPieceId = (body.teacherPieceId || '').trim();
		const renewLink = body.renewLink === true;
		if (!teacherPieceId || !isUuid(teacherPieceId)) {
			return new Response(JSON.stringify({ error: 'teacherPieceId is required.' }), {
				status: 400,
				headers: { 'content-type': 'application/json' }
			});
		}

		const { data: pieceData, error: pieceLookupError } = await locals.supabase
			.from('teacher_pieces')
			.select('id, is_published')
			.eq('id', teacherPieceId)
			.eq('teacher_id', user.id)
			.maybeSingle();

		if (pieceLookupError) {
			console.error('Teacher-piece lookup before short-link creation failed:', pieceLookupError);
			return new Response(JSON.stringify({ error: 'Failed to create share link.' }), {
				status: 500,
				headers: { 'content-type': 'application/json' }
			});
		}

		if (!pieceData) {
			return new Response(JSON.stringify({ error: 'Teacher piece not found.' }), {
				status: 404,
				headers: { 'content-type': 'application/json' }
			});
		}

		const pieceRow = pieceData as TeacherPieceRow;

		if (!pieceRow.is_published) {
			const { error: publishError } = await locals.supabase
				.from('teacher_pieces')
				.update({ is_published: true })
				.eq('id', teacherPieceId)
				.eq('teacher_id', user.id);

			if (publishError) {
				console.error('Teacher-piece publish before short-link creation failed:', publishError);
				return new Response(JSON.stringify({ error: 'Failed to publish piece for sharing.' }), {
					status: 500,
					headers: { 'content-type': 'application/json' }
				});
			}
		}

		const targetUrl = `${url.origin}/unit/custom/tp_${teacherPieceId}`;

		for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
			const id = generateShortId(SHORT_ID_LENGTH);

			const { data: rpcData, error: rpcError } = await locals.supabase
				.rpc('ensure_short_link_for_piece', {
					input_teacher_piece_id: teacherPieceId,
					input_short_link_id: id,
					input_force_renew: renewLink
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
			const expiresAt =
				typeof row?.short_link_expires_at === 'string' ? row.short_link_expires_at : null;
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

			const { data: awardReferralCreditsData, error: awardReferralCreditsError } =
				await locals.supabase.rpc('award_referral_credits', { new_teacher_id: user.id }).single();

			if (awardReferralCreditsError) {
				console.error('award_referral_credits failed:', awardReferralCreditsError);
			}

			const recommendationCreditsAwarded = Boolean(awardReferralCreditsData);
			const adjustedRemainingCredits = recommendationCreditsAwarded
				? remainingCredits + 3
				: remainingCredits;

			const data: ShareCreateResponse = {
				id: shortLinkId,
				shortUrl: `${url.origin}/s/${shortLinkId}`,
				targetUrl,
				expiresAt,
				consumedCredit: Boolean(row?.consumed_credit),
				creditsRemaining: adjustedRemainingCredits,
				hasUnlimitedCredits,
				createdNew: Boolean(row?.created_new),
				recommendationCreditsAwarded
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
