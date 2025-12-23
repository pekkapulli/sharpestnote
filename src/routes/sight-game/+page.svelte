<script lang="ts">
	import { instrumentConfigs, defaultInstrumentId } from '$lib/config/instruments';
	import { keyOptions, modeOptions } from '$lib/config/keys';
	import type { InstrumentId } from '$lib/config/types';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { onMount } from 'svelte';

	let selectedInstrument = $state<InstrumentId>(defaultInstrumentId);
	let selectedKey = $state('C');
	let selectedMode = $state<'major' | 'natural_minor'>('major');

	const tuner = createTuner();

	onMount(() => {
		tuner.checkSupport();
	});

	function startGame() {
		window.location.href = `/sight-game/${selectedInstrument}/${selectedKey}/${selectedMode}`;
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-off-white">
	<div class="max-w-2xl text-center">
		<h1 class="mb-4">Sight Reading Game</h1>
		<p class="mb-8 text-slate-700">
			Play the melodies shown on the staff with your instrument in the selected key
		</p>

		<!-- Instrument selector -->
		<div class="mb-8">
			<label for="instrument" class="mb-3 block text-sm font-medium text-slate-700"
				>Select your instrument</label
			>
			<select
				id="instrument"
				bind:value={selectedInstrument}
				class="mx-auto block w-full max-w-sm rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
			>
				{#each instrumentConfigs as instrument}
					<option value={instrument.id}>{instrument.label}</option>
				{/each}
			</select>
		</div>

		<!-- Key + Mode selectors in a row -->
		<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-center">
			<div class="w-full sm:w-1/2">
				<label for="key" class="mb-3 block text-sm font-medium text-slate-700">Select key</label>
				<select
					bind:value={selectedKey}
					class="block w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
				>
					{#each keyOptions as keyOption}
						<option value={keyOption.value}>{keyOption.label}</option>
					{/each}
				</select>
			</div>
			<div class="w-full sm:w-1/2">
				<label for="mode" class="mb-3 block text-sm font-medium text-slate-700">Select mode</label>
				<select
					id="mode"
					bind:value={selectedMode}
					class="block w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
				>
					{#each modeOptions as option}
						<option value={option.mode}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>

		{#if tuner.state.error}
			<p class="mb-4 text-sm text-red-600">{tuner.state.error}</p>
		{/if}

		<button
			onclick={startGame}
			class="rounded-lg bg-dark-blue px-8 py-4 text-lg font-semibold text-white transition hover:-translate-y-px hover:shadow"
		>
			Start Game
		</button>
	</div>
</div>
