import { json, type RequestHandler } from '@sveltejs/kit';

type Params = {
	pieceId: string;
};

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const pieceId = (params as Params).pieceId?.trim() || '';
	if (!pieceId || !isUuid(pieceId)) {
		return json({ error: 'Invalid piece id.' }, { status: 400 });
	}

	const { data: existingPiece, error: lookupError } = await locals.supabase
		.from('teacher_pieces')
		.select('id')
		.eq('id', pieceId)
		.eq('teacher_id', user.id)
		.maybeSingle();

	if (lookupError) {
		console.error('Failed to verify teacher piece before delete:', lookupError);
		return json({ error: 'Unable to delete piece right now.' }, { status: 500 });
	}

	if (!existingPiece) {
		return json({ error: 'Piece not found.' }, { status: 404 });
	}

	const { error: deleteError } = await locals.supabase
		.from('teacher_pieces')
		.delete()
		.eq('id', pieceId)
		.eq('teacher_id', user.id);

	if (deleteError) {
		console.error('Failed to delete teacher piece:', deleteError);
		return json({ error: 'Unable to delete piece right now.' }, { status: 500 });
	}

	return json({ ok: true }, { status: 200 });
};
