<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { MAX_MELODY_BARS } from '../logic/composerMelodyEditorLogic';
	import ComposerMelodyEditorInstructions from '../controls/ComposerMelodyEditorInstructions.svelte';
	import ComposerMelodyPreviewControls from '../controls/ComposerMelodyPreviewControls.svelte';
	import {
		type NoteContextMenuHandle,
		type StaffContextMenuAnchorProvider,
		useComposerMelodyEditorLogic
	} from '../logic/useComposerMelodyEditorLogic.svelte';
	import ComposerStaff from '$lib/components/music/ComposerStaff.svelte';
	import ComposerNoteContextMenu from '../context-menus/ComposerNoteContextMenu.svelte';
	import type { ComposerMelodyPanelProps } from '../types/composerMelodyTypes';

	let {
		clef,
		melody = $bindable(),
		instrumentId,
		keySignature,
		barLength,
		availablePitches,
		isPlayingMelodyPreview,
		isMelodyPreviewMuted,
		melodyPlayheadPosition = null,
		lengthOptions,
		onToggleMelodyPlayback,
		onPlayMelodyFromStart,
		onToggleMelodyMute,
		onPreviewItem,
		onEdit
	}: ComposerMelodyPanelProps = $props();

	let noteContextMenuRef = $state<NoteContextMenuHandle | null>(null);
	let staffRef = $state<StaffContextMenuAnchorProvider | null>(null);

	const logic = useComposerMelodyEditorLogic({
		getClef: () => clef,
		getMelody: () => melody,
		setMelody: (nextMelody) => {
			melody = nextMelody;
		},
		getInstrumentId: () => instrumentId,
		getKeySignature: () => keySignature,
		getBarLength: () => barLength,
		getAvailablePitches: () => availablePitches,
		getLengthOptions: () => lengthOptions,
		getOnPreviewItem: () => onPreviewItem,
		getOnEdit: () => onEdit,
		getStaffRef: () => staffRef,
		getNoteContextMenuRef: () => noteContextMenuRef
	});

	const editorError = $derived(logic.editorError());
	const selectedNoteIndex = $derived(logic.selectedNoteIndex());
	const noteContextMenu = $derived(logic.noteContextMenu());
	const isSmallScreen = $derived(logic.isSmallScreen());
	const hasReachedMaxBars = $derived(logic.hasReachedMaxBars());
	const selectedSequenceItem = $derived(logic.selectedSequenceItem());
	const remainingInBarForSelected = $derived(logic.remainingInBarForSelected());
</script>

<svelte:window
	onkeydown={logic.handleEditorKeyDown}
	onkeyup={logic.handleEditorKeyUp}
	onpointerdown={logic.handleWindowPointerDown}
	onscroll={logic.handleWindowScroll}
/>

<div class="mt-4 flex flex-col gap-3">
	<ComposerMelodyEditorInstructions />
</div>

<div class="mt-4 p-3 sm:rounded-lg sm:border sm:border-slate-100 sm:bg-slate-50">
	<div
		class="mb-2 flex flex-wrap items-center justify-center gap-4 sm:mb-3 sm:flex-nowrap sm:justify-between"
	>
		<div class="flex flex-wrap items-center justify-center gap-2">
			<Button
				type="button"
				size="medium"
				variant="secondary"
				title="Clear melody and restore initial rests"
				onclick={logic.clearMelody}
			>
				Clear melody
			</Button>
			<Button
				type="button"
				size="medium"
				variant="secondary"
				title="Merge adjacent rests"
				onclick={logic.tidyUpRests}
			>
				Tidy up rests
			</Button>
		</div>
		<div class="flex flex-wrap items-center justify-center gap-2">
			<Button
				type="button"
				size="medium"
				variant="secondary"
				title="Remove last bar"
				onclick={logic.removeLastBar}
			>
				− Remove bar
			</Button>
			<Button
				type="button"
				size="medium"
				variant="secondary"
				title={hasReachedMaxBars ? `Maximum ${MAX_MELODY_BARS} bars reached` : 'Add new bar'}
				onclick={logic.addBar}
				disabled={hasReachedMaxBars}
			>
				+ Add bar
			</Button>
		</div>
		<div class="flex w-full justify-center sm:w-auto sm:justify-end">
			<ComposerMelodyPreviewControls
				{isMelodyPreviewMuted}
				{isPlayingMelodyPreview}
				{selectedNoteIndex}
				{onToggleMelodyMute}
				{onPlayMelodyFromStart}
				{onToggleMelodyPlayback}
			/>
		</div>
	</div>

	<ComposerStaff
		bind:this={staffRef}
		bars={melody}
		playheadPosition={melodyPlayheadPosition}
		{keySignature}
		{clef}
		{barLength}
		minWidth={isSmallScreen ? 200 : 400}
		minBarWidth={isSmallScreen ? 190 : 240}
		compactMode={isSmallScreen}
		pitchPalette={availablePitches}
		{selectedNoteIndex}
		isContextMenuOpen={noteContextMenu !== null}
		onInteraction={logic.handleStaffInteraction}
	/>

	{#if editorError}
		<p class="mt-2 text-sm font-medium text-red-700">{editorError}</p>
	{/if}

	{#if noteContextMenu && selectedSequenceItem}
		<ComposerNoteContextMenu
			bind:this={noteContextMenuRef}
			x={noteContextMenu.x}
			y={noteContextMenu.y}
			selectedItem={selectedSequenceItem}
			{lengthOptions}
			remainingInBar={remainingInBarForSelected}
			onChangeLength={logic.handleChangeLengthFromMenu}
			onSetItemKind={logic.handleSetItemKindFromMenu}
			onMoveDownSemitone={() => logic.moveSelectedNoteBySemitone(-1)}
			onMoveUpSemitone={() => logic.moveSelectedNoteBySemitone(1)}
			canMoveDownSemitone={logic.canMoveSelectedNoteBySemitone(-1)}
			canMoveUpSemitone={logic.canMoveSelectedNoteBySemitone(1)}
			onRequestScrollIntoView={logic.handleContextMenuScrollIntoView}
		/>
	{/if}
</div>
