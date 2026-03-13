<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { getOptimalFingering } from '$lib/config/fingerMarkings';
	import type { Clef } from '$lib/config/types';
	import type { KeySignature } from '$lib/config/keys';
	import type { MelodyItem, NoteLength } from '$lib/config/melody';
	import { transposeNoteName } from '$lib/util/noteNames';
	import { createInitialRests, resolveBarAfterNoteChange } from '$lib/util/composerUtils';
	import ComposerStaff from '$lib/components/music/ComposerStaff.svelte';
	import ComposerNoteContextMenu from '$lib/components/composer/ComposerNoteContextMenu.svelte';
	import type { InstrumentId } from '$lib/config/types';

	const LENGTH_SHORTCUT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
	const REST_CHUNK_LENGTHS: NoteLength[] = [16, 12, 8, 6, 4, 3, 2, 1];
	const BOTTOM_STAFF_LINE_NOTE_BY_CLEF: Record<Clef, string> = {
		treble: 'e/4',
		alto: 'f/4',
		bass: 'g/2'
	};

	interface Props {
		clef: Clef;
		melody: MelodyItem[][];
		instrumentId: InstrumentId;
		keySignature: KeySignature;
		barLength: number;
		availablePitches: string[];
		isPlayingMelodyPreview: boolean;
		lengthOptions: NoteLength[];
		onToggleMelodyPlayback: () => void;
		onEdit?: () => void;
	}

	let {
		clef,
		melody = $bindable(),
		instrumentId,
		keySignature,
		barLength,
		availablePitches,
		isPlayingMelodyPreview,
		lengthOptions,
		onToggleMelodyPlayback,
		onEdit
	}: Props = $props();

	let editorError = $state('');
	let selectedNoteIndex = $state(-1);
	let noteContextMenu = $state<{ index: number; x: number; y: number } | null>(null);
	let contextMenuRestoreNote = $state<string | null>(null);
	let contextMenuRestoreIndex = $state<number | null>(null);
	type StaffContextMenuAnchorProvider = {
		getContextMenuAnchorForNote: (
			noteIndex: number
		) => { index: number; x: number; y: number } | null;
	};
	let staffRef = $state<StaffContextMenuAnchorProvider | null>(null);
	const selectedLength: NoteLength = 4;
	const selectedFinger = '';
	const sequence = $derived(melody.flat());
	const selectedSequenceItem = $derived(
		selectedNoteIndex >= 0 ? (sequence[selectedNoteIndex] ?? null) : null
	);

	$effect(() => {
		if (selectedNoteIndex >= sequence.length) {
			selectedNoteIndex = sequence.length - 1;
		}
		if (noteContextMenu && selectedNoteIndex !== noteContextMenu.index) {
			noteContextMenu = null;
		}
	});

	function markEdited() {
		editorError = '';
		onEdit?.();
	}

	function closeNoteContextMenu() {
		noteContextMenu = null;
		contextMenuRestoreNote = null;
		contextMenuRestoreIndex = null;
	}

	function seedContextMenuRestore(index: number) {
		const mapped = toBarAndItemIndex(index);
		if (!mapped) {
			contextMenuRestoreNote = null;
			contextMenuRestoreIndex = index;
			return;
		}

		const item = melody[mapped.barIndex]?.[mapped.itemIndex];
		contextMenuRestoreNote = item?.note ?? null;
		contextMenuRestoreIndex = index;
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

	function getItemAtFlatIndex(flatIndex: number): MelodyItem | null {
		const mapped = toBarAndItemIndex(flatIndex);
		if (!mapped) return null;
		return melody[mapped.barIndex]?.[mapped.itemIndex] ?? null;
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

	function resolveFingerAfterPitchChange(nextNote: string): number | undefined {
		return getOptimalFingering(instrumentId, nextNote)?.finger;
	}

	function getBottomStaffLinePitch(): string {
		const naturalBottomLineNote = BOTTOM_STAFF_LINE_NOTE_BY_CLEF[clef] ?? 'e/4';
		const keyAdjustedBottomLineNote = applyKeySignatureToNaturalNote(naturalBottomLineNote);

		if (availablePitches.includes(keyAdjustedBottomLineNote)) {
			return keyAdjustedBottomLineNote;
		}

		if (availablePitches.includes(naturalBottomLineNote)) {
			return naturalBottomLineNote;
		}

		const bottomLineMatch = /^([a-g])(?:[#b])?\/(\d+)$/.exec(naturalBottomLineNote);
		if (bottomLineMatch) {
			const [, letter, octave] = bottomLineMatch;
			const sameLineCandidates = availablePitches.filter((pitch) => {
				const candidateMatch = /^([a-g])([#b]?)\/(\d+)$/.exec(pitch);
				return candidateMatch
					? candidateMatch[1] === letter && candidateMatch[3] === octave
					: false;
			});

			const preferredAccidental = keySignature.preferredAccidental === 'sharp' ? '#' : 'b';
			const preferredCandidate = sameLineCandidates.find((candidate) =>
				candidate.includes(preferredAccidental)
			);
			if (preferredCandidate) {
				return preferredCandidate;
			}

			if (sameLineCandidates.length > 0) {
				return sameLineCandidates[0];
			}
		}

		return availablePitches[0] ?? naturalBottomLineNote;
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
		markEdited();
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
					finger: resolveFingerAfterPitchChange(normalizedNote)
				};
			});
		});
	}

	function handleAddNoteFromStaff(note: string) {
		markEdited();
		closeNoteContextMenu();
		const previousLength = sequence.length;
		const didAppend = appendNote(applyKeySignatureToNaturalNote(note));
		if (didAppend) {
			selectedNoteIndex = previousLength;
		}
	}

	function handleSelectNoteFromStaff(index: number) {
		selectedNoteIndex = index;
		syncContextMenuToSelection(index);
	}

	function handleOpenNoteContextMenu(payload: { index: number; x: number; y: number }) {
		markEdited();
		selectedNoteIndex = payload.index;
		noteContextMenu = payload;
		seedContextMenuRestore(payload.index);
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
		markEdited();
	}

	function handleChangeLengthFromMenu(length: NoteLength) {
		updateSelectedNoteInBar({ type: 'set-length', length });
	}

	function handleSetItemKindFromMenu(kind: 'note' | 'rest') {
		if (selectedNoteIndex < 0) return;

		const mapped = toBarAndItemIndex(selectedNoteIndex);
		if (!mapped) return;

		const currentItem = melody[mapped.barIndex]?.[mapped.itemIndex];
		if (!currentItem) return;

		const fallbackNote = availablePitches[0] ?? 'd/4';
		if (kind === 'rest' && currentItem.note) {
			contextMenuRestoreNote = currentItem.note;
			contextMenuRestoreIndex = selectedNoteIndex;
		}

		const rememberedNote =
			contextMenuRestoreIndex === selectedNoteIndex ? contextMenuRestoreNote : null;
		const nextNote = kind === 'rest' ? null : (rememberedNote ?? currentItem.note ?? fallbackNote);
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

		markEdited();
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

		markEdited();
	}

	function cycleFingerMarkingAtFlatIndex(flatIndex: number) {
		const mapped = toBarAndItemIndex(flatIndex);
		if (!mapped) return;

		const currentItem = melody[mapped.barIndex]?.[mapped.itemIndex];
		if (!currentItem || currentItem.note === null) return;

		const fingerCycle: Array<number | undefined> = [0, 1, 2, 3, 4, undefined];
		const currentFinger = currentItem.finger;
		const currentCycleIndex = fingerCycle.findIndex((value) => value === currentFinger);
		const nextFinger =
			currentCycleIndex === -1 ? 0 : fingerCycle[(currentCycleIndex + 1) % fingerCycle.length];

		handleSetFingerFromMenu(nextFinger);
	}

	function moveSelectedNoteBySemitone(direction: 1 | -1) {
		if (selectedNoteIndex < 0) return;

		const mapped = toBarAndItemIndex(selectedNoteIndex);
		if (!mapped) return;

		const item = melody[mapped.barIndex]?.[mapped.itemIndex];
		if (!item) return;

		if (item.note === null) {
			const bottomStaffLinePitch = getBottomStaffLinePitch();
			melody = melody.map((bar, barIndex) => {
				if (barIndex !== mapped.barIndex) return bar;
				return bar.map((entry, itemIndex) =>
					itemIndex === mapped.itemIndex
						? {
								...entry,
								note: bottomStaffLinePitch,
								finger: resolveFingerAfterPitchChange(bottomStaffLinePitch)
							}
						: entry
				);
			});

			markEdited();
			return;
		}

		const shifted = transposeNoteName(item.note, direction, keySignature.preferredAccidental);
		if (!shifted || !availablePitches.includes(shifted)) return;

		melody = melody.map((bar, barIndex) => {
			if (barIndex !== mapped.barIndex) return bar;
			return bar.map((entry, itemIndex) =>
				itemIndex === mapped.itemIndex
					? {
							...entry,
							note: shifted,
							finger: resolveFingerAfterPitchChange(shifted)
						}
					: entry
			);
		});

		markEdited();
	}

	function syncContextMenuToSelection(index: number) {
		const anchoredMenu = staffRef?.getContextMenuAnchorForNote(index);
		if (anchoredMenu) {
			noteContextMenu = anchoredMenu;
		} else if (noteContextMenu) {
			noteContextMenu = {
				...noteContextMenu,
				index
			};
		}
		seedContextMenuRestore(index);
	}

	function navigateSelectionHorizontally(step: -1 | 1) {
		if (sequence.length === 0) return;

		if (selectedNoteIndex < 0) {
			const initialIndex = step > 0 ? 0 : sequence.length - 1;
			selectedNoteIndex = initialIndex;
			syncContextMenuToSelection(initialIndex);
			return;
		}

		const nextIndex = Math.max(0, Math.min(sequence.length - 1, selectedNoteIndex + step));
		if (nextIndex === selectedNoteIndex) return;

		selectedNoteIndex = nextIndex;
		syncContextMenuToSelection(nextIndex);
	}

	function getRemainingInBarAtFlatIndex(flatIndex: number): number {
		if (flatIndex < 0) return barLength;
		let cursor = 0;

		for (const bar of melody) {
			for (let i = 0; i < bar.length; i++) {
				if (cursor === flatIndex) {
					const startOffset = bar.slice(0, i).reduce((sum, item) => sum + item.length, 0);
					return barLength - startOffset;
				}
				cursor += 1;
			}
		}

		return barLength;
	}

	function isEditableTarget(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		const tagName = target.tagName;
		return (
			target.isContentEditable ||
			tagName === 'INPUT' ||
			tagName === 'TEXTAREA' ||
			tagName === 'SELECT'
		);
	}

	function handleEditorKeyDown(event: KeyboardEvent) {
		const contextMenu = noteContextMenu;
		const isContextMenuShortcut =
			contextMenu !== null && !event.metaKey && !event.ctrlKey && !event.altKey;

		if (isContextMenuShortcut && (event.code === 'Space' || event.key === ' ')) {
			event.preventDefault();
			event.stopPropagation();
			if (document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}
			const currentContextItem = getItemAtFlatIndex(contextMenu.index);
			handleSetItemKindFromMenu(currentContextItem?.note === null ? 'note' : 'rest');
			return;
		}

		if (isEditableTarget(event.target)) return;

		if (event.key === 'Escape') {
			closeNoteContextMenu();
			return;
		}

		if (isContextMenuShortcut) {
			if (event.key === 'f' || event.key === 'F') {
				event.preventDefault();
				cycleFingerMarkingAtFlatIndex(contextMenu.index);
				return;
			}

			const shortcutIndex = LENGTH_SHORTCUT_KEYS.indexOf(
				event.key as (typeof LENGTH_SHORTCUT_KEYS)[number]
			);

			if (shortcutIndex !== -1) {
				const targetLength = lengthOptions[shortcutIndex];
				const remainingInBar = getRemainingInBarAtFlatIndex(contextMenu.index);

				if (targetLength !== undefined && targetLength <= remainingInBar) {
					event.preventDefault();
					handleChangeLengthFromMenu(targetLength);
				}
				return;
			}
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			moveSelectedNoteBySemitone(1);
			return;
		}

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			navigateSelectionHorizontally(-1);
			return;
		}

		if (event.key === 'ArrowRight') {
			event.preventDefault();
			navigateSelectionHorizontally(1);
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			moveSelectedNoteBySemitone(-1);
		}
	}

	function handleEditorKeyUp(event: KeyboardEvent) {
		const isContextMenuShortcut =
			noteContextMenu !== null && !event.metaKey && !event.ctrlKey && !event.altKey;
		if (isContextMenuShortcut && (event.code === 'Space' || event.key === ' ')) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	function handleWindowPointerDown() {
		if (!noteContextMenu) return;
		closeNoteContextMenu();
	}

	function chunkRestLength(totalLength: number): MelodyItem[] {
		const chunks: MelodyItem[] = [];
		let remaining = Math.max(0, Math.floor(totalLength));

		while (remaining > 0) {
			const chunkLength = REST_CHUNK_LENGTHS.find((length) => length <= remaining) ?? 1;
			chunks.push({ note: null, length: chunkLength });
			remaining -= chunkLength;
		}

		return chunks;
	}

	function tidyRestsInBar(bar: MelodyItem[]): MelodyItem[] {
		const tidied: MelodyItem[] = [];
		let pendingRestLength = 0;

		for (const item of bar) {
			if (item.note === null) {
				pendingRestLength += item.length;
				continue;
			}

			if (pendingRestLength > 0) {
				tidied.push(...chunkRestLength(pendingRestLength));
				pendingRestLength = 0;
			}

			tidied.push({ ...item });
		}

		if (pendingRestLength > 0) {
			tidied.push(...chunkRestLength(pendingRestLength));
		}

		return tidied;
	}

	function getSequenceOffsetAtIndex(items: MelodyItem[], index: number): number {
		if (index <= 0) return 0;
		return items.slice(0, index).reduce((sum, item) => sum + item.length, 0);
	}

	function getIndexAtSequenceOffset(items: MelodyItem[], offset: number): number {
		if (items.length === 0) return -1;
		if (offset <= 0) return 0;

		let cursor = 0;
		for (let index = 0; index < items.length; index++) {
			const itemLength = items[index]?.length ?? 0;
			if (offset < cursor + itemLength) {
				return index;
			}
			cursor += itemLength;
		}

		return items.length - 1;
	}

	function tidyUpRests() {
		closeNoteContextMenu();
		const sequenceBefore = melody.flat();
		const selectedOffset = getSequenceOffsetAtIndex(sequenceBefore, selectedNoteIndex);

		melody = melody.map((bar) => tidyRestsInBar(bar));

		const sequenceAfter = melody.flat();
		selectedNoteIndex = getIndexAtSequenceOffset(sequenceAfter, selectedOffset);
		markEdited();
	}

	function addBar() {
		markEdited();
		const newBar = createInitialRests(barLength as NoteLength, 1)[0];
		melody = [...melody, newBar];
	}

	function removeLastBar() {
		markEdited();
		if (melody.length === 0) return;

		const updatedMelody = melody.slice(0, -1);
		melody =
			updatedMelody.length > 0 ? updatedMelody : createInitialRests(barLength as NoteLength, 1);

		if (selectedNoteIndex >= sequence.length) {
			selectedNoteIndex = sequence.length - 1;
		}
	}

	const remainingInBarForSelected = $derived.by(() => {
		if (!noteContextMenu) return barLength;
		const flatIndex = noteContextMenu.index;
		let cursor = 0;
		for (const bar of melody) {
			for (let i = 0; i < bar.length; i++) {
				if (cursor === flatIndex) {
					const startOffset = bar.slice(0, i).reduce((sum, item) => sum + item.length, 0);
					return barLength - startOffset;
				}
				cursor++;
			}
		}
		return barLength;
	});
</script>

<svelte:window
	onkeydown={handleEditorKeyDown}
	onkeyup={handleEditorKeyUp}
	onpointerdown={handleWindowPointerDown}
	onscroll={closeNoteContextMenu}
/>

<div class="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
	<button
		type="button"
		title={isPlayingMelodyPreview ? 'Stop melody preview' : 'Play melody preview'}
		onclick={onToggleMelodyPlayback}
		class="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-dark-blue text-off-white transition hover:-translate-y-px hover:bg-dark-blue-highlight hover:shadow"
		aria-label={isPlayingMelodyPreview ? 'Stop melody preview' : 'Play melody preview'}
	>
		{#if isPlayingMelodyPreview}
			<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path d="M6 6h12v12H6z" />
			</svg>
		{:else}
			<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path d="M8 5v14l11-7z" />
			</svg>
		{/if}
	</button>

	<h2 class="text-xl font-semibold text-slate-900">Melody editor</h2>

	<div class="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-3">
		<div class="mb-3 flex justify-center">
			<Button
				type="button"
				size="medium"
				variant="secondary"
				title="Merge adjacent rests"
				onclick={tidyUpRests}
			>
				Tidy up rests
			</Button>
		</div>

		<ComposerStaff
			bind:this={staffRef}
			bars={melody}
			{keySignature}
			{clef}
			{barLength}
			minBarWidth={280}
			pitchPalette={availablePitches}
			{selectedNoteIndex}
			isContextMenuOpen={noteContextMenu !== null}
			onMoveNote={handleMoveNoteFromStaff}
			onAddNote={handleAddNoteFromStaff}
			onSelectNote={handleSelectNoteFromStaff}
			onOpenNoteContextMenu={handleOpenNoteContextMenu}
		/>

		<div class="mt-4 flex justify-center gap-3">
			<Button
				type="button"
				size="medium"
				variant="secondary"
				title="Remove last bar"
				onclick={removeLastBar}
			>
				− remove bar
			</Button>
			<Button type="button" size="medium" variant="secondary" title="Add new bar" onclick={addBar}
				>+ add bar</Button
			>
		</div>
		{#if editorError}
			<p class="mt-2 text-sm font-medium text-red-700">{editorError}</p>
		{/if}

		{#if noteContextMenu && selectedSequenceItem}
			<ComposerNoteContextMenu
				x={noteContextMenu.x}
				y={noteContextMenu.y}
				selectedItem={selectedSequenceItem}
				{lengthOptions}
				remainingInBar={remainingInBarForSelected}
				onChangeLength={handleChangeLengthFromMenu}
				onSetItemKind={handleSetItemKindFromMenu}
				onSetFinger={handleSetFingerFromMenu}
			/>
		{/if}
	</div>
</div>
