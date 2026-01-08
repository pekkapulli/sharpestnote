<script lang="ts">
	import type { SharePreviewData } from '$lib/util/sharePreview';

	interface Props {
		data: SharePreviewData;
	}

	const { data }: Props = $props();

	const { title, description, image, url, type = 'website' } = $derived(data);
</script>

<svelte:head>
	<title>{title} - SharpestNote</title>
	<meta name="description" content={description} />

	<!-- Open Graph meta tags -->
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	{#if image}
		<meta property="og:image" content={image} />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta property="og:image:alt" content={title} />
	{/if}
	{#if url}
		<meta property="og:url" content={url} />
	{/if}

	<!-- Twitter Card meta tags -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if image}
		<meta name="twitter:image" content={image} />
		<meta name="twitter:image:alt" content={title} />
	{/if}
</svelte:head>
