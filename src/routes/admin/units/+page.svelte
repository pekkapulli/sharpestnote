<script lang="ts">
	import { units } from '$lib/config/units';
	import UnitGrid from '$lib/components/ui/UnitGrid.svelte';
	import SharePreview from '$lib/components/SharePreview.svelte';

	let { data } = $props();

	const allUnits = Object.values(units);
</script>

<SharePreview data={data.sharePreviewData} />

<div class="min-h-screen bg-off-white px-4 py-12">
	<div class="mx-auto w-full max-w-5xl">
		<h1 class="text-4xl font-semibold text-slate-900">Admin: All Units</h1>
		<p class="mt-3 text-lg text-slate-700">Unfiltered list of every unit for quick access.</p>

		<UnitGrid units={allUnits} emptyMessage="No units available." />
	</div>
</div>
