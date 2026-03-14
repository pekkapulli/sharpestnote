<script lang="ts">
	import ComposerMelodyPreviewControls from '../controls/ComposerMelodyPreviewControls.svelte';
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
		isPlayingMelodyPreview,
		isMelodyPreviewMuted,
		melodyPlayheadPosition = null,
		onToggleMelodyPlayback,
		onPlayMelodyFromStart,
		onToggleMelodyMute,
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
	const noteContextMenu = $derived(logic.noteContextMenu());
	const isSmallScreen = $derived(logic.isSmallScreen());
	const selectedSequenceItem = $derived(logic.selectedSequenceItem());
</script>

<svelte:window onpointerdown={logic.handleWindowPointerDown} onscroll={logic.handleWindowScroll} />

<div
	class="relative rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:rounded-2xl sm:p-5"
>
	<ComposerMelodyPreviewControls
		{isMelodyPreviewMuted}
		{isPlayingMelodyPreview}
		{selectedNoteIndex}
		{onToggleMelodyMute}
		{onPlayMelodyFromStart}
		{onToggleMelodyPlayback}
	/>

	<div class="flex flex-col gap-3 pr-32 sm:pr-40">
		<div>
			<h2 class="text-lg font-semibold text-slate-900 sm:text-xl">Technique</h2>
			<p class="mt-1 text-sm text-slate-600">Set up playing details for the melody.</p>
		</div>
	</div>

	<div class="mt-6 p-3 sm:rounded-lg sm:border sm:border-slate-100 sm:bg-slate-50">
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
			isContextMenuOpen={noteContextMenu !== null}
			enablePitchDrag={false}
			onInteraction={logic.handleStaffInteraction}
		/>

		{#if noteContextMenu && selectedSequenceItem}
			<ComposerTechniqueContextMenu
				bind:this={noteContextMenuRef}
				x={noteContextMenu.x}
				y={noteContextMenu.y}
				selectedItem={selectedSequenceItem}
				onSetFinger={logic.handleSetFingerFromMenu}
				onRequestScrollIntoView={logic.handleContextMenuScrollIntoView}
			/>
		{/if}
	</div>
</div>
