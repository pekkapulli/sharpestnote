<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<Breadcrumbs />
{@render children()}

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
