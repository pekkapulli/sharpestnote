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
	let selectedNoteIndex = $state(-1);
	let noteContextMenu = $state<{ index: number; x: number; y: number } | null>(null);
	let isSmallScreen = $state(false);
	let pendingContextMenuVisibilityCheck = $state(false);

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

	function handleSelectNoteFromStaff(index: number) {
		selectedNoteIndex = index;
		syncContextMenuToSelection(index);
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
			case 'note-activate':
				handleOpenNoteContextMenu({
					index: interaction.index,
					x: interaction.x,
					y: interaction.y
				});
				return;
			case 'interaction-end':
				handleStaffInteractionRelease();
				return;
			default:
				return;
		}
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

	return {
		selectedNoteIndex: () => selectedNoteIndex,
		noteContextMenu: () => noteContextMenu,
		isSmallScreen: () => isSmallScreen,
		selectedSequenceItem: () => selectedSequenceItem,
		handleStaffInteraction,
		handleSelectNoteFromStaff,
		handleOpenNoteContextMenu,
		handleStaffInteractionRelease,
		handleSetFingerFromMenu,
		handleWindowPointerDown,
		handleWindowScroll,
		handleContextMenuScrollIntoView
	};
}
