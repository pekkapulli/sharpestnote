import type { MelodyItem } from '$lib/config/melody';
import type { ComposerStaffInteraction } from '$lib/components/music/composerStaffTypes';
import { isEditableTarget } from './composerMelodyEditorLogic';

export type TechniqueContextMenuHandle = {
	scrollIntoViewIfNeeded: () => void;
};

export type StaffContextMenuAnchorProvider = {
	getContextMenuAnchorForNote: (
		noteIndex: number
	) => { index: number; x: number; y: number } | null;
};

interface UseComposerMelodyTechniqueEditorLogicConfig {
	getMelody: () => MelodyItem[][];
	setMelody: (nextMelody: MelodyItem[][]) => void;
	getOnEdit: () => (() => void) | undefined;
	getStaffRef: () => StaffContextMenuAnchorProvider | null;
	getNoteContextMenuRef: () => TechniqueContextMenuHandle | null;
}

export function useComposerMelodyTechniqueEditorLogic(
	config: UseComposerMelodyTechniqueEditorLogicConfig
) {
	function getBarLocationForFlatIndex(index: number) {
		if (index < 0) return null;

		const bars = config.getMelody();
		let runningIndex = 0;

		for (let barIndex = 0; barIndex < bars.length; barIndex += 1) {
			const bar = bars[barIndex] ?? [];
			const barEndExclusive = runningIndex + bar.length;

			if (index >= runningIndex && index < barEndExclusive) {
				return {
					barIndex,
					indexInBar: index - runningIndex,
					barLength: bar.length
				};
			}

			runningIndex = barEndExclusive;
		}

		return null;
	}

	function isValidSlurSpan(startIndex: number, endIndex: number) {
		const from = Math.min(startIndex, endIndex);
		const to = Math.max(startIndex, endIndex);
		if (from < 0 || to < 0 || from === to) return false;

		const fromLocation = getBarLocationForFlatIndex(from);
		const toLocation = getBarLocationForFlatIndex(to);
		if (!fromLocation || !toLocation) return false;
		if (fromLocation.barIndex !== toLocation.barIndex) return false;

		const span = sequence.slice(from, to + 1);
		if (span.length < 2) return false;
		if (span.some((item) => item?.note === null)) return false;

		return true;
	}

	function canStartSlurFromIndex(index: number) {
		const location = getBarLocationForFlatIndex(index);
		if (!location) return false;

		const selectedItem = sequence[index];
		if (!selectedItem || selectedItem.note === null) return false;

		const nextIndex = index + 1;
		if (location.indexInBar >= location.barLength - 1) return false;

		const nextItem = sequence[nextIndex];
		if (!nextItem || nextItem.note === null) return false;

		return true;
	}

	function clampRangeToAnchorBar(fromIndex: number, toIndex: number, anchorIndex: number) {
		const anchorLocation = getBarLocationForFlatIndex(anchorIndex);
		if (!anchorLocation) return null;

		const barStart = anchorIndex - anchorLocation.indexInBar;
		const barEnd = barStart + anchorLocation.barLength - 1;
		const from = Math.max(Math.min(fromIndex, toIndex), barStart);
		const to = Math.min(Math.max(fromIndex, toIndex), barEnd);

		if (from > to) return null;
		return { from, to };
	}

	function findSlurRangeAtIndex(items: MelodyItem[], index: number) {
		if (index < 0 || index >= items.length) return null;

		let slurStartIndex: number | null = null;
		for (let idx = 0; idx < items.length; idx += 1) {
			if (items[idx]?.slurStart === true) {
				slurStartIndex = idx;
			}

			if (slurStartIndex !== null && items[idx]?.slurEnd === true && idx >= slurStartIndex) {
				if (index >= slurStartIndex && index <= idx) {
					return { from: slurStartIndex, to: idx };
				}
				slurStartIndex = null;
			}
		}

		return null;
	}

	let selectedNoteIndex = $state(-1);
	let selectedNoteRange = $state<{ from: number; to: number } | null>(null);
	let pendingSlurStartIndex = $state<number | null>(null);
	let isStaffPointerActive = false;
	let noteContextMenu = $state<{ index: number; x: number; y: number } | null>(null);
	let isSmallScreen = $state(false);
	let pendingContextMenuVisibilityCheck = $state(false);

	const sequence = $derived(config.getMelody().flat());
	const selectedSequenceItem = $derived(
		selectedNoteIndex >= 0 ? (sequence[selectedNoteIndex] ?? null) : null
	);
	const selectedRangeItems = $derived(
		selectedNoteRange ? sequence.slice(selectedNoteRange.from, selectedNoteRange.to + 1) : []
	);
	const selectedNoteSlurRange = $derived(
		selectedNoteRange === null ? findSlurRangeAtIndex(sequence, selectedNoteIndex) : null
	);
	const canStartSingleNoteSlur = $derived(canStartSlurFromIndex(selectedNoteIndex));
	const rangeHasSlur = $derived(
		selectedNoteRange !== null &&
			sequence[selectedNoteRange.from]?.slurStart === true &&
			sequence[selectedNoteRange.to]?.slurEnd === true
	);
	const canAddSlurToSelectedRange = $derived(
		selectedNoteRange !== null && isValidSlurSpan(selectedNoteRange.from, selectedNoteRange.to)
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

		if (noteContextMenu && !selectedNoteRange && selectedNoteIndex !== noteContextMenu.index) {
			noteContextMenu = null;
		}
	});

	$effect(() => {
		if (!pendingContextMenuVisibilityCheck) return;
		if (!noteContextMenu) {
			pendingContextMenuVisibilityCheck = false;
			return;
		}

		const contextMenuHandle = config.getNoteContextMenuRef();
		if (!contextMenuHandle) return;

		requestAnimationFrame(() => {
			contextMenuHandle.scrollIntoViewIfNeeded();
			pendingContextMenuVisibilityCheck = false;
		});
	});

	function markEdited() {
		config.getOnEdit()?.();
	}

	function closeNoteContextMenu() {
		noteContextMenu = null;
		selectedNoteRange = null;
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
	}

	function syncContextMenuToRange(from: number, to: number) {
		const fromAnchor = config.getStaffRef()?.getContextMenuAnchorForNote(from);
		const toAnchor = config.getStaffRef()?.getContextMenuAnchorForNote(to);
		if (fromAnchor && toAnchor) {
			noteContextMenu = {
				index: from,
				x: (fromAnchor.x + toAnchor.x) / 2,
				y: Math.min(fromAnchor.y, toAnchor.y)
			};
		} else if (toAnchor) {
			noteContextMenu = { ...toAnchor, index: from };
		} else if (fromAnchor) {
			noteContextMenu = fromAnchor;
		}
	}

	function handleSelectNoteFromStaff(index: number) {
		selectedNoteIndex = index;
		selectedNoteRange = null;
		isStaffPointerActive = true;
	}

	function handleOpenNoteContextMenu(payload: { index: number; x: number; y: number }) {
		selectedNoteIndex = payload.index;
		noteContextMenu = payload;
	}

	function handleStaffInteractionRelease() {
		pendingContextMenuVisibilityCheck = true;
	}

	function handleStaffInteraction(interaction: ComposerStaffInteraction) {
		switch (interaction.type) {
			case 'note-select':
				handleSelectNoteFromStaff(interaction.index);
				return;
			case 'note-range-select': {
				const anchorIndex = selectedNoteIndex >= 0 ? selectedNoteIndex : interaction.fromIndex;
				const clampedRange = clampRangeToAnchorBar(
					interaction.fromIndex,
					interaction.toIndex,
					anchorIndex
				);

				selectedNoteRange =
					clampedRange && clampedRange.from !== clampedRange.to ? clampedRange : null;
				noteContextMenu = null;
				return;
			}
			case 'note-activate':
				handleOpenNoteContextMenu({
					index: interaction.index,
					x: interaction.x,
					y: interaction.y
				});
				return;
			case 'interaction-end': {
				isStaffPointerActive = false;
				if (pendingSlurStartIndex !== null) {
					if (selectedNoteIndex >= 0 && isValidSlurSpan(pendingSlurStartIndex, selectedNoteIndex)) {
						applySlur(pendingSlurStartIndex, selectedNoteIndex);
					}
					pendingSlurStartIndex = null;
					handleStaffInteractionRelease();
					return;
				}
				if (selectedNoteRange) {
					syncContextMenuToRange(selectedNoteRange.from, selectedNoteRange.to);
				} else if (selectedNoteIndex >= 0 && !noteContextMenu) {
					syncContextMenuToSelection(selectedNoteIndex);
				}
				handleStaffInteractionRelease();
				return;
			}
			default:
				return;
		}
	}

	function applySlur(startIndex: number, endIndex: number) {
		if (!isValidSlurSpan(startIndex, endIndex)) return;

		const from = Math.min(startIndex, endIndex);
		const to = Math.max(startIndex, endIndex);

		let runningIndex = 0;
		const nextMelody = config.getMelody().map((bar) =>
			bar.map((item) => {
				const idx = runningIndex++;
				if (idx < from || idx > to) return item;

				const updated = { ...item };
				delete updated.slurStart;
				delete updated.slurEnd;
				if (idx === from) updated.slurStart = true;
				if (idx === to) updated.slurEnd = true;
				return updated;
			})
		);

		config.setMelody(nextMelody);
		markEdited();
	}

	function handleStartSlur() {
		if (selectedNoteIndex < 0 || !canStartSlurFromIndex(selectedNoteIndex)) return;
		pendingSlurStartIndex = selectedNoteIndex;
		closeNoteContextMenu();
	}

	function handleSetFingerFromMenu(finger: number | undefined) {
		if (selectedNoteIndex < 0) return;

		let runningIndex = 0;
		const nextMelody = config.getMelody().map((bar) =>
			bar.map((item) => {
				const isTarget = runningIndex === selectedNoteIndex;
				runningIndex += 1;

				if (!isTarget) return item;
				if (item.note === null) return { ...item, finger: undefined };

				return {
					...item,
					finger
				};
			})
		);

		config.setMelody(nextMelody);
		markEdited();
	}

	function handleSetTextFromMenu(text: string | undefined) {
		if (selectedNoteIndex < 0) return;

		let runningIndex = 0;
		const nextMelody = config.getMelody().map((bar) =>
			bar.map((item) => {
				const isTarget = runningIndex === selectedNoteIndex;
				runningIndex += 1;

				if (!isTarget) return item;

				return {
					...item,
					text
				};
			})
		);

		config.setMelody(nextMelody);
		markEdited();
	}

	function navigateSelectionHorizontally(step: -1 | 1) {
		if (sequence.length === 0) return;

		const rangeAnchor =
			selectedNoteRange !== null
				? step > 0
					? selectedNoteRange.to
					: selectedNoteRange.from
				: selectedNoteIndex;

		if (rangeAnchor < 0) {
			const initialIndex = step > 0 ? 0 : sequence.length - 1;
			selectedNoteIndex = initialIndex;
			selectedNoteRange = null;
			syncContextMenuToSelection(initialIndex);
			return;
		}

		const nextIndex = Math.max(0, Math.min(sequence.length - 1, rangeAnchor + step));
		if (nextIndex === rangeAnchor && selectedNoteRange === null) return;

		selectedNoteIndex = nextIndex;
		selectedNoteRange = null;
		syncContextMenuToSelection(nextIndex);
	}

	function cycleFingerMarkingAtFlatIndex(flatIndex: number) {
		if (flatIndex < 0) return;

		selectedNoteIndex = flatIndex;

		const currentItem = sequence[flatIndex];
		if (!currentItem || currentItem.note === null) return;

		const fingerCycle: Array<number | undefined> = [0, 1, 2, 3, 4, undefined];
		const currentFinger = currentItem.finger;
		const currentCycleIndex = fingerCycle.findIndex((value) => value === currentFinger);
		const nextFinger =
			currentCycleIndex === -1 ? 0 : fingerCycle[(currentCycleIndex + 1) % fingerCycle.length];

		handleSetFingerFromMenu(nextFinger);
	}

	function clearSlur(from: number, to: number) {
		let runningIndex = 0;
		const nextMelody = config.getMelody().map((bar) =>
			bar.map((item) => {
				const idx = runningIndex++;
				if (idx !== from && idx !== to) return item;

				const updated = { ...item };
				if (idx === from) delete updated.slurStart;
				if (idx === to) delete updated.slurEnd;
				return updated;
			})
		);

		config.setMelody(nextMelody);
		markEdited();
	}

	function handleToggleSlurFromMenu() {
		if (!selectedNoteRange) return;

		const { from, to } = selectedNoteRange;
		const shouldAdd = !rangeHasSlur;
		if (shouldAdd && !isValidSlurSpan(from, to)) return;

		let runningIndex = 0;
		const nextMelody = config.getMelody().map((bar) =>
			bar.map((item) => {
				const idx = runningIndex++;
				if (idx < from || idx > to) return item;

				const updated = { ...item };
				// Clear any existing slur markers within the range first
				delete updated.slurStart;
				delete updated.slurEnd;

				if (shouldAdd) {
					if (idx === from) updated.slurStart = true;
					if (idx === to) updated.slurEnd = true;
				}

				return updated;
			})
		);

		config.setMelody(nextMelody);
		markEdited();
	}

	function handleSingleNoteSlurAction() {
		if (selectedNoteIndex < 0) return;

		const slurRange = findSlurRangeAtIndex(sequence, selectedNoteIndex);
		if (slurRange) {
			clearSlur(slurRange.from, slurRange.to);
			return;
		}

		if (!canStartSlurFromIndex(selectedNoteIndex)) return;
		handleStartSlur();
	}

	function handleWindowPointerDown() {
		if (!isStaffPointerActive && pendingSlurStartIndex !== null) {
			pendingSlurStartIndex = null;
		}
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

	function handleEditorKeyDown(event: KeyboardEvent) {
		const contextMenu = noteContextMenu;
		const isContextMenuShortcut =
			contextMenu !== null &&
			selectedNoteRange === null &&
			!event.metaKey &&
			!event.ctrlKey &&
			!event.altKey;

		if (isEditableTarget(event.target)) return;

		if (event.key === 'Escape') {
			closeNoteContextMenu();
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

		if (isContextMenuShortcut && (event.key === 's' || event.key === 'S')) {
			event.preventDefault();
			if (selectedNoteRange !== null) {
				if (!rangeHasSlur && !canAddSlurToSelectedRange) return;
				handleToggleSlurFromMenu();
			} else {
				if (!selectedNoteSlurRange && !canStartSingleNoteSlur) return;
				selectedNoteIndex = contextMenu.index;
				handleSingleNoteSlurAction();
			}
			return;
		}

		if (isContextMenuShortcut && (event.key === 'f' || event.key === 'F')) {
			event.preventDefault();
			cycleFingerMarkingAtFlatIndex(contextMenu.index);
			return;
		}
	}

	function handleEditorKeyUp(event: KeyboardEvent) {
		const isContextMenuShortcut =
			noteContextMenu !== null && !event.metaKey && !event.ctrlKey && !event.altKey;
		if (
			isContextMenuShortcut &&
			(event.key === 'f' || event.key === 'F' || event.key === 's' || event.key === 'S')
		) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	return {
		selectedNoteIndex: () => selectedNoteIndex,
		selectedNoteRange: () => selectedNoteRange,
		selectedNoteSlurRange: () => selectedNoteSlurRange,
		pendingSlurStartIndex: () => pendingSlurStartIndex,
		rangeHasSlur: () => rangeHasSlur,
		canStartSingleNoteSlur: () => canStartSingleNoteSlur,
		canAddSlurToSelectedRange: () => canAddSlurToSelectedRange,
		noteContextMenu: () => noteContextMenu,
		isSmallScreen: () => isSmallScreen,
		selectedSequenceItem: () => selectedSequenceItem,
		selectedRangeItems: () => selectedRangeItems,
		handleStaffInteraction,
		handleSelectNoteFromStaff,
		handleOpenNoteContextMenu,
		handleStaffInteractionRelease,
		handleSetFingerFromMenu,
		handleSetTextFromMenu,
		handleStartSlur,
		handleSingleNoteSlurAction,
		handleToggleSlurFromMenu,
		handleEditorKeyDown,
		handleEditorKeyUp,
		handleWindowPointerDown,
		handleWindowScroll,
		handleContextMenuScrollIntoView
	};
}
