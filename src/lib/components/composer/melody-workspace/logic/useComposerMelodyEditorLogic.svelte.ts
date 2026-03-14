import { getOptimalFingering } from '$lib/config/fingerMarkings';
import type { KeySignature } from '$lib/config/keys';
import type { MelodyItem, NoteLength } from '$lib/config/melody';
import type { Clef, InstrumentId } from '$lib/config/types';
import { createInitialRests, resolveBarAfterNoteChange } from '$lib/util/composerUtils';
import { transposeNoteName } from '$lib/util/noteNames';
import type { ComposerStaffInteraction } from '$lib/components/music/composerStaffTypes';
import {
	LENGTH_SHORTCUT_KEYS,
	MAX_MELODY_BARS,
	applyKeySignatureToNaturalNote,
	getBottomStaffLinePitch,
	getIndexAtSequenceOffset,
	getItemAtFlatIndex,
	getRemainingInBarAtFlatIndex,
	getSequenceOffsetAtIndex,
	isEditableTarget,
	tidyRestsInBar,
	toBarAndItemIndex
} from './composerMelodyEditorLogic';

export type NoteContextMenuHandle = {
	scrollIntoViewIfNeeded: () => void;
};

export type StaffContextMenuAnchorProvider = {
	getContextMenuAnchorForNote: (
		noteIndex: number
	) => { index: number; x: number; y: number } | null;
};

interface UseComposerMelodyEditorLogicConfig {
	getClef: () => Clef;
	getMelody: () => MelodyItem[][];
	setMelody: (nextMelody: MelodyItem[][]) => void;
	getInstrumentId: () => InstrumentId;
	getKeySignature: () => KeySignature;
	getBarLength: () => number;
	getAvailablePitches: () => string[];
	getLengthOptions: () => NoteLength[];
	getOnPreviewItem: () => ((item: MelodyItem) => void | Promise<void>) | undefined;
	getOnEdit: () => (() => void) | undefined;
	getStaffRef: () => StaffContextMenuAnchorProvider | null;
	getNoteContextMenuRef: () => NoteContextMenuHandle | null;
}

