<script lang="ts">
	import type { Mode, NoteName } from '$lib/config/keys';
	import type { InstrumentId, Piece } from '$lib/config/types';
	import { instrumentConfigs } from '$lib/config/instruments';
	import type { NoteLength } from '$lib/config/melody';

	interface Props {
		pieceLabel?: string;
		pieceCode: string;
		instrumentId?: InstrumentId;
		pieceKey?: NoteName;
		pieceMode?: Mode;
		selectedTimeSignature?: string;
		fastTempo?: string;
		noteOptions: NoteName[];
		modeOptions: Mode[];
		timeSignatureOptions: Array<{ label: string; barLength: NoteLength }>;
		inferredTempiPreview?: Piece['practiceTempi'];
	}

	let {
		pieceLabel = $bindable(''),
		pieceCode,
		instrumentId = $bindable('violin' as InstrumentId),
		pieceKey = $bindable('C' as NoteName),
		pieceMode = $bindable('major' as Mode),
		selectedTimeSignature = $bindable('4/4'),
		fastTempo = $bindable(''),
		noteOptions,
		modeOptions,
		timeSignatureOptions,
		inferredTempiPreview
	}: Props = $props();
</script>

<section
	class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4"
>
	<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
		Label
		<input bind:value={pieceLabel} class="rounded-md border border-slate-300 px-3 py-2" />
	</label>
	<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
		Code (from label)
		<input
			readonly
			value={pieceCode}
			class="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-700"
		/>
	</label>

	<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
		Instrument
		<select bind:value={instrumentId} class="rounded-md border border-slate-300 px-3 py-2">
			{#each instrumentConfigs as instrument (instrument.id)}
				<option value={instrument.id}>{instrument.label} ({instrument.clef})</option>
			{/each}
		</select>
	</label>
	<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
		Key
		<select bind:value={pieceKey} class="rounded-md border border-slate-300 px-3 py-2">
			{#each noteOptions as note (note)}
				<option value={note}>{note}</option>
			{/each}
		</select>
	</label>
	<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
		Mode
		<select bind:value={pieceMode} class="rounded-md border border-slate-300 px-3 py-2">
			{#each modeOptions as mode (mode)}
				<option value={mode}>{mode.replace('_', ' ')}</option>
			{/each}
		</select>
	</label>
	<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
		Time signature
		<select bind:value={selectedTimeSignature} class="rounded-md border border-slate-300 px-3 py-2">
			{#each timeSignatureOptions as option (option.label)}
				<option value={option.label}>{option.label}</option>
			{/each}
		</select>
	</label>
	<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
		Base tempo (fast)
		<input
			bind:value={fastTempo}
			type="number"
			min="1"
			class="rounded-md border border-slate-300 px-3 py-2"
		/>
		{#if inferredTempiPreview}
			<span class="text-xs text-slate-500">
				Inferred: slow {inferredTempiPreview.slow}, medium {inferredTempiPreview.medium}, fast
				{inferredTempiPreview.fast}
			</span>
		{:else}
			<span class="text-xs text-slate-500">Leave empty to omit practice tempi.</span>
		{/if}
	</label>
</section>
