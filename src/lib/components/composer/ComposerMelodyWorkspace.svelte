<script lang="ts">
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import ComposerMelodyEditor from './ComposerMelodyEditor.svelte';
	import ComposerMelodyTechniqueEditor from './ComposerMelodyTechniqueEditor.svelte';
	import ComposerMelodyTestEditor from './ComposerMelodyTestEditor.svelte';
	import {
		COMPOSER_MELODY_MODE_OPTIONS,
		type ComposerMelodyMode,
		type ComposerMelodyPanelProps
	} from './composerMelodyTypes';

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

	let editorMode = $state<ComposerMelodyMode>('edit');

	function handleModeSelect(mode: ComposerMelodyMode) {
		editorMode = mode;
	}
</script>

<div class="space-y-4">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<p class="text-sm font-semibold tracking-wide text-brand-green uppercase">Melody editor</p>
			<p class="mt-1 text-sm text-slate-600">
				Switch between note editing, technique marking, and melody testing.
			</p>
		</div>
		<div class="self-start sm:self-center">
			<PillSelector
				options={COMPOSER_MELODY_MODE_OPTIONS}
				selected={editorMode}
				onSelect={handleModeSelect}
				ariaLabel="Select melody tool"
			/>
		</div>
	</div>

	{#if editorMode === 'edit'}
		<ComposerMelodyEditor
			{clef}
			bind:melody
			{instrumentId}
			{keySignature}
			{barLength}
			{availablePitches}
			{isPlayingMelodyPreview}
			{isMelodyPreviewMuted}
			{melodyPlayheadPosition}
			{lengthOptions}
			{onToggleMelodyPlayback}
			{onPlayMelodyFromStart}
			{onToggleMelodyMute}
			{onPreviewItem}
			{onEdit}
		/>
	{:else if editorMode === 'technique'}
		<ComposerMelodyTechniqueEditor />
	{:else}
		<ComposerMelodyTestEditor />
	{/if}
</div>