export function useComposerMelodyEditorLogic(config: UseComposerMelodyEditorLogicConfig) {
	const selectedLength: NoteLength = 4;
	const selectedFinger = '';

	let editorError = $state('');
	let selectedNoteIndex = $state(-1);
	let noteContextMenu = $state<{
		index: number;
		x: number;
		y: number;
	} | null>(null);
	let isSmallScreen = $state(false);
	let contextMenuRestoreNote = $state<string | null>(null);
	let contextMenuRestoreIndex = $state<number | null>(null);
	let pendingContextMenuVisibilityCheck = $state(false);

	const hasReachedMaxBars = $derived(config.getMelody().length >= MAX_MELODY_BARS);
	const sequence = $derived(config.getMelody().flat());
	const selectedSequenceItem = $derived(
		selectedNoteIndex >= 0 ? (sequence[selectedNoteIndex] ?? null) : null
	);

	$effect(() => {
		if (typeof window === 'undefined') return;

		const mediaQuery = window.matchMedia('(max-width: 640px)');
		const syncSmallScreen = () => {
			isSmallScreen = mediaQuery.matches;
		};

		syncSmallScreen();
		mediaQuery.addEventListener('change', syncSmallScreen);

		return () => {
			mediaQuery.removeEventListener('change', syncSmallScreen);
		};
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
		if (!pendingContextMenuVisibilityCheck) return;
		if (!noteContextMenu) {
			pendingContextMenuVisibilityCheck = false;
			return;
		}

		const noteContextMenuRef = config.getNoteContextMenuRef();
		if (!noteContextMenuRef) return;

		requestAnimationFrame(() => {
			noteContextMenuRef.scrollIntoViewIfNeeded();
			pendingContextMenuVisibilityCheck = false;
		});
	});

	function markEdited() {
		editorError = '';
		config.getOnEdit()?.();
	}

	function previewItem(item: MelodyItem) {
		void config.getOnPreviewItem()?.(item);
	}

	function closeNoteContextMenu() {
		noteContextMenu = null;
		contextMenuRestoreNote = null;
		contextMenuRestoreIndex = null;
	}

	function seedContextMenuRestore(index: number) {
		const mapped = toBarAndItemIndex(config.getMelody(), index);
		if (!mapped) {
			contextMenuRestoreNote = null;
			contextMenuRestoreIndex = index;
			return;
		}

		const item = config.getMelody()[mapped.barIndex]?.[mapped.itemIndex];
		contextMenuRestoreNote = item?.note ?? null;
		contextMenuRestoreIndex = index;
	}

	function resolveFingerAfterPitchChange(nextNote: string): number | undefined {
		return getOptimalFingering(config.getInstrumentId(), nextNote)?.finger;
	}

	function appendNote(note: string | null): boolean {
		const barLength = config.getBarLength();
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
					? getOptimalFingering(config.getInstrumentId(), note)?.finger
					: undefined;

		const updatedBars = config.getMelody().map((bar) => [...bar]);
		if (updatedBars.length === 0) updatedBars.push([]);

		let targetBar = updatedBars[updatedBars.length - 1];
		const fill = targetBar.reduce((sum, item) => sum + item.length, 0);
		if (fill + selectedLength > safeBarLength) {
			if (updatedBars.length >= MAX_MELODY_BARS) {
				editorError = `Melody is limited to ${MAX_MELODY_BARS} bars.`;
				return false;
			}
			targetBar = [];
			updatedBars.push(targetBar);
		}

		targetBar.push({
			note,
			length: selectedLength,
			finger: resolvedFinger
		});

		config.setMelody(updatedBars);
		return true;
	}

	function handleMoveNoteFromStaff(index: number, note: string) {
		markEdited();
		selectedNoteIndex = index;

		const keySignature = config.getKeySignature();
		const normalizedNote = applyKeySignatureToNaturalNote(keySignature, note);
		const melody = config.getMelody();
		const mapped = toBarAndItemIndex(melody, index);
		if (!mapped) return;
		const currentItem = melody[mapped.barIndex]?.[mapped.itemIndex];
		if (!currentItem) return;

		const updatedMelody = melody.map((bar, barIndex) => {
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

		config.setMelody(updatedMelody);

		previewItem({
			note: normalizedNote,
			length: currentItem.length,
			finger: resolveFingerAfterPitchChange(normalizedNote)
		});
	}

	function handleAddNoteFromStaff(note: string) {
		markEdited();
		closeNoteContextMenu();
		const previousLength = sequence.length;
		const normalizedNote = applyKeySignatureToNaturalNote(config.getKeySignature(), note);
		const didAppend = appendNote(normalizedNote);
		if (didAppend) {
			selectedNoteIndex = previousLength;
			previewItem({
				note: normalizedNote,
				length: selectedLength,
				finger: resolveFingerAfterPitchChange(normalizedNote)
			});
		}
	}

	function syncContextMenuToSelection(index: number) {
		const anchoredMenu = config.getStaffRef()?.getContextMenuAnchorForNote(index);
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

	function handleStaffInteractionRelease() {
		pendingContextMenuVisibilityCheck = true;
	}

	function handleStaffInteraction(interaction: ComposerStaffInteraction) {
		switch (interaction.type) {
			case 'note-select':
				handleSelectNoteFromStaff(interaction.index);
				return;
			case 'note-drag':
				handleMoveNoteFromStaff(interaction.index, interaction.note);
				return;
			case 'note-activate':
				if (interaction.trigger === 'tap' && interaction.note) {
					handleMoveNoteFromStaff(interaction.index, interaction.note);
				}
				handleOpenNoteContextMenu({
					index: interaction.index,
					x: interaction.x,
					y: interaction.y
				});
				return;
			case 'add-note':
				handleAddNoteFromStaff(interaction.note);
				return;
			case 'interaction-end':
				handleStaffInteractionRelease();
				return;
		}
	}

	function updateSelectedNoteInBar(
		action: { type: 'set-length'; length: NoteLength } | { type: 'remove' }
	) {
		if (selectedNoteIndex < 0) return;

		const melody = config.getMelody();
		const mapped = toBarAndItemIndex(melody, selectedNoteIndex);
		if (!mapped) return;

		const updatedBars = melody.map((bar, barIndex) => {
			if (barIndex !== mapped.barIndex) return bar;
			return resolveBarAfterNoteChange(bar, mapped.itemIndex, config.getBarLength(), action);
		});

		const nextSequence = updatedBars.flat();
		selectedNoteIndex =
			nextSequence.length > 0 ? Math.min(selectedNoteIndex, nextSequence.length - 1) : -1;
		config.setMelody(updatedBars);
		markEdited();
	}

	function handleChangeLengthFromMenu(length: NoteLength) {
		updateSelectedNoteInBar({ type: 'set-length', length });
	}

	function handleSetItemKindFromMenu(kind: 'note' | 'rest') {
		if (selectedNoteIndex < 0) return;

		const melody = config.getMelody();
		const mapped = toBarAndItemIndex(melody, selectedNoteIndex);
		if (!mapped) return;

		const currentItem = melody[mapped.barIndex]?.[mapped.itemIndex];
		if (!currentItem) return;

		const availablePitches = config.getAvailablePitches();
		const fallbackNote = availablePitches[0] ?? 'd/4';
		if (kind === 'rest' && currentItem.note) {
			contextMenuRestoreNote = currentItem.note;
			contextMenuRestoreIndex = selectedNoteIndex;
		}

		const rememberedNote =
			contextMenuRestoreIndex === selectedNoteIndex ? contextMenuRestoreNote : null;
		const nextNote = kind === 'rest' ? null : (rememberedNote ?? currentItem.note ?? fallbackNote);
		const defaultFinger =
			nextNote !== null
				? getOptimalFingering(config.getInstrumentId(), nextNote)?.finger
				: undefined;

		const updatedMelody = melody.map((bar, barIndex) => {
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

		config.setMelody(updatedMelody);

		if (nextNote !== null) {
			previewItem({
				note: nextNote,
				length: currentItem.length,
				finger: defaultFinger
			});
		}

		markEdited();
	}

	function handleSetFingerFromMenu(finger: number | undefined) {
		if (selectedNoteIndex < 0) return;

		const melody = config.getMelody();
		const mapped = toBarAndItemIndex(melody, selectedNoteIndex);
		if (!mapped) return;

		const updatedMelody = melody.map((bar, barIndex) => {
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

		config.setMelody(updatedMelody);
		markEdited();
	}

	function cycleFingerMarkingAtFlatIndex(flatIndex: number) {
		const melody = config.getMelody();
		const mapped = toBarAndItemIndex(melody, flatIndex);
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

		const melody = config.getMelody();
		const mapped = toBarAndItemIndex(melody, selectedNoteIndex);
		if (!mapped) return;

		const item = melody[mapped.barIndex]?.[mapped.itemIndex];
		if (!item) return;

		if (item.note === null) {
			const bottomStaffLinePitch = getBottomStaffLinePitch({
				clef: config.getClef(),
				keySignature: config.getKeySignature(),
				availablePitches: config.getAvailablePitches()
			});
			const updatedMelody = melody.map((bar, barIndex) => {
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

			config.setMelody(updatedMelody);

			previewItem({
				note: bottomStaffLinePitch,
				length: item.length,
				finger: resolveFingerAfterPitchChange(bottomStaffLinePitch)
			});

			markEdited();
			return;
		}

		const shifted = transposeNoteName(
			item.note,
			direction,
			config.getKeySignature().preferredAccidental
		);
		if (!shifted || !config.getAvailablePitches().includes(shifted)) return;

		const updatedMelody = melody.map((bar, barIndex) => {
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

		config.setMelody(updatedMelody);

		previewItem({
			note: shifted,
			length: item.length,
			finger: resolveFingerAfterPitchChange(shifted)
		});

		markEdited();
	}

	function canMoveSelectedNoteBySemitone(direction: 1 | -1): boolean {
		if (selectedNoteIndex < 0) return false;

		const melody = config.getMelody();
		const mapped = toBarAndItemIndex(melody, selectedNoteIndex);
		if (!mapped) return false;

		const item = melody[mapped.barIndex]?.[mapped.itemIndex];
		if (!item) return false;

		if (item.note === null) {
			return config.getAvailablePitches().length > 0;
		}

		const shifted = transposeNoteName(
			item.note,
			direction,
			config.getKeySignature().preferredAccidental
		);
		return shifted !== null && config.getAvailablePitches().includes(shifted);
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
			const currentContextItem = getItemAtFlatIndex(config.getMelody(), contextMenu.index);
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
				const targetLength = config.getLengthOptions()[shortcutIndex];
				const remainingInBar = getRemainingInBarAtFlatIndex(
					config.getMelody(),
					config.getBarLength(),
					contextMenu.index
				);

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

	function handleWindowScroll() {
		if (!noteContextMenu) return;
		syncContextMenuToSelection(noteContextMenu.index);
	}

	function handleContextMenuScrollIntoView(deltaY: number) {
		if (typeof window === 'undefined' || deltaY === 0) return;
		window.scrollBy({ top: deltaY, behavior: 'smooth' });
	}

	function tidyUpRests() {
		closeNoteContextMenu();
		const sequenceBefore = config.getMelody().flat();
		const selectedOffset = getSequenceOffsetAtIndex(sequenceBefore, selectedNoteIndex);

		const nextMelody = config.getMelody().map((bar) => tidyRestsInBar(bar));
		config.setMelody(nextMelody);

		const sequenceAfter = nextMelody.flat();
		selectedNoteIndex = getIndexAtSequenceOffset(sequenceAfter, selectedOffset);
		markEdited();
	}

	function addBar() {
		markEdited();
		if (config.getMelody().length >= MAX_MELODY_BARS) {
			editorError = `Melody is limited to ${MAX_MELODY_BARS} bars.`;
			return;
		}

		const newBar = createInitialRests(config.getBarLength() as NoteLength, 1)[0];
		config.setMelody([...config.getMelody(), newBar]);
	}

	function removeLastBar() {
		markEdited();
		const melody = config.getMelody();
		if (melody.length === 0) return;

		const updatedMelody = melody.slice(0, -1);
		const nextMelody =
			updatedMelody.length > 0
				? updatedMelody
				: createInitialRests(config.getBarLength() as NoteLength, 1);

		config.setMelody(nextMelody);

		if (selectedNoteIndex >= nextMelody.flat().length) {
			selectedNoteIndex = nextMelody.flat().length - 1;
		}
	}

	const remainingInBarForSelected = $derived.by(() => {
		if (!noteContextMenu) return config.getBarLength();
		return getRemainingInBarAtFlatIndex(
			config.getMelody(),
			config.getBarLength(),
			noteContextMenu.index
		);
	});

	return {
		editorError: () => editorError,
		selectedNoteIndex: () => selectedNoteIndex,
		noteContextMenu: () => noteContextMenu,
		isSmallScreen: () => isSmallScreen,
		hasReachedMaxBars: () => hasReachedMaxBars,
		selectedSequenceItem: () => selectedSequenceItem,
		remainingInBarForSelected: () => remainingInBarForSelected,
		handleStaffInteraction,
		handleMoveNoteFromStaff,
		handleAddNoteFromStaff,
		handleSelectNoteFromStaff,
		handleOpenNoteContextMenu,
		handleStaffInteractionRelease,
		handleChangeLengthFromMenu,
		handleSetItemKindFromMenu,
		handleSetFingerFromMenu,
		moveSelectedNoteBySemitone,
		canMoveSelectedNoteBySemitone,
		handleContextMenuScrollIntoView,
		handleEditorKeyDown,
		handleEditorKeyUp,
		handleWindowPointerDown,
		handleWindowScroll,
		tidyUpRests,
		addBar,
		removeLastBar
	};
}
