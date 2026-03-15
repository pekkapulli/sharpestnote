<script lang="ts">
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import ComposerMelodyPreviewControls from './controls/ComposerMelodyPreviewControls.svelte';
	import ComposerMelodyEditor from './panels/ComposerMelodyEditor.svelte';
	import ComposerMelodyTechniqueEditor from './panels/ComposerMelodyTechniqueEditor.svelte';
	import ComposerMelodyTestEditor from './panels/ComposerMelodyTestEditor.svelte';
	import {
		COMPOSER_MELODY_MODE_OPTIONS,
		type ComposerMelodyMode,
		type ComposerMelodyPanelProps
	} from './types/composerMelodyTypes';

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

	const modeHeading = $derived(
		editorMode === 'technique' ? 'Technique' : editorMode === 'test' ? 'Test' : 'Edit'
	);
	const modeDescription = $derived(
		editorMode === 'technique'
			? 'Set up playing details for the melody.'
			: editorMode === 'test'
				? 'Try the melody with your instrument.'
				: 'Build the melody structure and note content here.'
	);
</script>

<div class="composer-melody-workspace space-y-4">
	<div class="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl">
		<div class="flex flex-col gap-3">
			<div>
				<h2 class="mt-0 mb-6 text-xl font-semibold text-slate-900 sm:mb-0">{modeHeading}</h2>
				<p class="text-sm text-slate-600">{modeDescription}</p>
				<p class="text-sm text-slate-600">
					Switch between note editing (create the melody) and technique marking (edit markings and
					add slurs).
				</p>
			</div>
		</div>
		<div class="absolute top-4 right-2 flex items-center gap-2 self-start">
			<PillSelector
				options={COMPOSER_MELODY_MODE_OPTIONS}
				selected={editorMode}
				onSelect={handleModeSelect}
				ariaLabel="Select melody tool"
			/>
		</div>

		<div class="relative">
			{#if editorMode !== 'test'}
				<ComposerMelodyPreviewControls
					{isMelodyPreviewMuted}
					{isPlayingMelodyPreview}
					{onToggleMelodyMute}
					{onPlayMelodyFromStart}
					{onToggleMelodyPlayback}
				/>
			{/if}
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
				<ComposerMelodyTechniqueEditor
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
					{onEdit}
				/>
			{:else}
				<ComposerMelodyTestEditor />
			{/if}
		</div>
	</div>
</div>

<style>
	.composer-melody-workspace :global(button),
	.composer-melody-workspace :global([role='button']),
	.composer-melody-workspace :global([role='tab']),
	.composer-melody-workspace :global(input),
	.composer-melody-workspace :global(select),
	.composer-melody-workspace :global(textarea) {
		touch-action: manipulation;
	}
</style>
