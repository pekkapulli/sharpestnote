import type { MelodyItem } from '$lib/config/melody';
import type { ComposerStaffInteraction } from '$lib/components/music/composerStaffTypes';

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
	const rangeHasSlur = $derived(
		selectedNoteRange !== null &&
			sequence[selectedNoteRange.from]?.slurStart === true &&
			sequence[selectedNoteRange.to]?.slurEnd === true
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
			case 'note-range-select':
				selectedNoteRange = { from: interaction.fromIndex, to: interaction.toIndex };
				noteContextMenu = null;
				return;
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
					if (selectedNoteIndex >= 0 && selectedNoteIndex !== pendingSlurStartIndex) {
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
		if (selectedNoteIndex < 0) return;
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

	return {
		selectedNoteIndex: () => selectedNoteIndex,
		selectedNoteRange: () => selectedNoteRange,
		selectedNoteSlurRange: () => selectedNoteSlurRange,
		pendingSlurStartIndex: () => pendingSlurStartIndex,
		rangeHasSlur: () => rangeHasSlur,
		noteContextMenu: () => noteContextMenu,
		isSmallScreen: () => isSmallScreen,
		selectedSequenceItem: () => selectedSequenceItem,
		selectedRangeItems: () => selectedRangeItems,
		handleStaffInteraction,
		handleSelectNoteFromStaff,
		handleOpenNoteContextMenu,
		handleStaffInteractionRelease,
		handleSetFingerFromMenu,
		handleStartSlur,
		handleSingleNoteSlurAction,
		handleToggleSlurFromMenu,
		handleWindowPointerDown,
		handleWindowScroll,
		handleContextMenuScrollIntoView
	};
}
