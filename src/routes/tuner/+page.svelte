<script lang="ts">
	import SharePreview from '$lib/components/SharePreview.svelte';
	import TunerPanel from '$lib/components/tuner/TunerPanel.svelte';

	let { data } = $props();
</script>

<SharePreview data={data.sharePreviewData} />

<TunerPanel />
