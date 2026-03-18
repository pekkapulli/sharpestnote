import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { instrumentConfigs } from '$lib/config/instruments';
import type { Mode, NoteName } from '$lib/config/keys';
import type { InstrumentId } from '$lib/config/types';
import type { CustomUnitMaterial } from '$lib/config/types';
import type { MelodyItem, NoteLength } from '$lib/config/melody';
import { createInitialRests, normalizeMelodyToBars } from '$lib/util/composerUtils';
import { packCustomUnitMaterialForUrl, unpackCustomUnitMaterialFromUrl } from '$lib/util/pieceUrl';

const COMPOSER_DRAFT_PARAM = 'draft';
const COMPOSER_PIECE_ID_PARAM = 'pieceId';
const RECOMMENDATION_BONUS_CREDITS = 3;

const modeOptions: Mode[] = ['major', 'natural_minor'];
const noteOptions: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const timeSignatureOptions: Array<{ label: string; barLength: NoteLength }> = [
	{ label: '2/4', barLength: 8 },
	{ label: '3/4', barLength: 12 },
	{ label: '4/4', barLength: 16 }
];

type ComposerDraftState = {
	pieceLabel: string;
	pieceKey: NoteName;
	pieceMode: Mode;
	instrumentId: InstrumentId;
	selectedTimeSignature: string;
	fastTempo: string;
	melody: MelodyItem[][];
	teacherShareNote: string;
};

type TeacherPieceSeedRow = {
	id: string;
	custom_unit_material: unknown;
	is_published: boolean;
};

type ShortLinkSeedRow = {
	id: string;
};

function createDefaultDraftState(): ComposerDraftState {
	const defaultBarLength: NoteLength =
		timeSignatureOptions.find((option) => option.label === '4/4')?.barLength ?? 16;

	return {
		pieceLabel: 'Opus No. 1',
		pieceKey: 'D',
		pieceMode: 'major',
		instrumentId: 'violin',
		selectedTimeSignature: '4/4',
		fastTempo: '90',
		melody: createInitialRests(defaultBarLength),
		teacherShareNote: ''
	};
}

function sanitizeBarLength(value: number): NoteLength {
	const matched = timeSignatureOptions.find((option) => option.barLength === value)?.barLength;
	return matched ?? 16;
}

function getTimeSignatureLabel(barLengthValue: NoteLength): string {
	return timeSignatureOptions.find((option) => option.barLength === barLengthValue)?.label ?? '4/4';
}

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseDraftStateFromCustomUnitMaterial(value: CustomUnitMaterial): ComposerDraftState {
	const defaults = createDefaultDraftState();
	const restoredPiece = value.piece;
	const safeBarLength = sanitizeBarLength(restoredPiece.barLength);
	const restoredMelody = normalizeMelodyToBars(restoredPiece.melody.flat(), safeBarLength);
	const hasInstrument = instrumentConfigs.some((instrument) => instrument.id === value.instrument);
	const safeFastTempo = restoredPiece.practiceTempi?.fast;

	return {
		pieceLabel: restoredPiece.label || defaults.pieceLabel,
		pieceKey: noteOptions.includes(restoredPiece.key) ? restoredPiece.key : defaults.pieceKey,
		pieceMode: modeOptions.includes(restoredPiece.mode) ? restoredPiece.mode : defaults.pieceMode,
		instrumentId: hasInstrument ? value.instrument : defaults.instrumentId,
		selectedTimeSignature: getTimeSignatureLabel(safeBarLength),
		fastTempo:
			typeof safeFastTempo === 'number' && Number.isFinite(safeFastTempo) && safeFastTempo > 0
				? String(Math.round(safeFastTempo))
				: defaults.fastTempo,
		melody: restoredMelody.length > 0 ? restoredMelody : createInitialRests(safeBarLength),
		teacherShareNote: value.teacherNote ?? ''
	};
}

function parseDraftStateFromUrl(url: URL): ComposerDraftState {
	const defaults = createDefaultDraftState();
	const packedDraft = url.searchParams.get(COMPOSER_DRAFT_PARAM);
	if (!packedDraft) return defaults;

	try {
		const restored = unpackCustomUnitMaterialFromUrl(packedDraft);
		return parseDraftStateFromCustomUnitMaterial(restored);
	} catch {
		return defaults;
	}
}

