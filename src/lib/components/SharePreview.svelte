<script lang="ts">
	import type { SharePreviewData } from '$lib/util/sharePreview';

	interface Props {
		data?: SharePreviewData;
	}

	const { data }: Props = $props();

	// Get data from prop, with fallback to reading from store if needed
	let previewData = $derived(data);
</script>

<svelte:head>
	{#if previewData}
		<title>{previewData.title} - SharpestNote</title>
		<meta name="description" content={previewData.description} />

		<!-- Open Graph meta tags -->
		<meta property="og:title" content={previewData.title} />
		<meta property="og:description" content={previewData.description} />
		<meta property="og:type" content={previewData.type || 'website'} />
		{#if previewData.image}
			<meta property="og:image" content={previewData.image} />
			<meta property="og:image:width" content="1200" />
			<meta property="og:image:height" content="630" />
			<meta property="og:image:alt" content={previewData.title} />
		{/if}
		{#if previewData.url}
			<meta property="og:url" content={previewData.url} />
		{/if}

		<!-- Twitter Card meta tags -->
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={previewData.title} />
		<meta name="twitter:description" content={previewData.description} />
		{#if previewData.image}
			<meta name="twitter:image" content={previewData.image} />
			<meta name="twitter:image:alt" content={previewData.title} />
		{/if}
	{/if}
</svelte:head>
<!-- This component only renders meta tags in the head -->
