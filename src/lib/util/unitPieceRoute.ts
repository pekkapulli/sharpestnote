import { error } from '@sveltejs/kit';
import { getUnitByCode, normalizeUnitCode } from '$lib/config/units';
import type { Piece, UnitMaterial } from '$lib/config/types';
import { getImageUrl } from '$lib/util/getImageUrl';
import { unpackPieceFromUrl } from '$lib/util/pieceUrl';

export const CUSTOM_UNIT_CODE = 'custom';
const CUSTOM_IMAGE_URL = '/og-logo.png';

export type UnitPieceRouteData = {
	unit: UnitMaterial;
	piece: Piece;
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
		const piece = tryUnpackPiece(params.piece);
		const unit = createCustomUnitMaterial(piece);

		return {
			unit,
			piece,
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

function createCustomUnitMaterial(piece: Piece): UnitMaterial {
	return {
		...createCustomUnitStub(),
		instrument: inferInstrumentFromPiece(piece),
		title: `Custom Piece: ${piece.label}`,
		description: `${piece.label} by ${piece.composer || 'Unknown composer'}`,
		pieces: [piece]
	};
}

function inferInstrumentFromPiece(piece: Piece): UnitMaterial['instrument'] {
	const notePool = [...piece.scale, ...piece.melody.flat()]
		.map((item) => item.note)
		.filter((note): note is string => Boolean(note));

	if (notePool.length === 0) return 'violin';

	let minOctave = Infinity;
	let maxOctave = -Infinity;

	for (const note of notePool) {
		const match = /\/(\d+)$/.exec(note);
		if (!match) continue;
		const octave = Number(match[1]);
		if (!Number.isFinite(octave)) continue;
		minOctave = Math.min(minOctave, octave);
		maxOctave = Math.max(maxOctave, octave);
	}

	if (!Number.isFinite(minOctave) || !Number.isFinite(maxOctave)) return 'violin';
	if (maxOctave <= 4 && minOctave <= 3) return 'cello';
	if (minOctave >= 4 && maxOctave >= 6) return 'flute';
	if (minOctave <= 3 && maxOctave <= 6) return 'viola';
	return 'violin';
}

function tryUnpackPiece(packedPiece: string): Piece {
	try {
		return unpackPieceFromUrl(packedPiece);
	} catch {
		throw error(400, 'Invalid packed piece payload');
	}
}