function parseDraftStateFromStoredMaterial(value: unknown): ComposerDraftState | null {
	try {
		return parseDraftStateFromCustomUnitMaterial(value as CustomUnitMaterial);
	} catch {
		return null;
	}
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		const redirectTarget = `${url.pathname}${url.search}`;
		throw redirect(303, `/teachers/login?next=${encodeURIComponent(redirectTarget)}`);
	}

	const hasUnlimitedComposerCredits =
		user?.role === 'institution_teacher' || user?.role === 'admin' || user?.role === 'owner';

	const { data: referralData } = await locals.supabase
		.from('teacher_profiles')
		.select('referred_by_studio, referral_rewarded_at')
		.eq('id', user.id)
		.maybeSingle();

	const hasPendingRecommendationCredits =
		typeof referralData?.referred_by_studio === 'string' &&
		referralData.referred_by_studio.trim().length > 0 &&
		!referralData.referral_rewarded_at;
	const hasReceivedRecommendationCredits =
		typeof referralData?.referred_by_studio === 'string' &&
		referralData.referred_by_studio.trim().length > 0 &&
		Boolean(referralData.referral_rewarded_at);

	const pieceIdParam = (url.searchParams.get(COMPOSER_PIECE_ID_PARAM) ?? '').trim();
	const requestedPieceId = isUuid(pieceIdParam) ? pieceIdParam : '';

	let initialPieceId = '';
	let initialPieceIsPublished = false;
	let initialPieceShortUrl = '';
	let initialSavedSourceFingerprint = '';
	let initialDraftState = parseDraftStateFromUrl(url);

	if (requestedPieceId) {
		const { data: pieceRow, error: pieceError } = await locals.supabase
			.from('teacher_pieces')
			.select('id, custom_unit_material, is_published')
			.eq('id', requestedPieceId)
			.eq('teacher_id', user.id)
			.maybeSingle();

		if (!pieceError && pieceRow) {
			const row = pieceRow as TeacherPieceSeedRow;
			initialPieceId = row.id.trim();
			initialPieceIsPublished = row.is_published;

			const packedDraft = url.searchParams.get(COMPOSER_DRAFT_PARAM);
			if (!packedDraft) {
				const parsedStoredDraft = parseDraftStateFromStoredMaterial(row.custom_unit_material);
				if (parsedStoredDraft) {
					initialDraftState = parsedStoredDraft;
				}
			}

			try {
				initialSavedSourceFingerprint = packCustomUnitMaterialForUrl(
					row.custom_unit_material as CustomUnitMaterial
				);
			} catch {
				initialSavedSourceFingerprint = '';
			}

			const { data: shortLinkRows, error: shortLinkError } = await locals.supabase
				.from('short_links')
				.select('id')
				.eq('teacher_piece_id', row.id)
				.eq('created_by', user.id)
				.limit(1);

			if (!shortLinkError) {
				const shortLink = (shortLinkRows?.[0] ?? null) as ShortLinkSeedRow | null;
				if (shortLink?.id) {
					initialPieceShortUrl = `${url.origin}/s/${shortLink.id}`;
				}
			}
		}
	}

	return {
		sharePreviewData: {
			title: 'Composer - Teacher Tools - The Sharpest Note',
			description: 'Compose a piece and share it with your student as a Sharpest Note piece!',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		},
		initialDraftState,
		initialPieceId,
		initialPieceIsPublished,
		initialPieceShortUrl,
		initialSavedSourceFingerprint,
		teacherEmail: user?.email ?? '',
		hasUnlimitedComposerCredits,
		composerCredits: hasUnlimitedComposerCredits ? null : (user?.credits ?? 0),
		hasPendingRecommendationCredits,
		hasReceivedRecommendationCredits,
		recommendationBonusCredits: RECOMMENDATION_BONUS_CREDITS
	};
};

export const actions: Actions = {
	signout: async ({ locals }) => {
		await locals.supabase.auth.signOut();
		throw redirect(303, '/teachers/login');
	}
};
