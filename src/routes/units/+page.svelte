<script lang="ts">
	import { units } from '$lib/config/units';
	import type { InstrumentId } from '$lib/config/types';
	import UnitGrid from '$lib/components/ui/UnitGrid.svelte';
	import { sharePreviewStore } from '$lib/stores/sharePreview';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		const origin = data.origin || window.location.origin;
		sharePreviewStore.set({
			title: 'Units - The Sharpest Note',
			description:
				'Practice materials with accompaniment tracks and interactive games for beginner musicians',
			type: 'website',
			image: `${origin}/og-logo.png`,
			url: `${origin}${data.pathname}`
		});
	});

	let selectedInstrument = $state<InstrumentId | 'all'>('all');

	const allUnits = Object.values(units).filter((unit) => unit.published);

	const filteredUnits = $derived(
		selectedInstrument === 'all'
			? allUnits
			: allUnits.filter((unit) => unit.instrument === selectedInstrument)
	);

	const instruments = new Set<InstrumentId>();
	allUnits.forEach((unit) => instruments.add(unit.instrument));
</script>

<div class="min-h-screen bg-off-white px-4 py-12">
	<div class="mx-auto w-full max-w-5xl">
		<h1 class="text-4xl font-semibold text-slate-900">Units on The Sharpest Note</h1>
		<p class="mt-3 text-lg text-slate-700">
			Practice materials with accompaniment tracks and interactive games.
		</p>
		<p class="mt-3 text-lg font-bold text-slate-700">
			We're launching soon. In the meantime, try the demo unit and join the mailing list on <a
				href="https://sharpestnote.gumroad.com">Gumroad</a
			>!
		</p>

		<!-- Filter by instrument -->
		<!-- <div class="mt-8">
			<label for="instrument-filter" class="text-sm font-semibold text-slate-800"
				>Filter by Instrument</label
			>
			<div class="mt-2 flex flex-wrap gap-2">
				<button
					onclick={() => (selectedInstrument = 'all')}
					class="filter-button"
					class:active={selectedInstrument === 'all'}
				>
					All
				</button>
				{#each instruments as instrument (instrument.id)}
					<button
						onclick={() => (selectedInstrument = instrument.id)}
						class="filter-button"
						class:active={selectedInstrument === instrument.id}
					>
						{instrument.label}
					</button>
				{/each}
			</div>
		</div> -->

		<!-- Units grid -->
		<UnitGrid
			units={filteredUnits}
			emptyMessage="No materials available for this instrument yet."
		/>
	</div>
</div>

<style>
	/* .filter-button {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		border: 2px solid rgb(226 232 240);
		background: white;
		color: rgb(51 65 85);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			all 150ms ease,
			transform 100ms ease;
	}

	.filter-button:hover {
		border-color: rgb(148 163 184);
		background: rgb(248 250 252);
	}

	.filter-button.active {
		border-color: var(--color-brand-green);
		background: var(--color-brand-green);
		color: var(--color-off-white);
	} */
</style>
