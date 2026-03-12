<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { Clef } from '$lib/config/types';
	import type { KeySignature } from '$lib/config/keys';
	import type { MelodyItem, NoteLength } from '$lib/config/melody';
	import ComposerStaff from '$lib/components/music/ComposerStaff.svelte';
	import ComposerNoteContextMenu from '$lib/components/composer/ComposerNoteContextMenu.svelte';

	interface Props {
		clef: Clef;
		melodyBars: MelodyItem[][];
		keySignature: KeySignature;
		barLength: number;
		availablePitches: string[];
		selectedNoteIndex: number;
		editorError: string;
		noteContextMenu: { index: number; x: number; y: number } | null;
		selectedSequenceItem: MelodyItem | null;
		selectedItemDefaultFinger: number | undefined;
		isPlayingMelodyPreview: boolean;
		lengthOptions: NoteLength[];
		onToggleMelodyPlayback: () => void;
		onRemoveBar: () => void;
		onAddBar: () => void;
		onMoveNote: (index: number, note: string) => void;
		onAddNote: (note: string) => void;
		onSelectNote: (index: number) => void;
		onOpenNoteContextMenu: (payload: { index: number; x: number; y: number }) => void;
		onChangeLengthFromMenu: (length: NoteLength) => void;
		onSetItemKindFromMenu: (kind: 'note' | 'rest') => void;
		onSetFingerFromMenu: (finger: number | undefined) => void;
	}

	let {
		clef,
		melodyBars,
		keySignature,
		barLength,
		availablePitches,
		selectedNoteIndex,
		editorError,
		noteContextMenu,
		selectedSequenceItem,
		selectedItemDefaultFinger,
		isPlayingMelodyPreview,
		lengthOptions,
		onToggleMelodyPlayback,
		onRemoveBar,
		onAddBar,
		onMoveNote,
		onAddNote,
		onSelectNote,
		onOpenNoteContextMenu,
		onChangeLengthFromMenu,
		onSetItemKindFromMenu,
		onSetFingerFromMenu
	}: Props = $props();

	const remainingInBarForSelected = $derived.by(() => {
		if (!noteContextMenu) return barLength;
		const flatIndex = noteContextMenu.index;
		let cursor = 0;
		for (const bar of melodyBars) {
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
	<div class="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700"></div>

	<div class="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-3">
		<ComposerStaff
			bars={melodyBars}
			{keySignature}
			{clef}
			{barLength}
			minBarWidth={280}
			pitchPalette={availablePitches}
			{selectedNoteIndex}
			{onMoveNote}
			{onAddNote}
			{onSelectNote}
			{onOpenNoteContextMenu}
		/>

		<div class="mt-4 flex justify-center gap-3">
			<Button type="button" size="medium" title="Remove last bar" onclick={onRemoveBar}>
				− remove bar
			</Button>
			<Button type="button" size="medium" title="Add new bar" onclick={onAddBar}>+ add bar</Button>
		</div>
		{#if editorError}
			<p class="mt-2 text-sm font-medium text-red-700">{editorError}</p>
		{/if}

		{#if noteContextMenu && selectedSequenceItem}
			<ComposerNoteContextMenu
				x={noteContextMenu.x}
				y={noteContextMenu.y}
				selectedItem={selectedSequenceItem}
				defaultFinger={selectedItemDefaultFinger}
				{lengthOptions}
				remainingInBar={remainingInBarForSelected}
				onChangeLength={onChangeLengthFromMenu}
				onSetItemKind={onSetItemKindFromMenu}
				onSetFinger={onSetFingerFromMenu}
			/>
		{/if}
	</div>
</div>
