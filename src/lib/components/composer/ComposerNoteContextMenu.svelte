<script lang="ts">
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import {
		lengthRestMap,
		lengthToNoteMap,
		type MelodyItem,
		type NoteLength
	} from '$lib/config/melody';

	interface Props {
		x: number;
		y: number;
		selectedItem: MelodyItem;
		defaultFinger?: number;
		lengthOptions: NoteLength[];
		remainingInBar?: number;
		onChangeLength: (length: NoteLength) => void;
		onSetItemKind: (kind: 'note' | 'rest') => void;
		onSetFinger: (finger: number | undefined) => void;
	}

	type FingerOption = 'empty' | '0' | '1' | '2' | '3' | '4';

	let {
		x,
		y,
		selectedItem,
		defaultFinger,
		lengthOptions,
		remainingInBar = Infinity,
		onChangeLength,
		onSetItemKind,
		onSetFinger
	}: Props = $props();

	const isRestItem = $derived(selectedItem.note === null);
	const selectedFingerOption = $derived.by((): FingerOption => {
		if (isRestItem) return 'empty';

		const effectiveFinger = selectedItem.finger ?? defaultFinger;
		if (effectiveFinger === undefined) return 'empty';

		const normalized = Math.max(0, Math.min(4, effectiveFinger));
		return String(normalized) as FingerOption;
	});

	function getLengthGlyph(length: NoteLength): string {
		const glyphMap = isRestItem ? lengthRestMap : lengthToNoteMap;
		const direct = glyphMap[length];
		if (direct) return direct;

		if (length === 3) return `${glyphMap[2]}.`;
		if (length === 6) return `${glyphMap[4]}.`;
		if (length === 12) return `${glyphMap[8]}.`;

		return String(length);
	}

	function handleFingerChange(value: FingerOption) {
		onSetFinger(value === 'empty' ? undefined : Number(value));
	}
</script>

<div
	class="note-context-menu"
	style={`left: ${x}px; top: ${y}px;`}
	role="presentation"
	onpointerdown={(event) => event.stopPropagation()}
>
	<div class="note-context-menu-lengths">
		{#each lengthOptions as length (length)}
			<button
				type="button"
				class="note-context-chip"
				class:is-active={selectedItem.length === length}
				disabled={length > remainingInBar}
				onclick={() => onChangeLength(length)}
			>
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
	</div>
	{#if !isRestItem}
		<div>
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
		</div>
	{/if}
</div>

<style>
	.note-context-menu {
		position: fixed;
		z-index: 60;
		min-width: 280px;
		padding: 10px;
		border: 1px solid #cbd5e1;
		border-radius: 12px;
		background: #ffffff;
		box-shadow: 0 16px 40px rgba(15, 23, 42, 0.2);
		transform: translate(-50%, calc(-100% - 22px));
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.note-context-menu::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -7px;
		width: 12px;
		height: 12px;
		background: #ffffff;
		border-right: 1px solid #cbd5e1;
		border-bottom: 1px solid #cbd5e1;
		transform: translateX(-50%) rotate(45deg);
	}

	.note-context-menu-lengths {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 6px;
	}

	.note-context-chip {
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
		display: grid;
		grid-template-columns: 1fr;
		gap: 8px;
		margin-top: 10px;
	}

	@media (max-width: 640px) {
		.note-context-menu {
			min-width: 240px;
		}

		.note-context-menu-lengths {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
