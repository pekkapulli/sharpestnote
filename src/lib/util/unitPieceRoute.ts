import { error } from '@sveltejs/kit';
import { getUnitByCode, normalizeUnitCode } from '$lib/config/units';
import type { CustomUnitMaterial, Piece, UnitMaterial } from '$lib/config/types';
import { getImageUrl } from '$lib/util/getImageUrl';
import { unpackCustomUnitMaterialFromUrl } from '$lib/util/pieceUrl';
import type { SupabaseClient } from '@supabase/supabase-js';

export const CUSTOM_UNIT_CODE = 'custom';
const CUSTOM_IMAGE_URL = '/og-logo.png';
const STORED_TEACHER_PIECE_PREFIX = 'tp_';

export type UnitPieceRouteData = {
	unit: UnitMaterial;
	piece: Piece;
	teacherNote?: string;
	previousPiece: Piece | null;
	nextPiece: Piece | null;
	code: string;
	pieceCode: string;
	imageUrl: string;
	isCustomPiece: boolean;
};

type UnitPieceRouteOptions = {
	supabase?: SupabaseClient;
};

type StoredTeacherPieceRow = {
	custom_unit_material: CustomUnitMaterial;
	is_published: boolean;
};

export function isCustomUnitCode(code: string | null | undefined): boolean {
	return normalizeUnitCode(code) === CUSTOM_UNIT_CODE;
}

export async function getUnitPieceRouteData(
	params: { code: string; piece: string },
	options: UnitPieceRouteOptions = {}
): Promise<UnitPieceRouteData> {
	const normalizedCode = normalizeUnitCode(params.code);

	if (isCustomUnitCode(params.code)) {
		const customUnitMaterial = await resolveCustomUnitMaterial(params.piece, options.supabase);
		const unit = createCustomUnitMaterial(customUnitMaterial);
		const piece = customUnitMaterial.piece;

		return {
			unit,
			piece,
			teacherNote: customUnitMaterial.teacherNote,
			previousPiece: null,
			nextPiece: null,
			code: normalizedCode,
			pieceCode: params.piece,
			imageUrl: CUSTOM_IMAGE_URL,
			isCustomPiece: true
		};
	}

	const unit = getUnitByCode(params.code);
	if (!unit) {
		throw error(404, 'Unit not found');
	}

	const currentIndex = unit.pieces.findIndex((p) => p.code === params.piece);
	if (currentIndex === -1) {
		throw error(404, 'Piece not found');
	}

	const piece = unit.pieces[currentIndex];
	const previousPiece = currentIndex > 0 ? unit.pieces[currentIndex - 1] : null;
	const nextPiece = currentIndex < unit.pieces.length - 1 ? unit.pieces[currentIndex + 1] : null;

	return {
		unit,
		piece,
		previousPiece,
		nextPiece,
		code: normalizedCode,
		pieceCode: params.piece,
		imageUrl: getImageUrl(params.code),
		isCustomPiece: false
	};
}

async function resolveCustomUnitMaterial(
	pieceParam: string,
	supabase?: SupabaseClient
): Promise<CustomUnitMaterial> {
	if (isStoredTeacherPieceReference(pieceParam)) {
		const pieceId = pieceParam.slice(STORED_TEACHER_PIECE_PREFIX.length);
		if (!isUuid(pieceId)) {
			throw error(400, 'Invalid teacher piece reference');
		}

		if (!supabase) {
			throw error(500, 'Supabase client is required for stored teacher piece links');
		}

		const { data, error: fetchError } = await supabase
			.from('teacher_pieces')
			.select('custom_unit_material, is_published')
			.eq('id', pieceId)
			.eq('is_published', true)
			.maybeSingle();

		if (fetchError) {
			throw error(500, 'Could not load teacher piece');
		}

		if (!data) {
			throw error(404, 'Teacher piece not found');
		}

		const row = data as StoredTeacherPieceRow;
		if (!row.is_published || !row.custom_unit_material) {
			throw error(404, 'Teacher piece not found');
		}

		return row.custom_unit_material;
	}

	return tryUnpackCustomUnitMaterial(pieceParam);
}

function isStoredTeacherPieceReference(value: string): boolean {
	return value.startsWith(STORED_TEACHER_PIECE_PREFIX);
}

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function createCustomUnitStub(): UnitMaterial {
	return {
		published: true,
		demo: 'custom',
		code: CUSTOM_UNIT_CODE,
		instrument: 'violin',
		title: 'Custom Piece',
		description: 'Generated from a packed piece URL payload.',
		gumroadUrl: 'units',
		pieces: []
	};
}

function createCustomUnitMaterial(customUnitMaterial: CustomUnitMaterial): UnitMaterial {
	const { piece, instrument, teacherNote } = customUnitMaterial;
	const trimmedTeacherNote = teacherNote?.trim() ?? '';
	const defaultDescription = `${piece.label} by ${piece.composer || 'Unknown composer'}`;
	const description = trimmedTeacherNote || defaultDescription;

	return {
		...createCustomUnitStub(),
		instrument,
		title: `Custom Piece: ${piece.label}`,
		description,
		pieces: [piece]
	};
}

function tryUnpackCustomUnitMaterial(packedPiece: string): CustomUnitMaterial {
	try {
		return unpackCustomUnitMaterialFromUrl(packedPiece);
	} catch {
		throw error(400, 'Invalid packed piece payload');
	}
}
