<script lang="ts">
	import { onMount } from 'svelte';
	import ComposerContextMenuShell from './ComposerContextMenuShell.svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import {
		lengthRestMap,
		lengthToNoteMap,
		type MelodyItem,
		type NoteLength
	} from '$lib/config/melody';
	import { isTouchDevice } from '$lib/util/isTouchDevice';

	interface Props {
		x: number;
		y: number;
		selectedItem: MelodyItem;
		lengthOptions: NoteLength[];
		remainingInBar?: number;
		onChangeLength: (length: NoteLength) => void;
		onSetItemKind: (kind: 'note' | 'rest') => void;
		onMoveDownSemitone: () => void;
		onMoveUpSemitone: () => void;
		canMoveDownSemitone: boolean;
		canMoveUpSemitone: boolean;
		onRequestScrollIntoView?: (deltaY: number) => void;
	}

	type ContextMenuShellHandle = {
		scrollIntoViewIfNeeded: () => void;
	};

	let {
		x,
		y,
		selectedItem,
		lengthOptions,
		remainingInBar = Infinity,
		onChangeLength,
		onSetItemKind,
		onMoveDownSemitone,
		onMoveUpSemitone,
		canMoveDownSemitone,
		canMoveUpSemitone,
		onRequestScrollIntoView
	}: Props = $props();

	let shellRef = $state<ContextMenuShellHandle | null>(null);
	let showShortcutHints = $state(false);

	const isRestItem = $derived(selectedItem.note === null);

	function getLengthGlyph(length: NoteLength): string {
		const glyphMap = isRestItem ? lengthRestMap : lengthToNoteMap;
		const direct = glyphMap[length];
		if (direct) return direct;

		if (length === 3) return `${glyphMap[2]}.`;
		if (length === 6) return `${glyphMap[4]}.`;
		if (length === 12) return `${glyphMap[8]}.`;

		return String(length);
	}

	export function scrollIntoViewIfNeeded() {
		shellRef?.scrollIntoViewIfNeeded();
	}

	onMount(() => {
		showShortcutHints = !isTouchDevice();
	});
</script>

<ComposerContextMenuShell
	bind:this={shellRef}
	{x}
	{y}
	menuClass="note-context-menu"
	{onRequestScrollIntoView}
>
	<div class="note-context-menu-lengths">
		{#each lengthOptions as length, index (length)}
			<button
				type="button"
				class="note-context-chip"
				class:is-active={selectedItem.length === length}
				disabled={length > remainingInBar}
				onclick={() => onChangeLength(length)}
				title={showShortcutHints ? `Shortcut: ${index + 1}` : undefined}
			>
				{#if showShortcutHints}
					<span class="shortcut">{index + 1}</span>
				{/if}
				<span class="note">{getLengthGlyph(length)}</span>
			</button>
		{/each}
	</div>
	<div class="note-context-menu-actions">
		<PillSelector
			options={[
				{ value: 'note', label: 'Note' },
				{ value: 'rest', label: 'Rest' }
			]}
			selected={isRestItem ? 'rest' : 'note'}
			onSelect={onSetItemKind}
			ariaLabel="Toggle note or rest"
		/>
		{#if showShortcutHints}
			<div class="note-context-shortcut-overlay" aria-hidden="true">
				<span class="shortcut">Space</span>
			</div>
		{/if}
	</div>
	<div class="note-context-menu-actions">
		<div class="note-context-semitone-row">
			<button
				type="button"
				class="note-context-chip note-context-semitone-button"
				disabled={!canMoveDownSemitone}
				onclick={onMoveDownSemitone}
				title={showShortcutHints ? 'Shortcut: ArrowDown' : undefined}
			>
				<span class="note-context-semitone-label">Down</span>
				{#if showShortcutHints}
					<span class="shortcut">↓</span>
				{/if}
			</button>
			<button
				type="button"
				class="note-context-chip note-context-semitone-button"
				disabled={!canMoveUpSemitone}
				onclick={onMoveUpSemitone}
				title={showShortcutHints ? 'Shortcut: ArrowUp' : undefined}
			>
				<span class="note-context-semitone-label">Up</span>
				{#if showShortcutHints}
					<span class="shortcut">↑</span>
				{/if}
			</button>
		</div>
	</div>
</ComposerContextMenuShell>

<style>
	:global(.note-context-menu) {
		min-width: 280px;
		padding: 34px 10px 10px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.note-context-menu-lengths {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 6px;
	}

	.note-context-chip {
		position: relative;
		padding: 3px 4px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.74rem;
		font-weight: 600;
		color: #334155;
		background: #f8fafc;
	}

	.note-context-chip :global(.note) {
		font-size: 1.35rem;
		line-height: 1;
	}

	.shortcut {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.15rem 0.4rem;
		border: 1px solid #cbd5e1;
		border-radius: 999px;
		background: #f8fafc;
		font-size: 0.62rem;
		line-height: 1.1;
		font-weight: 700;
		color: #64748b;
	}

	.note-context-chip .shortcut {
		position: absolute;
		top: 2px;
		right: 4px;
		padding: 0.05rem 0.3rem;
		font-size: 0.58rem;
	}

	.note-context-shortcut-overlay {
		position: absolute;
		top: 8px;
		right: 8px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		pointer-events: none;
	}

	.note-context-chip:hover:not(:disabled) {
		background: #e2e8f0;
	}

	.note-context-chip:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.note-context-chip.is-active {
		border-color: #22c55e;
		background: #dcfce7;
		color: #166534;
	}

	.note-context-menu-actions {
		position: relative;
		display: grid;
		grid-template-columns: 1fr;
		margin-top: 10px;
	}

	.note-context-semitone-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
	}

	.note-context-semitone-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 7px 10px;
	}

	.note-context-semitone-button .shortcut {
		position: static;
		padding: 0.12rem 0.32rem;
		font-size: 0.62rem;
	}

	.note-context-semitone-label {
		font-size: 0.76rem;
		font-weight: 700;
	}

	@media (max-width: 640px) {
		:global(.note-context-menu) {
			min-width: 240px;
		}
	}
</style>
