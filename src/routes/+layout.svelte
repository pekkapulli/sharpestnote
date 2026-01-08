<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import { sharePreviewStore } from '$lib/stores/sharePreview';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	const sharePreviewData = $derived($sharePreviewStore);

	// Update default share preview with absolute URL for logo
	onMount(() => {
		const origin = data.origin || window.location.origin;
		sharePreviewStore.update((prev) => ({
			...prev,
			image: prev.image?.startsWith('http') ? prev.image : `${origin}${prev.image}`,
			url: prev.url || `${origin}${data.pathname || window.location.pathname}`
		}));
	});
</script>

<SharePreview data={sharePreviewData} />

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<a href="#main-content" class="skip-link">Skip to main content</a>
<Breadcrumbs />
<main id="main-content">
	{@render children()}
</main>

<footer>
	<div class="footer-content">
		<p>&copy; {new Date().getFullYear()} SharpestNote. All rights reserved.</p>
		<p>
			Contact: <a href="mailto:support@sharpestnote.com">support@sharpestnote.com</a>
		</p>
		<p>
			<a href="/privacy">Privacy Policy</a> | <a href="/faq">FAQ</a>
		</p>
	</div>
</footer>

<style>
	footer {
		margin-top: 4rem;
		padding: 2rem 1rem;
		border-top: 1px solid #e0e0e0;
		background-color: #f8f8f8;
		text-align: center;
	}

	.footer-content {
		max-width: 1200px;
		margin: 0 auto;
	}

	.footer-content p {
		margin: 0.5rem 0;
		color: #666;
		font-size: 0.9rem;
	}

	.footer-content a {
		color: #0066cc;
		text-decoration: none;
	}

	.footer-content a:hover {
		text-decoration: underline;
	}
</style>
