<script lang="ts">
	import SharePreview from '$lib/components/SharePreview.svelte';
	import { getKeySignature } from '$lib/config/keys';
	import { instrumentConfigs } from '$lib/config/instruments';
	import type { Mode, NoteName } from '$lib/config/keys';
	import type { InstrumentId, Piece } from '$lib/config/types';
	import type { MelodyItem, NoteLength } from '$lib/config/melody';
	import { packPieceForUrl } from '$lib/util/pieceUrl';
	import { createSynth } from '$lib/synth/useSynth.svelte';

	import {
		buildScaleFromMelody,
		createInitialRests,
		getPitchPalette,
		groupBarsToPhrases,
		inferPracticeTempiFromFastTempo,
		rearrangeNotesForTimeSignatureChange,
		slugifyPieceCode
	} from '$lib/util/composerUtils';
	import ComposerSettingsForm from '$lib/components/composer/ComposerSettingsForm.svelte';
	import ComposerMelodyEditor from '$lib/components/composer/ComposerMelodyEditor.svelte';
	import ComposerShareCard from '$lib/components/composer/ComposerShareCard.svelte';

	const CANONICAL_SHARE_ORIGIN = 'https://sharpestnote.com';
	const LENGTH_OPTIONS: NoteLength[] = [1, 2, 3, 4, 6, 8, 12, 16];

	interface Props {
		data: {
			sharePreviewData: {
				title: string;
				description: string;
				image: string;
				url: string;
			};
		};
	}

	let { data }: Props = $props();

	const modeOptions: Mode[] = ['major', 'natural_minor'];
	const noteOptions: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
	const timeSignatureOptions: Array<{ label: string; barLength: NoteLength }> = [
		{ label: '2/4', barLength: 8 },
		{ label: '3/4', barLength: 12 },
		{ label: '4/4', barLength: 16 }
	];

	let pieceLabel = $state('Teacher Etude No. 1');
	let pieceKey = $state<NoteName>('D');
	let pieceMode = $state<Mode>('major');
	let instrumentId = $state<InstrumentId>('violin');
	let selectedTimeSignature = $state('4/4');
	const initialBarLength: NoteLength =
		timeSignatureOptions.find((option) => option.label === selectedTimeSignature)?.barLength ?? 16;
	const notationStartPercent = 0;
	const notationEndPercent = 1;

	let fastTempo = $state('90');

	let melody = $state<MelodyItem[][]>(createInitialRests(initialBarLength));
	let shareStatus = $state('');
	let teacherShareNote = $state('');
	let isShareModalOpen = $state(false);
	let shortShareUrl = $state('');
	let shortShareSourceUrl = $state('');
	let shortShareError = $state('');
	let isCreatingShortShareUrl = $state(false);
	let isPlayingMelodyPreview = $state(false);
	let shouldStopMelodyPreview = $state(false);

	const instrumentConfig = $derived(
		instrumentConfigs.find((instrument) => instrument.id === instrumentId) ?? instrumentConfigs[0]
	);
	const clef = $derived(instrumentConfig.clef);
	const keySignature = $derived(getKeySignature(pieceKey, pieceMode));

	const availablePitches = $derived(
		getPitchPalette(
			instrumentConfig.bottomNote,
			instrumentConfig.topNote,
			keySignature.preferredAccidental
		)
	);
	const pieceCode = $derived(slugifyPieceCode(pieceLabel));
	const barLength = $derived(
		timeSignatureOptions.find((option) => option.label === selectedTimeSignature)?.barLength ?? 16
	);
	let previousBarLength = $state<NoteLength>(initialBarLength);
	const sequence = $derived(melody.flat());
	const currentBarFill = $derived.by(() => {
		if (melody.length === 0) return 0;
		const lastBar = melody[melody.length - 1] ?? [];
		return lastBar.reduce((sum, item) => sum + item.length, 0) % barLength;
	});

	const pieceBuildResult = $derived.by(() => buildPiece());
	const customPieceShare = $derived.by(() => {
		if (!pieceBuildResult.piece) {
			return {
				longUrl: '',
				error: pieceBuildResult.errors[0] ?? 'Piece is not valid yet.'
			};
		}

		try {
			const baseUrl = getShareBaseUrl();
			if (!baseUrl) {
				return {
					longUrl: '',
					error: 'Unable to determine the site URL for sharing.'
				};
			}

			return {
				longUrl: `${baseUrl}/unit/custom/${packPieceForUrl(pieceBuildResult.piece)}`,
				error: ''
			};
		} catch {
			return {
				longUrl: '',
				error: 'Unable to build custom piece URL.'
			};
		}
	});
	const shareError = $derived.by(() => shortShareError || customPieceShare.error);
	const inferredTempiPreview = $derived.by(() => inferPracticeTempiFromFastTempo(fastTempo));

	const melodyPreviewSynth = createSynth({
		waveform: 'sine',
		volume: 0.25,
		attack: 0.02,
		decay: 0.1,
		sustain: 0.7,
		release: 0.1,
		reverbMix: 0.1,
		reverbDecay: 2
	});

	$effect(() => {
		if (previousBarLength === barLength) return;
		melody = rearrangeNotesForTimeSignatureChange(melody, previousBarLength, barLength);
		previousBarLength = barLength;
		shareStatus = '';
	});

	$effect(() => {
		const nextSourceUrl = customPieceShare.longUrl;
		if (!shortShareSourceUrl || shortShareSourceUrl === nextSourceUrl) return;

		shortShareUrl = '';
		shortShareSourceUrl = '';
		shortShareError = '';
		if (isShareModalOpen && nextSourceUrl) {
			void ensureShortShareUrl();
		}
	});

	$effect(() => {
		if (instrumentConfig.adsrConfig) {
			melodyPreviewSynth.setOptions(instrumentConfig.adsrConfig);
		}
	});

	async function handleToggleMelodyPreview() {
		if (isPlayingMelodyPreview) {
			shouldStopMelodyPreview = true;
			melodyPreviewSynth.stopAll();
			isPlayingMelodyPreview = false;
			return;
		}

		if (sequence.length === 0) return;

		const parsedFastTempo = Number(fastTempo);
		const tempoBpm = Number.isFinite(parsedFastTempo) && parsedFastTempo > 0 ? parsedFastTempo : 80;

		shouldStopMelodyPreview = false;
		isPlayingMelodyPreview = true;

		try {
			for (const item of sequence) {
				if (shouldStopMelodyPreview) break;
				await melodyPreviewSynth.playNote(item, tempoBpm);
				if (shouldStopMelodyPreview) break;
			}
		} catch {
			shareStatus = 'Unable to play melody preview.';
		} finally {
			isPlayingMelodyPreview = false;
			shouldStopMelodyPreview = false;
		}
	}

	function buildPracticeTempi(): Piece['practiceTempi'] | undefined {
		return inferPracticeTempiFromFastTempo(fastTempo);
	}

	function handleMelodyEdited() {
		shareStatus = '';
	}

	function buildPiece(): { piece: Piece | null; errors: string[] } {
		const errors: string[] = [];

		if (!pieceCode.trim()) errors.push('Piece code is required.');
		if (!pieceLabel.trim()) errors.push('Piece label is required.');
		if (sequence.length === 0) errors.push('Add at least one note or rest to the melody.');
		if (currentBarFill !== 0) errors.push('Melody has an incomplete final bar.');

		if (errors.length > 0) {
			return { piece: null, errors };
		}

		const piece: Piece = {
			code: pieceCode.trim(),
			label: pieceLabel.trim(),
			composer: '',
			arranger: '',
			practiceTempi: buildPracticeTempi(),
			key: pieceKey,
			mode: pieceMode,
			barLength,
			melody: groupBarsToPhrases(melody, 2),
			scale: buildScaleFromMelody(sequence),
			notationStartPercent,
			notationEndPercent
		};

		return { piece, errors: [] };
	}

	function getShareBaseUrl(): string {
		return CANONICAL_SHARE_ORIGIN;
	}

	async function copyCustomPieceUrl() {
		if (!shortShareUrl) {
			shareStatus = shareError || pieceBuildResult.errors[0] || 'Share link is not ready yet.';
			return;
		}

		try {
			await navigator.clipboard.writeText(shortShareUrl);
			shareStatus = 'Short share link copied to clipboard.';
		} catch {
			shareStatus = 'Unable to copy short share link.';
		}
	}

	async function ensureShortShareUrl() {
		const targetUrl = customPieceShare.longUrl;
		if (!targetUrl) {
			shortShareError = customPieceShare.error || 'Piece is not valid yet.';
			return;
		}

		if (shortShareUrl && shortShareSourceUrl === targetUrl) {
			return;
		}

		if (isCreatingShortShareUrl) {
			return;
		}

		isCreatingShortShareUrl = true;
		shortShareError = '';

		try {
			const res = await fetch('/api/share/custom', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ targetUrl })
			});

			if (!res.ok) {
				const payload = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(payload.error || 'Unable to create short share link.');
			}

			const payload = (await res.json()) as { shortUrl?: string };
			if (!payload.shortUrl) {
				throw new Error('Short-link service returned an invalid response.');
			}

			shortShareUrl = payload.shortUrl;
			shortShareSourceUrl = targetUrl;
		} catch (error) {
			shortShareUrl = '';
			shortShareSourceUrl = '';
			shortShareError =
				error instanceof Error ? error.message : 'Unable to create short share link.';
		} finally {
			isCreatingShortShareUrl = false;
		}
	}

	async function openShareModal() {
		isShareModalOpen = true;
		shareStatus = '';
		await ensureShortShareUrl();
	}

	function closeShareModal() {
		isShareModalOpen = false;
	}
