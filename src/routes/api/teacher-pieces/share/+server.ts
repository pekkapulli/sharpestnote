import { error as kitError, json, type RequestHandler } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import type { CustomUnitMaterial } from '$lib/config/types';

const STORED_TEACHER_PIECE_PREFIX = 'tp_';

type SharePieceRequest = {
	customUnitMaterial?: CustomUnitMaterial;
};

type CreatedPieceRow = {
	id: string;
};

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

function getPieceFingerprint(customUnitMaterial: CustomUnitMaterial): string {
	const payload = stableSerialize(customUnitMaterial);
	return createHash('sha256').update(payload).digest('hex');
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
	const pieceFingerprint = getPieceFingerprint(body.customUnitMaterial);

	const { data: existingRows, error: existingError } = await locals.supabase
		.from('teacher_pieces')
		.select('id')
		.eq('teacher_id', user.id)
		.eq('piece_fingerprint', pieceFingerprint)
		.limit(1);

	if (existingError) {
		console.error('Failed to check existing teacher piece for sharing:', existingError);
		return json({ error: 'Could not save piece for sharing' }, { status: 500 });
	}

	const existingPiece = (existingRows?.[0] ?? null) as CreatedPieceRow | null;
	if (existingPiece?.id) {
		const pieceRef = `${STORED_TEACHER_PIECE_PREFIX}${existingPiece.id}`;
		return json(
			{
				pieceId: existingPiece.id,
				pieceRef,
				targetUrl: `${url.origin}/unit/custom/${pieceRef}`
			},
			{ status: 200 }
		);
	}

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
			is_published: true
		})
		.select('id')
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
			targetUrl: `${url.origin}/unit/custom/${pieceRef}`
		},
		{ status: 200 }
	);
};
