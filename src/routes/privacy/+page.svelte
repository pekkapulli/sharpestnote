<script lang="ts">
	import BackButton from '$lib/components/ui/BackButton.svelte';
	import SharePreview from '$lib/components/SharePreview.svelte';

	let { data } = $props();
</script>

<SharePreview data={data.sharePreviewData} />

<svelte:head>
	<title>Privacy Policy - SharpestNote</title>
</svelte:head>

<div class="privacy-container">
	<BackButton />
	<h1>Privacy Policy</h1>
	<p class="last-updated">Last updated: 30th Dec 2025</p>

	<section>
		<p>
			The Sharpest Note respects your privacy and is committed to keeping this site simple, safe,
			and transparent.
		</p>
	</section>

	<section>
		<h2>What data we collect</h2>
		<p>
			We do not collect personal data such as names, email addresses, or payment information on this
			site.
		</p>
		<p>
			Payments and downloads are handled by third-party platforms (such as Gumroad), which have
			their own privacy policies.
		</p>
	</section>

	<section>
		<h2>Local storage</h2>
		<p>
			This site uses local browser storage (localStorage) to enable core functionality, such as:
		</p>
		<ul>
			<li>remembering whether interactive content has been unlocked</li>
			<li>improving the practice experience across visits</li>
		</ul>
		<p>This data:</p>
		<ul>
			<li>stays in your browser</li>
			<li>is not shared with third parties</li>
			<li>is not used for tracking or advertising</li>
		</ul>
	</section>

	<section>
		<h2>Cookies</h2>
		<p>This site does not use tracking or marketing cookies.</p>
	</section>

	<section>
		<h2>Analytics</h2>
		<p>No third-party analytics, advertising pixels, or user profiling tools are used.</p>
	</section>

	<section>
		<h2>External links</h2>
		<p>
			Some materials may link to external services (such as Gumroad). We are not responsible for the
			privacy practices of those services.
		</p>
	</section>

	<section>
		<h2>Contact</h2>
		<p>If you have questions about privacy or data use, you can contact us at:</p>
		<p>
			<a href="mailto:support@sharpestnote.com">support@sharpestnote.com</a>
		</p>
	</section>
</div>

<style>
	.privacy-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		line-height: 1.6;
	}

	h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		color: #333;
	}

	.last-updated {
		color: #666;
		font-style: italic;
		margin-bottom: 2rem;
	}

	section {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 1.5rem;
		margin-top: 2rem;
		margin-bottom: 1rem;
		color: #444;
	}

	p {
		margin-bottom: 1rem;
		color: #555;
	}

	a {
		color: #0066cc;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
