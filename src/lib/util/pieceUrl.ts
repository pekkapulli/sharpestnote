import type { CustomUnitMaterial, Piece } from '$lib/config/types';

const PIECE_URL_VERSION = 1;

type PieceUrlPayload = {
	v: number;
	piece: Piece;
};

type CustomUnitMaterialUrlPayload = {
	v: number;
	customUnitMaterial: CustomUnitMaterial;
};

export function packPieceForUrl(piece: Piece): string {
	const payload: PieceUrlPayload = {
		v: PIECE_URL_VERSION,
		piece
	};

	const json = JSON.stringify(payload);
	const bytes = encodeUtf8(json);
	return toBase64Url(bytes);
}

export function packCustomUnitMaterialForUrl(customUnitMaterial: CustomUnitMaterial): string {
	const payload: CustomUnitMaterialUrlPayload = {
		v: PIECE_URL_VERSION,
		customUnitMaterial
	};

	const json = JSON.stringify(payload);
	const bytes = encodeUtf8(json);
	return toBase64Url(bytes);
}

export function unpackPieceFromUrl(value: string): Piece {
	const normalized = value.trim();
	if (!normalized) {
		throw new Error('Packed piece value is empty.');
	}

	const bytes = fromBase64Url(normalized);
	const json = decodeUtf8(bytes);
	const parsed = JSON.parse(json) as unknown;

	if (!isPieceUrlPayload(parsed)) {
		throw new Error('Invalid packed piece payload.');
	}

	if (parsed.v !== PIECE_URL_VERSION) {
		throw new Error(`Unsupported packed piece version: ${parsed.v}`);
	}

	return parsed.piece;
}

export function unpackCustomUnitMaterialFromUrl(value: string): CustomUnitMaterial {
	const normalized = value.trim();
	if (!normalized) {
		throw new Error('Packed custom unit value is empty.');
	}

	const bytes = fromBase64Url(normalized);
	const json = decodeUtf8(bytes);
	const parsed = JSON.parse(json) as unknown;

	if (!parsed || typeof parsed !== 'object') {
		throw new Error('Invalid packed custom unit payload.');
	}

	const maybe = parsed as Partial<CustomUnitMaterialUrlPayload & PieceUrlPayload>;
	if (typeof maybe.v !== 'number') {
		throw new Error('Invalid packed custom unit payload.');
	}

	if (maybe.v !== PIECE_URL_VERSION) {
		throw new Error(`Unsupported packed piece version: ${maybe.v}`);
	}

	if (isCustomUnitMaterialUrlPayload(parsed)) {
		return parsed.customUnitMaterial;
	}

	throw new Error('Invalid packed custom unit payload.');
}

function isPieceUrlPayload(value: unknown): value is PieceUrlPayload {
	if (!value || typeof value !== 'object') return false;

	const maybe = value as Partial<PieceUrlPayload>;
	if (typeof maybe.v !== 'number') return false;

	if (!maybe.piece || typeof maybe.piece !== 'object') return false;

	const piece = maybe.piece as Partial<Piece>;
	return (
		typeof piece.code === 'string' &&
		typeof piece.label === 'string' &&
		typeof piece.composer === 'string' &&
		typeof piece.arranger === 'string' &&
		typeof piece.mode === 'string' &&
		typeof piece.key === 'string' &&
		typeof piece.barLength === 'number' &&
		Array.isArray(piece.melody) &&
		Array.isArray(piece.scale) &&
		typeof piece.notationStartPercent === 'number' &&
		typeof piece.notationEndPercent === 'number'
	);
}

function isCustomUnitMaterialUrlPayload(value: unknown): value is CustomUnitMaterialUrlPayload {
	if (!value || typeof value !== 'object') return false;

	const maybe = value as Partial<CustomUnitMaterialUrlPayload>;
	if (typeof maybe.v !== 'number') return false;
	if (!maybe.customUnitMaterial || typeof maybe.customUnitMaterial !== 'object') return false;

	const material = maybe.customUnitMaterial as Partial<CustomUnitMaterial>;
	if (typeof material.instrument !== 'string') return false;
	if (material.teacherNote !== undefined && typeof material.teacherNote !== 'string') return false;
	if (!material.piece || typeof material.piece !== 'object') return false;

	const piecePayloadCandidate: PieceUrlPayload = {
		v: maybe.v,
		piece: material.piece as Piece
	};

	return isPieceUrlPayload(piecePayloadCandidate);
}

function encodeUtf8(input: string): Uint8Array {
	return new TextEncoder().encode(input);
}

function decodeUtf8(bytes: Uint8Array): string {
	return new TextDecoder().decode(bytes);
}

function toBase64Url(bytes: Uint8Array): string {
	const base64 = bytesToBase64(bytes);
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
	const base64 = normalizeBase64(value);
	return base64ToBytes(base64);
}

function normalizeBase64(value: string): string {
	const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
	const padding = base64.length % 4;
	if (padding === 0) return base64;
	return `${base64}${'='.repeat(4 - padding)}`;
}

function bytesToBase64(bytes: Uint8Array): string {
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(bytes).toString('base64');
	}

	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	if (typeof btoa === 'undefined') {
		throw new Error('No base64 encoder available in this environment.');
	}

	return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
	if (typeof Buffer !== 'undefined') {
		return Uint8Array.from(Buffer.from(base64, 'base64'));
	}

	if (typeof atob === 'undefined') {
		throw new Error('No base64 decoder available in this environment.');
	}

	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);

	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}

	return bytes;
}
