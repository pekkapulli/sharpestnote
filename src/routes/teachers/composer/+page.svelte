<script lang="ts">
	import SharePreview from '$lib/components/SharePreview.svelte';
	import { getKeySignature } from '$lib/config/keys';
	import { instrumentConfigs } from '$lib/config/instruments';
	import type { Mode, NoteName } from '$lib/config/keys';
	import type { InstrumentId, Piece } from '$lib/config/types';
	import type { MelodyItem, NoteLength } from '$lib/config/melody';
	import { getOptimalFingering } from '$lib/config/fingerMarkings';
	import { transposeNoteName } from '$lib/util/noteNames';
	import { packPieceForUrl } from '$lib/util/pieceUrl';
	import { createSynth } from '$lib/synth/useSynth.svelte';

	import {
		buildScaleFromMelody,
		createInitialRests,
		getPitchPalette,
		inferPracticeTempiFromFastTempo,
		resolveBarAfterNoteChange,
		rearrangeNotesForTimeSignatureChange,
		slugifyPieceCode
	} from '$lib/util/composerUtils';
	import ComposerSettingsForm from '$lib/components/composer/ComposerSettingsForm.svelte';
	import ComposerMelodyEditor from '$lib/components/composer/ComposerMelodyEditor.svelte';
	import ComposerShareCard from '$lib/components/composer/ComposerShareCard.svelte';

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
	let selectedLength = $state<NoteLength>(4);
	let selectedFinger = $state('');
	let selectedNoteIndex = $state(-1);
	let noteContextMenu = $state<{ index: number; x: number; y: number } | null>(null);
	let editorError = $state('');
	let shareStatus = $state('');
	let teacherShareNote = $state('');
	let isPlayingMelodyPreview = $state(false);
	let shouldStopMelodyPreview = $state(false);

	const instrumentConfig = $derived(
		instrumentConfigs.find((instrument) => instrument.id === instrumentId) ?? instrumentConfigs[0]
	);
	const clef = $derived(instrumentConfig.clef);
	const keySignature = $derived(getKeySignature(pieceKey, pieceMode));

	const availablePitches = $derived(
		getPitchPalette(instrumentConfig.bottomNote, instrumentConfig.topNote)
	);
	const pieceCode = $derived(slugifyPieceCode(pieceLabel));
	const barLength = $derived(
		timeSignatureOptions.find((option) => option.label === selectedTimeSignature)?.barLength ?? 16
	);
	let previousBarLength = $state<NoteLength>(initialBarLength);
	const sequence = $derived(melody.flat());
	const melodyBars = $derived(melody);
	const currentBarFill = $derived.by(() => {
		if (melody.length === 0) return 0;
		const lastBar = melody[melody.length - 1] ?? [];
		return lastBar.reduce((sum, item) => sum + item.length, 0) % barLength;
	});

	const pieceBuildResult = $derived.by(() => buildPiece());
	const customPieceShare = $derived.by(() => {
		if (!pieceBuildResult.piece) {
			return {
				url: '',
				error: pieceBuildResult.errors[0] ?? 'Piece is not valid yet.'
			};
		}

		try {
			const baseUrl = getShareBaseUrl();
			if (!baseUrl) {
				return {
					url: '',
					error: 'Unable to determine the site URL for sharing.'
				};
			}

			return {
				url: `${baseUrl}/unit/custom/${packPieceForUrl(pieceBuildResult.piece)}`,
				error: ''
			};
		} catch {
			return {
				url: '',
				error: 'Unable to build custom piece URL.'
			};
		}
	});
	const inferredTempiPreview = $derived.by(() => inferPracticeTempiFromFastTempo(fastTempo));
	const selectedSequenceItem = $derived(
		selectedNoteIndex >= 0 ? (sequence[selectedNoteIndex] ?? null) : null
	);
	const selectedItemDefaultFinger = $derived.by(() =>
		selectedSequenceItem?.note
			? getOptimalFingering(instrumentId, selectedSequenceItem.note)?.finger
			: undefined
	);

	const melodyPreviewSynth = createSynth({
		waveform: 'sawtooth',
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
		editorError = '';
		shareStatus = '';
	});

	$effect(() => {
		if (selectedNoteIndex >= sequence.length) {
			selectedNoteIndex = sequence.length - 1;
		}
		if (noteContextMenu && selectedNoteIndex !== noteContextMenu.index) {
			noteContextMenu = null;
		}
	});

	$effect(() => {
		if (instrumentConfig.adsrConfig) {
			melodyPreviewSynth.setOptions(instrumentConfig.adsrConfig);
		}
	});

	function closeNoteContextMenu() {
		noteContextMenu = null;
	}

	function toBarAndItemIndex(flatIndex: number): { barIndex: number; itemIndex: number } | null {
		if (flatIndex < 0) return null;
		let cursor = 0;
		for (let barIndex = 0; barIndex < melody.length; barIndex++) {
			const bar = melody[barIndex] ?? [];
			if (flatIndex < cursor + bar.length) {
				return { barIndex, itemIndex: flatIndex - cursor };
			}
			cursor += bar.length;
		}
		return null;
	}

	function getKeySignatureAccidentalForLetter(letter: string): '' | '#' | 'b' {
		const normalizedLetter = letter.toLowerCase();
		const sharpLetters = new Set(
			keySignature.sharps
				.map((note) => note.replace('♭', 'b').replace('♯', '#').toLowerCase())
				.filter((note) => note.endsWith('#'))
				.map((note) => note[0])
		);
		if (sharpLetters.has(normalizedLetter)) return '#';

		const flatLetters = new Set(
			keySignature.flats
				.map((note) => note.replace('♭', 'b').replace('♯', '#').toLowerCase())
				.filter((note) => note.endsWith('b'))
				.map((note) => note[0])
		);
		if (flatLetters.has(normalizedLetter)) return 'b';

		return '';
	}

	function applyKeySignatureToNaturalNote(note: string): string {
		const match = /^([a-gA-G])([#b]?)\/(\d+)$/.exec(note);
		if (!match) return note;

		const [, letter, accidental, octave] = match;
		if (accidental) return note;

		const signatureAccidental = getKeySignatureAccidentalForLetter(letter);
		if (!signatureAccidental) return note;

		return `${letter.toLowerCase()}${signatureAccidental}/${octave}`;
	}

	function resolveFingerAfterPitchChange(item: MelodyItem, nextNote: string): number | undefined {
		return getOptimalFingering(instrumentId, nextNote)?.finger;
	}

	function appendNote(note: string | null): boolean {
		const safeBarLength = Math.max(1, Number(barLength) || 16);
		if (selectedLength > safeBarLength) {
			editorError = 'Selected note length is longer than the bar length.';
			return false;
		}

		const fingerNumber = selectedFinger.trim() === '' ? undefined : Number(selectedFinger);
		if (
			fingerNumber !== undefined &&
			(!Number.isFinite(fingerNumber) || fingerNumber < 0 || fingerNumber > 4)
		) {
			editorError = 'Finger must be a number between 0 and 4.';
			return false;
		}

		const resolvedFinger =
			fingerNumber !== undefined
				? fingerNumber
				: note !== null
					? getOptimalFingering(instrumentId, note)?.finger
					: undefined;

		const updatedBars = melody.map((bar) => [...bar]);
		if (updatedBars.length === 0) updatedBars.push([]);

		let targetBar = updatedBars[updatedBars.length - 1];
		const fill = targetBar.reduce((sum, item) => sum + item.length, 0);
		if (fill + selectedLength > safeBarLength) {
			targetBar = [];
			updatedBars.push(targetBar);
		}

		targetBar.push({
			note,
			length: selectedLength,
			finger: resolvedFinger
		});

		melody = updatedBars;

		return true;
	}

	function handleMoveNoteFromStaff(index: number, note: string) {
		editorError = '';
		shareStatus = '';
		closeNoteContextMenu();
		selectedNoteIndex = index;
		const normalizedNote = applyKeySignatureToNaturalNote(note);
		const mapped = toBarAndItemIndex(index);
		if (!mapped) return;
		melody = melody.map((bar, barIndex) => {
			if (barIndex !== mapped.barIndex) return bar;
			return bar.map((item, itemIndex) => {
				if (itemIndex !== mapped.itemIndex) return item;
				return {
					...item,
					note: normalizedNote,
					finger: resolveFingerAfterPitchChange(item, normalizedNote)
				};
			});
		});
	}

	function handleAddNoteFromStaff(note: string) {
		editorError = '';
		shareStatus = '';
		closeNoteContextMenu();
		const previousLength = sequence.length;
		const didAppend = appendNote(applyKeySignatureToNaturalNote(note));
		if (didAppend) {
			selectedNoteIndex = previousLength;
		}
	}

	function handleSelectNoteFromStaff(index: number) {
		closeNoteContextMenu();
		selectedNoteIndex = index;
	}

	function handleOpenNoteContextMenu(payload: { index: number; x: number; y: number }) {
		editorError = '';
		shareStatus = '';
		selectedNoteIndex = payload.index;
		noteContextMenu = payload;
	}

	function updateSelectedNoteInBar(
		action: { type: 'set-length'; length: NoteLength } | { type: 'remove' }
	) {
		if (selectedNoteIndex < 0) return;

		const mapped = toBarAndItemIndex(selectedNoteIndex);
		if (!mapped) return;

		const updatedBars = melody.map((bar, barIndex) => {
			if (barIndex !== mapped.barIndex) return bar;
			return resolveBarAfterNoteChange(bar, mapped.itemIndex, barLength, action);
		});

		const nextSequence = updatedBars.flat();
		selectedNoteIndex =
			nextSequence.length > 0 ? Math.min(selectedNoteIndex, nextSequence.length - 1) : -1;
		melody = updatedBars;
		editorError = '';
		shareStatus = '';
	}

	function handleChangeLengthFromMenu(length: NoteLength) {
		updateSelectedNoteInBar({ type: 'set-length', length });
		closeNoteContextMenu();
	}

	function handleSetItemKindFromMenu(kind: 'note' | 'rest') {
		if (selectedNoteIndex < 0) return;

		const mapped = toBarAndItemIndex(selectedNoteIndex);
		if (!mapped) return;

		const currentItem = melody[mapped.barIndex]?.[mapped.itemIndex];
		if (!currentItem) return;

		const fallbackNote = availablePitches[0] ?? 'd/4';
		const nextNote = kind === 'rest' ? null : (currentItem.note ?? fallbackNote);
		const defaultFinger =
			nextNote !== null ? getOptimalFingering(instrumentId, nextNote)?.finger : undefined;

		melody = melody.map((bar, barIndex) => {
			if (barIndex !== mapped.barIndex) return bar;
			return bar.map((item, itemIndex) =>
				itemIndex === mapped.itemIndex
					? {
							...item,
							note: nextNote,
							finger: kind === 'rest' ? undefined : (item.finger ?? defaultFinger)
						}
					: item
			);
		});

		editorError = '';
		shareStatus = '';
	}

	function handleSetFingerFromMenu(finger: number | undefined) {
		if (selectedNoteIndex < 0) return;

		const mapped = toBarAndItemIndex(selectedNoteIndex);
		if (!mapped) return;

		melody = melody.map((bar, barIndex) => {
			if (barIndex !== mapped.barIndex) return bar;
			return bar.map((item, itemIndex) =>
				itemIndex === mapped.itemIndex
					? {
							...item,
							finger: item.note === null ? undefined : finger
						}
					: item
			);
		});

		editorError = '';
		shareStatus = '';
	}

	function moveSelectedNoteBySemitone(direction: 1 | -1) {
		if (selectedNoteIndex < 0) return;

		const mapped = toBarAndItemIndex(selectedNoteIndex);
		if (!mapped) return;

		const item = melody[mapped.barIndex]?.[mapped.itemIndex];
		if (!item?.note) return;

		const shifted = transposeNoteName(item.note, direction, keySignature.preferredAccidental);
		if (!shifted || !availablePitches.includes(shifted)) return;

		editorError = '';
		shareStatus = '';
		melody = melody.map((bar, barIndex) => {
			if (barIndex !== mapped.barIndex) return bar;
			return bar.map((entry, itemIndex) =>
				itemIndex === mapped.itemIndex
					? {
							...entry,
							note: shifted,
							finger: resolveFingerAfterPitchChange(entry, shifted)
						}
					: entry
			);
		});
	}

	function handleEditorKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeNoteContextMenu();
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			closeNoteContextMenu();
			moveSelectedNoteBySemitone(1);
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			closeNoteContextMenu();
			moveSelectedNoteBySemitone(-1);
		}
	}

	function handleWindowPointerDown() {
		if (!noteContextMenu) return;
		closeNoteContextMenu();
	}

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
		editorError = '';

		try {
			for (const item of sequence) {
				if (shouldStopMelodyPreview) break;
				await melodyPreviewSynth.playNote(item, tempoBpm);
				if (shouldStopMelodyPreview) break;
			}
		} catch {
			editorError = 'Unable to play melody preview.';
		} finally {
			isPlayingMelodyPreview = false;
			shouldStopMelodyPreview = false;
		}
	}

	function buildPracticeTempi(): Piece['practiceTempi'] | undefined {
		return inferPracticeTempiFromFastTempo(fastTempo);
	}

	function addBar() {
		editorError = '';
		shareStatus = '';
		const newBar = createInitialRests(barLength as NoteLength, 1)[0];
		melody = [...melody, newBar];
	}

	function removeLastBar() {
		editorError = '';
		shareStatus = '';
		if (melody.length === 0) return;

		const updatedMelody = melody.slice(0, -1);
		melody =
			updatedMelody.length > 0 ? updatedMelody : createInitialRests(barLength as NoteLength, 1);

		if (selectedNoteIndex >= sequence.length) {
			selectedNoteIndex = sequence.length - 1;
		}
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
			melody,
			scale: buildScaleFromMelody(sequence),
			notationStartPercent,
			notationEndPercent
		};

		return { piece, errors: [] };
	}

	function getShareBaseUrl(): string {
		if (typeof window !== 'undefined' && window.location.origin) {
			return window.location.origin;
		}

		const fallbackUrl = data.sharePreviewData.url;
		if (!fallbackUrl) return '';

		try {
			return new URL(fallbackUrl).origin;
		} catch {
			return '';
		}
	}

	async function copyCustomPieceUrl() {
		if (!customPieceShare.url) {
			shareStatus =
				customPieceShare.error || pieceBuildResult.errors[0] || 'Piece is not valid yet.';
			return;
		}

		try {
			await navigator.clipboard.writeText(customPieceShare.url);
			shareStatus = 'Custom piece URL copied to clipboard.';
		} catch {
			shareStatus = 'Unable to copy custom piece URL.';
		}
	}
