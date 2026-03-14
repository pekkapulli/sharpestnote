<script lang="ts">
	import { onMount } from 'svelte';
	import ComposerContextMenuShell from './ComposerContextMenuShell.svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import type { MelodyItem } from '$lib/config/melody';
	import { isTouchDevice } from '$lib/util/isTouchDevice';

	interface Props {
		x: number;
		y: number;
		selectedItem: MelodyItem | null;
		selectedNoteRange?: { from: number; to: number } | null;
		selectedNoteSlurRange?: { from: number; to: number } | null;
		rangeHasSlur?: boolean;
		canStartSingleNoteSlur?: boolean;
		canAddSlurToSelectedRange?: boolean;
		onSetFinger: (finger: number | undefined) => void;
		onStartSlur?: () => void;
		onToggleSlur?: () => void;
		onRequestScrollIntoView?: (deltaY: number) => void;
	}

	type FingerOption = 'empty' | '0' | '1' | '2' | '3' | '4';
	type ContextMenuShellHandle = {
		scrollIntoViewIfNeeded: () => void;
	};

	let {
		x,
		y,
		selectedItem,
		selectedNoteRange = null,
		selectedNoteSlurRange = null,
		rangeHasSlur = false,
		canStartSingleNoteSlur = false,
		canAddSlurToSelectedRange = false,
		onSetFinger,
		onStartSlur,
		onToggleSlur,
		onRequestScrollIntoView
	}: Props = $props();

	let shellRef = $state<ContextMenuShellHandle | null>(null);
	let showShortcutHints = $state(false);

	const isRangeMode = $derived(selectedNoteRange !== null);
	const isRestItem = $derived(!isRangeMode && selectedItem?.note === null);
	const isSelectedNoteInSlur = $derived(selectedNoteSlurRange !== null);
	const isRangeSlurToggleDisabled = $derived(!rangeHasSlur && !canAddSlurToSelectedRange);
	const isSingleSlurToggleDisabled = $derived(!isSelectedNoteInSlur && !canStartSingleNoteSlur);
	const selectedFingerOption = $derived.by((): FingerOption => {
		if (isRangeMode || isRestItem || !selectedItem) return 'empty';
		if (selectedItem.finger === undefined) return 'empty';

		const normalized = Math.max(0, Math.min(4, selectedItem.finger));
		return String(normalized) as FingerOption;
	});

	function handleFingerChange(value: FingerOption) {
		onSetFinger(value === 'empty' ? undefined : Number(value));
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
	menuClass="technique-context-menu"
	{onRequestScrollIntoView}
>
	{#if isRangeMode}
		<div class="technique-context-actions">
			<p class="mb-1! text-xs text-slate-500">
				{selectedNoteRange!.to - selectedNoteRange!.from + 1} notes selected
			</p>
			<button
				class="slur-toggle"
				class:slur-toggle--active={rangeHasSlur}
				onclick={onToggleSlur}
				disabled={isRangeSlurToggleDisabled}
				aria-pressed={rangeHasSlur}
				title={showShortcutHints ? 'Shortcut: S' : undefined}
			>
				<span class="slur-icon" aria-hidden="true">⌢</span>
				Slur
				{#if showShortcutHints}
					<span class="shortcut">S</span>
				{/if}
			</button>
			{#if isRangeSlurToggleDisabled}
				<p class="disabled-help-note">Slur must stay in one bar and cannot include rests.</p>
			{/if}
		</div>
	{:else if isRestItem}
		<p class="technique-context-info">Technique applies to notes only.</p>
	{:else}
		<div class="technique-context-actions">
			<p class="mb-1! text-xs text-slate-500">Finger:</p>
			<PillSelector
				options={[
					{ value: 'empty', label: 'Empty' },
					{ value: '0', label: '0' },
					{ value: '1', label: '1' },
					{ value: '2', label: '2' },
					{ value: '3', label: '3' },
					{ value: '4', label: '4' }
				]}
				selected={selectedFingerOption}
				onSelect={handleFingerChange}
				ariaLabel="Set finger number"
			/>
			{#if showShortcutHints}
				<div class="technique-context-shortcut" aria-hidden="true">
					<span class="shortcut">F</span>
				</div>
			{/if}
		</div>
		<hr class="technique-divider" />
		<button
			class="slur-toggle"
			onclick={onStartSlur}
			disabled={isSingleSlurToggleDisabled}
			title={showShortcutHints ? 'Shortcut: S' : undefined}
		>
			<span class="slur-icon" aria-hidden="true">⌢</span>
			{isSelectedNoteInSlur ? 'Remove slur' : 'Start slur'}
			{#if showShortcutHints}
				<span class="shortcut">S</span>
			{/if}
		</button>
		{#if isSingleSlurToggleDisabled}
			<p class="disabled-help-note">
				Choose a note with another note right after it in the same bar.
			</p>
		{/if}
	{/if}
</ComposerContextMenuShell>

<style>
	:global(.technique-context-menu) {
		min-width: 280px;
		padding: 12px;
	}

	.technique-context-actions {
		position: relative;
	}

	.technique-context-shortcut {
		position: absolute;
		top: 0;
		right: 8px;
		display: inline-flex;
		pointer-events: none;
	}

	.technique-context-info {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 500;
		color: #64748b;
	}

	.technique-divider {
		margin: 10px 0 8px;
		border: none;
		border-top: 1px solid #e2e8f0;
	}

	.slur-toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 4px;
		padding: 6px 14px;
		border: 1.5px solid #cbd5e1;
		border-radius: 999px;
		background: #f8fafc;
		font-size: 0.82rem;
		font-weight: 600;
		color: #475569;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s,
			color 0.15s;
	}

	.slur-toggle:hover {
		border-color: #16a34a;
		color: #16a34a;
	}

	.slur-toggle:disabled {
		cursor: not-allowed;
		opacity: 0.45;
		border-color: #cbd5e1;
		color: #94a3b8;
		background: #f8fafc;
	}

	.slur-toggle:disabled:hover {
		border-color: #cbd5e1;
		color: #94a3b8;
	}

	.slur-toggle--active {
		background: #dcfce7;
		border-color: #16a34a;
		color: #16a34a;
	}

	.slur-icon {
		font-size: 1.1rem;
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

	.disabled-help-note {
		margin: 0.45rem 0 0;
		font-size: 0.74rem;
		line-height: 1.25;
		color: #64748b;
	}

	@media (max-width: 640px) {
		:global(.technique-context-menu) {
			min-width: 240px;
		}
	}
</style>
