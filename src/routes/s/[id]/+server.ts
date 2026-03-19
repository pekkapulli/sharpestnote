import type { RequestHandler } from '@sveltejs/kit';

type ShortLinkRow = {
	teacher_piece_id: string;
	expires_at: string;
};

type TeacherPieceRow = {
	id: string;
	is_published: boolean;
};

async function resolveShortLink(id: string, locals: App.Locals, origin: string) {
	const normalizedId = (id || '').trim();
	if (!normalizedId) {
		return new Response('Short link not found.', { status: 404 });
	}

	const { data, error } = await locals.supabase
		.from('short_links')
		.select('teacher_piece_id, expires_at')
		.eq('id', normalizedId)
		.maybeSingle();

	if (error) {
		console.error('Short-link resolve failed:', error);
		return new Response('Short link could not be resolved right now.', { status: 500 });
	}

	if (!data) {
		return new Response('Short link not found or expired.', { status: 404 });
	}

	const row = data as ShortLinkRow;
	if (!row.teacher_piece_id) {
		return new Response('Short link is invalid.', { status: 500 });
	}

	const expiresAt = new Date(row.expires_at);
	if (!row.expires_at || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
		return new Response('Short link not found or expired.', { status: 404 });
	}

	const { data: pieceData, error: pieceError } = await locals.supabase
		.from('teacher_pieces')
		.select('id, is_published')
		.eq('id', row.teacher_piece_id)
		.maybeSingle();

	if (pieceError) {
		console.error('Teacher-piece lookup during short-link resolve failed:', pieceError);
		return new Response('Short link could not be resolved right now.', { status: 500 });
	}

	if (!pieceData) {
		return new Response('Short link target not found.', { status: 404 });
	}

	const pieceRow = pieceData as TeacherPieceRow;
	if (!pieceRow.is_published) {
		return new Response('Short link target is unavailable.', { status: 404 });
	}

	return Response.redirect(`${origin}/unit/custom/tp_${pieceRow.id}`, 302);
}

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!params.id) {
		return new Response('Short link not found.', { status: 404 });
	}

	return resolveShortLink(params.id, locals, url.origin);
};

export const HEAD: RequestHandler = async ({ params, locals, url }) => {
	if (!params.id) {
		return new Response(null, { status: 404 });
	}

	return resolveShortLink(params.id, locals, url.origin);
};
