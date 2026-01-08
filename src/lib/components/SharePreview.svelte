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
	{#if image}
		<meta property="og:image" content={image} />
	{/if}
	{#if url}
		<meta property="og:url" content={url} />
	{/if}
	<meta property="og:type" content={type} />

	<!-- Twitter Card meta tags -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if image}
		<meta name="twitter:image" content={image} />
	{/if}
</svelte:head>
