import { error as kitError, json, type RequestHandler } from '@sveltejs/kit';
import type { CustomUnitMaterial } from '$lib/config/types';

const STORED_TEACHER_PIECE_PREFIX = 'tp_';

type SharePieceRequest = {
	pieceId?: string;
	customUnitMaterial?: CustomUnitMaterial;
};

type CreatedPieceRow = {
	id: string;
	is_published: boolean;
};

type ExistingShortLinkRow = {
	id: string;
	expires_at: string;
};

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function stableSerialize(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
			a.localeCompare(b)
		);
		return `{${entries
			.map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
			.join(',')}}`;
	}

	return JSON.stringify(value);
}

async function getPieceFingerprint(customUnitMaterial: CustomUnitMaterial): Promise<string> {
	const payload = stableSerialize(customUnitMaterial);
	const encoded = new TextEncoder().encode(payload);
	const digest = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function assertValidCustomUnitMaterial(value: unknown): asserts value is CustomUnitMaterial {
	if (!value || typeof value !== 'object') {
		throw kitError(400, 'customUnitMaterial is required');
	}

	const maybe = value as Partial<CustomUnitMaterial>;
	if (!maybe.piece || typeof maybe.piece !== 'object') {
		throw kitError(400, 'customUnitMaterial.piece is required');
	}

	const piece = maybe.piece as Partial<CustomUnitMaterial['piece']>;
	if (
		typeof piece.code !== 'string' ||
		typeof piece.label !== 'string' ||
		typeof piece.key !== 'string' ||
		typeof piece.mode !== 'string' ||
		typeof piece.barLength !== 'number' ||
		!Array.isArray(piece.melody) ||
		!Array.isArray(piece.scale)
	) {
		throw kitError(400, 'customUnitMaterial.piece is invalid');
	}

	if (typeof maybe.instrument !== 'string') {
		throw kitError(400, 'customUnitMaterial.instrument is required');
	}

	if (maybe.teacherNote !== undefined && typeof maybe.teacherNote !== 'string') {
		throw kitError(400, 'customUnitMaterial.teacherNote must be a string');
	}
}

export const POST: RequestHandler = async ({ locals, request, url }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body: SharePieceRequest;
	try {
		body = (await request.json()) as SharePieceRequest;
	} catch {
		return json({ error: 'Invalid JSON request body' }, { status: 400 });
	}

	try {
		assertValidCustomUnitMaterial(body.customUnitMaterial);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Invalid custom unit payload';
		return json({ error: message }, { status: 400 });
	}

	const piece = body.customUnitMaterial.piece;
	const teacherNote = body.customUnitMaterial.teacherNote?.trim() || null;
	const pieceFingerprint = await getPieceFingerprint(body.customUnitMaterial);
	const requestPieceId = (body.pieceId || '').trim();

	if (requestPieceId && !isUuid(requestPieceId)) {
		return json({ error: 'pieceId must be a valid UUID.' }, { status: 400 });
	}

	if (requestPieceId) {
		const { data: updatedData, error: updateError } = await locals.supabase
			.from('teacher_pieces')
			.update({
				piece_fingerprint: pieceFingerprint,
				piece_code: piece.code.trim(),
				piece_label: piece.label.trim(),
				instrument: body.customUnitMaterial.instrument,
				teacher_note: teacherNote,
				custom_unit_material: body.customUnitMaterial
			})
			.eq('id', requestPieceId)
			.eq('teacher_id', user.id)
			.select('id, is_published')
			.maybeSingle();

		if (updateError) {
			console.error('Failed to update teacher piece:', updateError);
			return json({ error: 'Could not update saved piece' }, { status: 500 });
		}

		if (!updatedData) {
			return json({ error: 'Saved piece not found.' }, { status: 404 });
		}

		const updatedPiece = updatedData as CreatedPieceRow;
		const pieceRef = `${STORED_TEACHER_PIECE_PREFIX}${updatedPiece.id}`;

		const { data: shortLinkRows, error: shortLinkError } = await locals.supabase
			.from('short_links')
			.select('id, expires_at')
			.eq('teacher_piece_id', updatedPiece.id)
			.eq('created_by', user.id)
			.gt('expires_at', new Date().toISOString())
			.order('expires_at', { ascending: false })
			.order('created_at', { ascending: false })
			.limit(1);

		if (shortLinkError) {
			console.error('Failed to check short-link after teacher piece update:', shortLinkError);
			return json({ error: 'Could not update saved piece' }, { status: 500 });
		}

		const existingShortLink = (shortLinkRows?.[0] ?? null) as ExistingShortLinkRow | null;

		return json(
			{
				pieceId: updatedPiece.id,
				pieceRef,
				targetUrl: `${url.origin}/unit/custom/${pieceRef}`,
				isPublished: updatedPiece.is_published,
				hasShortLink: Boolean(existingShortLink?.id),
				shortUrl: existingShortLink?.id ? `${url.origin}/s/${existingShortLink.id}` : null,
				shortLinkExpiresAt: existingShortLink?.expires_at ?? null
			},
			{ status: 200 }
		);
	}

	// No explicit pieceId means the user is creating a new assignment draft.
	// Always insert a new teacher_piece row so first share for that draft can
	// consume credits based on link creation rules.

	const { data, error } = await locals.supabase
		.from('teacher_pieces')
		.insert({
			teacher_id: user.id,
			piece_fingerprint: pieceFingerprint,
			piece_code: piece.code.trim(),
			piece_label: piece.label.trim(),
			instrument: body.customUnitMaterial.instrument,
			teacher_note: teacherNote,
			custom_unit_material: body.customUnitMaterial,
			is_published: false
		})
		.select('id, is_published')
		.single();

	if (error || !data) {
		console.error('Failed to persist teacher piece for sharing:', error);
		return json({ error: 'Could not save piece for sharing' }, { status: 500 });
	}

	const row = data as CreatedPieceRow;
	const pieceRef = `${STORED_TEACHER_PIECE_PREFIX}${row.id}`;

	return json(
		{
			pieceId: row.id,
			pieceRef,
			targetUrl: `${url.origin}/unit/custom/${pieceRef}`,
			isPublished: row.is_published,
			hasShortLink: false,
			shortUrl: null,
			shortLinkExpiresAt: null
		},
		{ status: 200 }
	);
};
