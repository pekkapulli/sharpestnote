import { error } from '@sveltejs/kit';
import { getUnitByCode, normalizeUnitCode } from '$lib/config/units';
import type { CustomUnitMaterial, Piece, UnitMaterial } from '$lib/config/types';
import { getImageUrl } from '$lib/util/getImageUrl';
import { unpackCustomUnitMaterialFromUrl } from '$lib/util/pieceUrl';

export const CUSTOM_UNIT_CODE = 'custom';
const CUSTOM_IMAGE_URL = '/og-logo.png';

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

export function isCustomUnitCode(code: string | null | undefined): boolean {
	return normalizeUnitCode(code) === CUSTOM_UNIT_CODE;
}

export function getUnitPieceRouteData(params: { code: string; piece: string }): UnitPieceRouteData {
	const normalizedCode = normalizeUnitCode(params.code);

	if (isCustomUnitCode(params.code)) {
		const customUnitMaterial = tryUnpackCustomUnitMaterial(params.piece);
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