</script>

<svelte:head>
	<title>Etude Composer - Teacher Tools - The Sharpest Note</title>
</svelte:head>

<SharePreview data={data.sharePreviewData} />

<div class="min-h-screen bg-off-white py-10">
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4">
		<header class="space-y-4">
			<div>
				<p class="text-sm font-semibold tracking-wide text-brand-green uppercase">Teacher tools</p>
				<h1 class="mt-2 text-3xl font-semibold text-slate-900">
					Compose your own Sharpest Note piece
				</h1>
			</div>
		</header>

		<section>
			<ComposerSettingsForm
				bind:pieceLabel
				bind:instrumentId
				bind:pieceKey
				bind:pieceMode
				bind:selectedTimeSignature
				bind:fastTempo
				{noteOptions}
				{modeOptions}
				{timeSignatureOptions}
				{inferredTempiPreview}
			/>
		</section>

		<section class="space-y-6">
			<ComposerMelodyEditor
				{clef}
				bind:melody
				{instrumentId}
				{keySignature}
				{barLength}
				{availablePitches}
				{isPlayingMelodyPreview}
				lengthOptions={LENGTH_OPTIONS}
				onToggleMelodyPlayback={handleToggleMelodyPreview}
				onEdit={handleMelodyEdited}
			/>

			<ComposerShareCard
				bind:teacherShareNote
				{pieceLabel}
				bars={melody}
				{clef}
				{keySignature}
				{barLength}
				{isShareModalOpen}
				onOpenShareModal={openShareModal}
				onCloseShareModal={closeShareModal}
				isPreparingShareUrl={isCreatingShortShareUrl}
				shareUrl={shortShareUrl}
				{shareError}
				errors={pieceBuildResult.errors}
				{shareStatus}
				onCopyUrl={copyCustomPieceUrl}
			/>
		</section>
	</div>
</div>
