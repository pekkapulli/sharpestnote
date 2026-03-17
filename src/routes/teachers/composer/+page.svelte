<script lang="ts">
	import { browser } from '$app/environment';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import { getTransposedKeySignature } from '$lib/config/keys';
	import { instrumentConfigs } from '$lib/config/instruments';
	import type { Mode, NoteName } from '$lib/config/keys';
	import type { CustomUnitMaterial, InstrumentId, Piece } from '$lib/config/types';
	import type { MelodyItem, NoteLength } from '$lib/config/melody';
	import { lengthToMs } from '$lib/config/melody';
	import { packCustomUnitMaterialForUrl } from '$lib/util/pieceUrl';
	import { createSynth } from '$lib/synth/useSynth.svelte';

	import {
		buildScaleFromMelody,
		getPitchPalette,
		groupBarsToPhrases,
		inferPracticeTempiFromFastTempo,
		rearrangeNotesForTimeSignatureChange,
		slugifyPieceCode
	} from '$lib/util/composerUtils';
	import ComposerSettingsForm from '$lib/components/composer/ComposerSettingsForm.svelte';
	import ComposerMelodyWorkspace from '$lib/components/composer/melody-workspace/ComposerMelodyWorkspace.svelte';
	import ComposerShareCard from '$lib/components/composer/ComposerShareCard.svelte';

	const CANONICAL_SHARE_ORIGIN = 'https://sharpestnote.com';
	const COMPOSER_DRAFT_PARAM = 'draft';
	const LENGTH_OPTIONS: NoteLength[] = [1, 2, 3, 4, 6, 8, 12, 16];

	interface ComposerDraftState {
		pieceLabel: string;
		pieceKey: NoteName;
		pieceMode: Mode;
		instrumentId: InstrumentId;
		selectedTimeSignature: string;
		fastTempo: string;
		melody: MelodyItem[][];
		teacherShareNote: string;
	}

	interface Props {
		data: {
			sharePreviewData: {
				title: string;
				description: string;
				image: string;
				url: string;
			};
			initialDraftState: ComposerDraftState;
		};
	}

	let { data }: Props = $props();

	function getInitialDraftState(): ComposerDraftState {
		return data.initialDraftState;
	}

	const initialDraftState = getInitialDraftState();

	const modeOptions: Mode[] = ['major', 'natural_minor'];
	const noteOptions: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
	const timeSignatureOptions: Array<{ label: string; barLength: NoteLength }> = [
		{ label: '2/4', barLength: 8 },
		{ label: '3/4', barLength: 12 },
		{ label: '4/4', barLength: 16 }
	];

	let pieceLabel = $state(initialDraftState.pieceLabel);
	let pieceKey = $state<NoteName>(initialDraftState.pieceKey);
	let pieceMode = $state<Mode>(initialDraftState.pieceMode);
	let instrumentId = $state<InstrumentId>(initialDraftState.instrumentId);
	let selectedTimeSignature = $state(initialDraftState.selectedTimeSignature);
	const initialBarLength: NoteLength =
		timeSignatureOptions.find((option) => option.label === selectedTimeSignature)?.barLength ?? 16;
	const notationStartPercent = 0;
	const notationEndPercent = 1;

	let fastTempo = $state(initialDraftState.fastTempo);

	let melody = $state<MelodyItem[][]>(initialDraftState.melody);
	let shareStatus = $state('');
	let teacherShareNote = $state(initialDraftState.teacherShareNote);
	let isShareModalOpen = $state(false);
	let shortShareUrl = $state('');
	let shortShareSourceUrl = $state('');
	let shortShareError = $state('');
	let isCreatingShortShareUrl = $state(false);
	let isPlayingMelodyPreview = $state(false);
	let isMelodyPreviewMuted = $state(false);
	let shouldStopMelodyPreview = $state(false);
	let melodyPreviewPlayheadPosition = $state<number | null>(null);
	let melodyPreviewSessionId = $state(0);

	const instrumentConfig = $derived(
		instrumentConfigs.find((instrument) => instrument.id === instrumentId) ?? instrumentConfigs[0]
	);
	const clef = $derived(instrumentConfig.clef);
	const keySignature = $derived(
		getTransposedKeySignature(pieceKey, pieceMode, instrumentConfig.transpositionSemitones)
	);

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

			const trimmedTeacherNote = teacherShareNote.trim();

			const customUnitMaterial: CustomUnitMaterial = {
				piece: pieceBuildResult.piece,
				instrument: instrumentId,
				teacherNote: trimmedTeacherNote || undefined
			};

			return {
				longUrl: `${baseUrl}/unit/custom/${packCustomUnitMaterialForUrl(customUnitMaterial)}`,
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
		melodyPreviewSynth.setOptions({
			...(instrumentConfig.adsrConfig ?? {}),
			transpositionSemitones: instrumentConfig.transpositionSemitones
		});
	});

	$effect(() => {
		if (!browser) return;

		const customUnitMaterial = buildDraftCustomUnitMaterial();
		const packedDraft = packCustomUnitMaterialForUrl(customUnitMaterial);
		const currentUrl = new URL(window.location.href);

		if (currentUrl.searchParams.get(COMPOSER_DRAFT_PARAM) === packedDraft) {
			return;
		}

		currentUrl.searchParams.set(COMPOSER_DRAFT_PARAM, packedDraft);
		const nextUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
		window.history.replaceState(window.history.state, '', nextUrl);
	});

	async function previewMelodyItem(item: MelodyItem) {
		if (isMelodyPreviewMuted || item.note === null) return;

		try {
			await melodyPreviewSynth.playNote(item, 240);
		} catch {
			shareStatus = 'Unable to play note preview.';
		}
	}

	function handleToggleMelodyMute() {
		isMelodyPreviewMuted = !isMelodyPreviewMuted;

		if (isMelodyPreviewMuted) {
			melodyPreviewSynth.stopAll();
			shouldStopMelodyPreview = true;
			melodyPreviewSessionId += 1;
			isPlayingMelodyPreview = false;
			melodyPreviewPlayheadPosition = null;
		}
	}

	async function playMelodyPreview(startIndex = 0) {
		if (isMelodyPreviewMuted || sequence.length === 0) return;

		const safeStartIndex =
			startIndex >= 0 && startIndex < sequence.length ? Math.floor(startIndex) : 0;
		const startBarIndex = melody.findIndex((bar, barIndex) => {
			const barStart = melody
				.slice(0, barIndex)
				.reduce((sum, currentBar) => sum + currentBar.length, 0);
			return safeStartIndex >= barStart && safeStartIndex < barStart + bar.length;
		});
		const safeBarIndex = startBarIndex >= 0 ? startBarIndex : 0;
		const barStartIndex = melody
			.slice(0, safeBarIndex)
			.reduce((sum, currentBar) => sum + currentBar.length, 0);

		const playbackSequence = sequence.slice(barStartIndex);
		const startSixteenth = sequence
			.slice(0, barStartIndex)
			.reduce((sum, item) => sum + item.length, 0);

		if (playbackSequence.length === 0) return;

		const parsedFastTempo = Number(fastTempo);
		const tempoBpm = Number.isFinite(parsedFastTempo) && parsedFastTempo > 0 ? parsedFastTempo : 80;
		const sessionId = melodyPreviewSessionId + 1;

		melodyPreviewSessionId = sessionId;
		shouldStopMelodyPreview = false;
		isPlayingMelodyPreview = true;
		melodyPreviewPlayheadPosition = startSixteenth;

		try {
			let currentSixteenth = startSixteenth;
			for (const item of playbackSequence) {
				if (shouldStopMelodyPreview || melodyPreviewSessionId !== sessionId) break;

				const noteLength = item.length;
				const noteDurationMs = lengthToMs(noteLength, tempoBpm);
				const startTime = performance.now();

				const animatePlayhead = () => {
					if (melodyPreviewSessionId !== sessionId) return;

					const elapsed = performance.now() - startTime;
					const progress = noteDurationMs > 0 ? Math.min(elapsed / noteDurationMs, 1) : 1;
					melodyPreviewPlayheadPosition = currentSixteenth + progress * noteLength;

					if (progress < 1 && !shouldStopMelodyPreview && melodyPreviewSessionId === sessionId) {
						requestAnimationFrame(animatePlayhead);
					}
				};
				animatePlayhead();

				await melodyPreviewSynth.playNote(item, tempoBpm);
				if (shouldStopMelodyPreview || melodyPreviewSessionId !== sessionId) break;

				currentSixteenth += noteLength;
				melodyPreviewPlayheadPosition = currentSixteenth;
			}
		} catch {
			shareStatus = 'Unable to play melody preview.';
		} finally {
			if (melodyPreviewSessionId === sessionId) {
				isPlayingMelodyPreview = false;
				shouldStopMelodyPreview = false;

				setTimeout(() => {
					if (!isPlayingMelodyPreview && melodyPreviewSessionId === sessionId) {
						melodyPreviewPlayheadPosition = null;
					}
				}, 500);
			}
		}
	}

	async function handleToggleMelodyPreview(startIndex = -1) {
		if (isMelodyPreviewMuted) return;

		if (isPlayingMelodyPreview) {
			shouldStopMelodyPreview = true;
			melodyPreviewSessionId += 1;
			melodyPreviewSynth.stopAll();
			isPlayingMelodyPreview = false;
			melodyPreviewPlayheadPosition = null;
			return;
		}

		await playMelodyPreview(startIndex);
	}

	async function handlePlayMelodyFromStart() {
		if (isMelodyPreviewMuted || sequence.length === 0) return;

		if (isPlayingMelodyPreview) {
			shouldStopMelodyPreview = true;
			melodyPreviewSessionId += 1;
			melodyPreviewSynth.stopAll();
		}

		await playMelodyPreview(0);
	}

	function buildPracticeTempi(): Piece['practiceTempi'] | undefined {
		return inferPracticeTempiFromFastTempo(fastTempo);
	}

	function handleMelodyEdited() {
		shareStatus = '';
	}

	function buildDraftCustomUnitMaterial(): CustomUnitMaterial {
		const draftPiece: Piece = {
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

		return {
			piece: draftPiece,
			instrument: instrumentId,
			teacherNote: teacherShareNote.trim() || undefined
		};
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
	<title>Piece Composer - Teacher Tools - The Sharpest Note</title>
</svelte:head>

<SharePreview data={data.sharePreviewData} />

<div class="min-h-screen bg-off-white py-10">
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4">
		<header class="space-y-4">
			<div>
				<p class="text-sm font-semibold tracking-wide text-brand-green uppercase">Teacher tools</p>
				<h1 class="mt-2 mb-4 text-3xl font-semibold text-slate-900">
					Compose your own Sharpest Note piece
				</h1>
				<p class="mt-8 max-w-xl text-lg text-slate-700">
					Use the tool below to create a custom piece that you can share with your students. Once
					you're done, generate a share link that your students can use to practice the piece.
				</p>
				<p class="max-w-xl text-lg text-slate-700">
					This tool is great for teachers who want to use the Sharpest Note practice experience with
					their own material!
				</p>
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
			<ComposerMelodyWorkspace
				{clef}
				bind:melody
				{instrumentId}
				{keySignature}
				{barLength}
				{availablePitches}
				{isPlayingMelodyPreview}
				{isMelodyPreviewMuted}
				melodyPlayheadPosition={melodyPreviewPlayheadPosition}
				lengthOptions={LENGTH_OPTIONS}
				onToggleMelodyPlayback={handleToggleMelodyPreview}
				onPlayMelodyFromStart={handlePlayMelodyFromStart}
				onToggleMelodyMute={handleToggleMelodyMute}
				onPreviewItem={previewMelodyItem}
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
