import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { packCustomUnitMaterialForUrl } from '$lib/util/pieceUrl';
import type { CustomUnitMaterial } from '$lib/config/types';

type TeacherPieceRow = {
	id: string;
	piece_code: string;
	piece_label: string;
	instrument: string;
	custom_unit_material: unknown;
	is_published: boolean;
	created_at: string;
	updated_at: string;
};

export const load: PageServerLoad = async ({ url, locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		const redirectTarget = `${url.pathname}${url.search}`;
		throw redirect(303, `/teachers/login?next=${encodeURIComponent(redirectTarget)}`);
	}

	const { data, error } = await locals.supabase
		.from('teacher_pieces')
		.select(
			'id, piece_code, piece_label, instrument, custom_unit_material, is_published, created_at, updated_at'
		)
		.eq('teacher_id', user.id)
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('Failed to load teacher pieces:', error);
		return {
			teacherEmail: user.email ?? '',
			pieces: [],
			loadError: 'Could not load your pieces right now. Please try again shortly.'
		};
	}

	const pieces = ((data ?? []) as TeacherPieceRow[]).map((piece) => {
		const pieceId = piece.id.trim();
		const pieceRef = `tp_${pieceId}`;
		const shareUrl = piece.is_published ? `/unit/custom/${pieceRef}` : null;

		let composerUrl = `/teachers/composer/edit?pieceId=${encodeURIComponent(pieceId)}`;
		try {
			composerUrl = `/teachers/composer/edit?pieceId=${encodeURIComponent(pieceId)}&draft=${encodeURIComponent(packCustomUnitMaterialForUrl(piece.custom_unit_material as CustomUnitMaterial))}`;
		} catch {
			composerUrl = `/teachers/composer/edit?pieceId=${encodeURIComponent(pieceId)}`;
		}

		return {
			id: pieceId,
			pieceCode: piece.piece_code,
			pieceLabel: piece.piece_label,
			instrument: piece.instrument,
			isPublished: piece.is_published,
			createdAt: piece.created_at,
			updatedAt: piece.updated_at,
			shareUrl,
			composerUrl
		};
	});

	return {
		teacherEmail: user.email ?? '',
		pieces,
		loadError: ''
	};
};
