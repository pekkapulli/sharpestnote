<script lang="ts">
	let {
		title,
		lastUpdated = undefined,
		lead,
		children
	} = $props<{
		title: string;
		lastUpdated?: string;
		lead?: import('svelte').Snippet;
		children?: import('svelte').Snippet;
	}>();
</script>

<div class="faq-container">
	{#if lead}{@render lead()}{/if}
	<h1>{title}</h1>
	{#if lastUpdated}
		<p class="last-updated">Last updated: {lastUpdated}</p>
	{/if}
	{#if children}{@render children()}{/if}
</div>

<style>
	.faq-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		line-height: 1.6;
	}

	h1 {
		margin-bottom: 1rem;
	}

	.last-updated {
		color: #666;
		font-style: italic;
		margin-bottom: 2rem;
	}

	p {
		margin-bottom: 1rem;
		color: #555;
	}
</style>
