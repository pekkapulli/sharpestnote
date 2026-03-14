<script lang="ts">
	interface Props {
		isMelodyPreviewMuted: boolean;
		isPlayingMelodyPreview: boolean;
		selectedNoteIndex?: number;
		onToggleMelodyMute: () => void;
		onPlayMelodyFromStart: () => void;
		onToggleMelodyPlayback: (startIndex?: number) => void;
	}

	let {
		isMelodyPreviewMuted,
		isPlayingMelodyPreview,
		selectedNoteIndex = undefined,
		onToggleMelodyMute,
		onPlayMelodyFromStart,
		onToggleMelodyPlayback
	}: Props = $props();
</script>

<div class="absolute right-2 flex items-center gap-2">
	<button
		type="button"
		title={isMelodyPreviewMuted ? 'Unmute synth preview' : 'Mute synth preview'}
		onclick={onToggleMelodyMute}
		class={`flex h-9 w-9 items-center justify-center rounded-full border transition hover:-translate-y-px hover:shadow sm:h-10 sm:w-10 ${
			isMelodyPreviewMuted
				? 'border-slate-300 bg-slate-200 text-slate-700 hover:bg-slate-300'
				: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
		}`}
		aria-label={isMelodyPreviewMuted ? 'Unmute synth preview' : 'Mute synth preview'}
		aria-pressed={isMelodyPreviewMuted}
	>
		{#if isMelodyPreviewMuted}
			<svg
				class="h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.8"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M11 5 6.5 9H4v6h2.5L11 19z" />
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 9l5 6" />
				<path stroke-linecap="round" stroke-linejoin="round" d="M20 9l-5 6" />
			</svg>
		{:else}
			<svg
				class="h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.8"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M11 5 6.5 9H4v6h2.5L11 19z" />
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3.5 3.5 0 0 1 0 3" />
				<path stroke-linecap="round" stroke-linejoin="round" d="M17.5 8a7 7 0 0 1 0 8" />
			</svg>
		{/if}
	</button>

	<button
		type="button"
		title="Play melody preview from start"
		onclick={onPlayMelodyFromStart}
		class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-500 transition hover:-translate-y-px hover:bg-slate-200 hover:text-dark-blue hover:shadow sm:h-10 sm:w-10"
		aria-label="Play melody preview from start"
		aria-disabled={isMelodyPreviewMuted}
	>
		<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<rect x="6" y="5" width="2" height="14" />
			<path d="M10 5v14l10-7z" />
		</svg>
	</button>

	<button
		type="button"
		title={isPlayingMelodyPreview ? 'Stop melody preview' : 'Play melody preview'}
		onclick={() => onToggleMelodyPlayback(selectedNoteIndex ?? undefined)}
		class={`flex h-9 w-9 items-center justify-center rounded-full transition hover:-translate-y-px hover:shadow sm:h-10 sm:w-10 ${
			isMelodyPreviewMuted
				? 'bg-slate-300 text-slate-600 hover:bg-slate-300'
				: 'bg-dark-blue text-off-white hover:bg-dark-blue-highlight'
		}`}
		aria-label={isPlayingMelodyPreview ? 'Stop melody preview' : 'Play melody preview'}
		aria-disabled={isMelodyPreviewMuted}
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
</div>
