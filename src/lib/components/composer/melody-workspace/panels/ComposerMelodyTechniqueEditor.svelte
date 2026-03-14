<script lang="ts">
	import ComposerMelodyTechniqueEditorInstructions from '../controls/ComposerMelodyTechniqueEditorInstructions.svelte';
	import {
		type TechniqueContextMenuHandle,
		type StaffContextMenuAnchorProvider,
		useComposerMelodyTechniqueEditorLogic
	} from '../logic/useComposerMelodyTechniqueEditorLogic.svelte';
	import ComposerStaff from '$lib/components/music/ComposerStaff.svelte';
	import ComposerTechniqueContextMenu from '../context-menus/ComposerTechniqueContextMenu.svelte';
	import type { ComposerMelodyPanelProps } from '../types/composerMelodyTypes';

	let {
		clef,
		melody = $bindable(),
		keySignature,
		barLength,
		melodyPlayheadPosition = null,
		onEdit
	}: ComposerMelodyPanelProps = $props();

	let noteContextMenuRef = $state<TechniqueContextMenuHandle | null>(null);
	let staffRef = $state<StaffContextMenuAnchorProvider | null>(null);

	const logic = useComposerMelodyTechniqueEditorLogic({
		getMelody: () => melody,
		setMelody: (nextMelody) => {
			melody = nextMelody;
		},
		getOnEdit: () => onEdit,
		getStaffRef: () => staffRef,
		getNoteContextMenuRef: () => noteContextMenuRef
	});

	const selectedNoteIndex = $derived(logic.selectedNoteIndex());
	const selectedNoteRange = $derived(logic.selectedNoteRange());
	const selectedNoteSlurRange = $derived(logic.selectedNoteSlurRange());
	const pendingSlurStartIndex = $derived(logic.pendingSlurStartIndex());
	const rangeHasSlur = $derived(logic.rangeHasSlur());
	const canStartSingleNoteSlur = $derived(logic.canStartSingleNoteSlur());
	const canAddSlurToSelectedRange = $derived(logic.canAddSlurToSelectedRange());
	const noteContextMenu = $derived(logic.noteContextMenu());
	const isSmallScreen = $derived(logic.isSmallScreen());
	const selectedSequenceItem = $derived(logic.selectedSequenceItem());
</script>

<svelte:window
	onkeydown={logic.handleEditorKeyDown}
	onkeyup={logic.handleEditorKeyUp}
	onpointerdown={logic.handleWindowPointerDown}
	onscroll={logic.handleWindowScroll}
/>

<div class="mt-4 flex flex-col gap-3">
	<ComposerMelodyTechniqueEditorInstructions />
</div>

<div class="mt-4 p-3 sm:rounded-lg sm:border sm:border-slate-100 sm:bg-slate-50">
	{#if pendingSlurStartIndex !== null}
		<p class="mb-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
			⌢ Tap the last note of the slur (in the same bar).
		</p>
	{/if}
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
		{selectedNoteIndex}
		{selectedNoteRange}
		isContextMenuOpen={noteContextMenu !== null}
		enablePitchDrag={false}
		onInteraction={logic.handleStaffInteraction}
	/>

	{#if noteContextMenu && (selectedSequenceItem || selectedNoteRange)}
		<ComposerTechniqueContextMenu
			bind:this={noteContextMenuRef}
			x={noteContextMenu.x}
			y={noteContextMenu.y}
			selectedItem={selectedSequenceItem}
			{selectedNoteRange}
			{selectedNoteSlurRange}
			{rangeHasSlur}
			{canStartSingleNoteSlur}
			{canAddSlurToSelectedRange}
			onSetFinger={logic.handleSetFingerFromMenu}
			onStartSlur={logic.handleSingleNoteSlurAction}
			onToggleSlur={logic.handleToggleSlurFromMenu}
			onRequestScrollIntoView={logic.handleContextMenuScrollIntoView}
		/>
	{/if}
</div>
