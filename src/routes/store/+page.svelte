<script lang="ts">
	import { instrumentMap } from '$lib/config/instruments';
	import { units } from '$lib/config/units';
	import type { InstrumentId } from '$lib/config/types';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import { getImageUrl } from '$lib/util/getImageUrl';

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
		<h1 class="text-4xl font-semibold text-slate-900">Sheet Music Store</h1>
		<p class="mt-3 text-lg text-slate-700">
			Practice materials with accompaniment tracks and interactive games.
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
		<div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredUnits as unit (unit.code)}
				<article class="unit-card">
					<div class="unit-card__header">
						<img
							src={getImageUrl(unit.code)}
							alt={`${unit.title} cover art`}
							class="mb-2 w-full rounded-lg"
						/>
						<h2 class="text-xl font-semibold text-slate-900">{unit.title}</h2>
						<p class="mt-1 text-sm font-semibold text-emerald-700">
							For {instrumentMap[unit.instrument]?.label ?? unit.instrument}
						</p>
					</div>
					<p class="mt-3 text-slate-700">{unit.description}</p>
					<div class="mt-4 flex gap-2">
						<LinkButton href={unit.gumroadUrl} color="green">Buy on Gumroad</LinkButton>
						<LinkButton href={`/unit/${unit.code}`}>Preview Free</LinkButton>
					</div>
				</article>
			{/each}
		</div>

		{#if filteredUnits.length === 0}
			<div class="mt-10 text-center text-slate-600">
				<p>No materials available for this instrument yet.</p>
			</div>
		{/if}
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

	.unit-card {
		display: flex;
		flex-direction: column;
		border-radius: 1rem;
		background: white;
		border: 1px solid rgb(226 232 240);
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
		padding: 1.5rem;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease;
	}

	.unit-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1);
	}

	.unit-card__header {
		border-bottom: 1px solid rgb(241 245 249);
		padding-bottom: 0.75rem;
	}
</style>
