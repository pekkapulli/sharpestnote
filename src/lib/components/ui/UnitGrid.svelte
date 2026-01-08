<script lang="ts">
	import { instrumentMap } from '$lib/config/instruments';
	import type { UnitMaterial } from '$lib/config/units';
	import { getImageUrl } from '$lib/util/getImageUrl';
	import LinkButton from './LinkButton.svelte';
	import UnitTrackList from './UnitTrackList.svelte';

	interface Props {
		units: UnitMaterial[];
		emptyMessage?: string;
	}

	const { units, emptyMessage = 'No materials available.' }: Props = $props();
</script>

<div class="unit-grid">
	{#each units as unit (unit.code)}
		<article class="unit-card">
			<div class="unit-card__header">
				<img src={getImageUrl(unit.code)} alt={`${unit.title} cover art`} class="mb-2 w-full" />
				<h2 class="unit-title font-semibold text-dark-blue">{unit.title}</h2>
			</div>
			<p class="mt-0 text-dark-blue">{unit.description}</p>
			<UnitTrackList {unit} />
			<div class="mt-4 flex gap-2">
				<LinkButton href={unit.gumroadUrl} color="green">Buy on Gumroad</LinkButton>
				<LinkButton href={`/unit/${unit.code}`}>Preview unit</LinkButton>
			</div>
		</article>
	{/each}
</div>

{#if units.length === 0}
	<div class="mt-10 text-center text-slate-600">
		<p>{emptyMessage}</p>
	</div>
{/if}

<style>
	.unit-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 320px));
		gap: 1.5rem;
		margin: 2.5rem 0 2rem 0;
		padding: 0 10vw;
		width: 100vw;
		position: relative;
		left: 50%;
		transform: translateX(-50%);
		justify-content: center;
	}

	@media (max-width: 640px) {
		.unit-grid {
			grid-template-columns: 1fr;
			margin: 1rem -1rem 2rem -1rem;
			padding: 0 1rem;
		}
	}

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

	.unit-title {
		font-size: 1.5rem;
		margin-bottom: 0;
	}
</style>
