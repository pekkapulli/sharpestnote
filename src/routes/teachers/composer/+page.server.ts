import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { instrumentConfigs } from '$lib/config/instruments';
import type { Mode, NoteName } from '$lib/config/keys';
import type { InstrumentId } from '$lib/config/types';
import type { MelodyItem, NoteLength } from '$lib/config/melody';
import { createInitialRests, normalizeMelodyToBars } from '$lib/util/composerUtils';
import { unpackCustomUnitMaterialFromUrl } from '$lib/util/pieceUrl';

const COMPOSER_DRAFT_PARAM = 'draft';

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

function parseDraftStateFromUrl(url: URL): ComposerDraftState {
	const defaults = createDefaultDraftState();
	const packedDraft = url.searchParams.get(COMPOSER_DRAFT_PARAM);
	if (!packedDraft) return defaults;

	try {
		const restored = unpackCustomUnitMaterialFromUrl(packedDraft);
		const restoredPiece = restored.piece;
		const safeBarLength = sanitizeBarLength(restoredPiece.barLength);
		const restoredMelody = normalizeMelodyToBars(restoredPiece.melody.flat(), safeBarLength);
		const hasInstrument = instrumentConfigs.some(
			(instrument) => instrument.id === restored.instrument
		);
		const safeFastTempo = restoredPiece.practiceTempi?.fast;

		return {
			pieceLabel: restoredPiece.label || defaults.pieceLabel,
			pieceKey: noteOptions.includes(restoredPiece.key) ? restoredPiece.key : defaults.pieceKey,
			pieceMode: modeOptions.includes(restoredPiece.mode) ? restoredPiece.mode : defaults.pieceMode,
			instrumentId: hasInstrument ? restored.instrument : defaults.instrumentId,
			selectedTimeSignature: getTimeSignatureLabel(safeBarLength),
			fastTempo:
				typeof safeFastTempo === 'number' && Number.isFinite(safeFastTempo) && safeFastTempo > 0
					? String(Math.round(safeFastTempo))
					: defaults.fastTempo,
			melody: restoredMelody.length > 0 ? restoredMelody : createInitialRests(safeBarLength),
			teacherShareNote: restored.teacherNote ?? ''
		};
	} catch {
		return defaults;
	}
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) {
		const redirectTarget = `${url.pathname}${url.search}`;
		throw redirect(303, `/teachers/login?next=${encodeURIComponent(redirectTarget)}`);
	}

	return {
		sharePreviewData: {
			title: 'Composer - Teacher Tools - The Sharpest Note',
			description: 'Compose a piece and share it with your student as a Sharpest Note piece!',
			image: `${url.origin}/og-logo.png`,
			url: url.href
		},
		initialDraftState: parseDraftStateFromUrl(url),
		teacherEmail: user?.email ?? ''
	};
};

export const actions: Actions = {
	signout: async ({ locals }) => {
		await locals.supabase.auth.signOut();
		throw redirect(303, '/teachers/login');
	}
};