</script>

<svelte:head>
	<title>Etude Composer - Teacher Tools - The Sharpest Note</title>
</svelte:head>

<SharePreview data={data.sharePreviewData} />

<svelte:window
	onkeydown={handleEditorKeyDown}
	onpointerdown={handleWindowPointerDown}
	onscroll={closeNoteContextMenu}
/>

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
				{melodyBars}
				{keySignature}
				{barLength}
				{availablePitches}
				{selectedNoteIndex}
				{editorError}
				{noteContextMenu}
				{selectedSequenceItem}
				{selectedItemDefaultFinger}
				{isPlayingMelodyPreview}
				lengthOptions={LENGTH_OPTIONS}
				onToggleMelodyPlayback={handleToggleMelodyPreview}
				onRemoveBar={removeLastBar}
				onAddBar={addBar}
				onMoveNote={handleMoveNoteFromStaff}
				onAddNote={handleAddNoteFromStaff}
				onSelectNote={handleSelectNoteFromStaff}
				onOpenNoteContextMenu={handleOpenNoteContextMenu}
				onChangeLengthFromMenu={handleChangeLengthFromMenu}
				onSetItemKindFromMenu={handleSetItemKindFromMenu}
				onSetFingerFromMenu={handleSetFingerFromMenu}
			/>

			<ComposerShareCard
				bind:teacherShareNote
				{pieceLabel}
				shareUrl={customPieceShare.url}
				shareError={customPieceShare.error}
				errors={pieceBuildResult.errors}
				{shareStatus}
				onCopyUrl={copyCustomPieceUrl}
			/>
		</section>
	</div>
</div>
