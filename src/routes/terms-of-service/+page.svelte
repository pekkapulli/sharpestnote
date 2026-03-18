<script lang="ts">
	import BackButton from '$lib/components/ui/BackButton.svelte';
	import SharePreview from '$lib/components/SharePreview.svelte';

	let { data } = $props();
</script>

<SharePreview data={data.sharePreviewData} />

<svelte:head>
	<title>Terms of Service - SharpestNote</title>
</svelte:head>

<div class="privacy-container">
	<BackButton />
	<h1>Terms of Service</h1>
	<p class="last-updated">Effective date: 18th Mar 2026</p>

	<section>
		<p>Welcome to The Sharpest Note. By using the service, you agree to these terms.</p>
	</section>

	<section>
		<h2>1. Purpose of the Service</h2>
		<p>
			The Sharpest Note provides musical learning materials and tools for instrument practice,
			including teacher-created content and interactive practice features.
		</p>
	</section>

	<section>
		<h2>2. Accounts</h2>
		<p>You agree to:</p>
		<ul>
			<li>provide accurate account information</li>
			<li>keep your account secure</li>
			<li>use the service in a lawful and responsible way</li>
		</ul>
		<p>You are responsible for all activity under your account.</p>
	</section>

	<section>
		<h2>3. Teacher Content and Licensing</h2>
		<p>If you create or upload material (e.g. via the Composer tool):</p>
		<p>Ownership</p>
		<ul>
			<li>You retain full ownership of your content</li>
		</ul>
		<p>License to The Sharpest Note</p>
		<p>You grant us a non-exclusive, limited license to:</p>
		<ul>
			<li>store your content</li>
			<li>process it (e.g. generate notation, audio, interactive views)</li>
			<li>make it available to users you choose to share it with</li>
		</ul>
		<p>We do not use your content outside the service without your permission.</p>
	</section>

	<section>
		<h2>4. Copyright and Acceptable Use</h2>
		<p>You may only upload or create content that:</p>
		<ul>
			<li>you created yourself, or</li>
			<li>is in the public domain, or</li>
			<li>you have clear rights to use</li>
		</ul>
		<p>You may not:</p>
		<ul>
			<li>upload or recreate copyrighted melodies without permission</li>
			<li>create derivative versions (e.g. simplified arrangements) of copyrighted works</li>
			<li>use the service to distribute infringing material</li>
		</ul>
		<p>If we receive a valid copyright complaint, we may remove content without notice.</p>
	</section>

	<section>
		<h2>5. Sharing and Responsibility</h2>
		<p>When you share a unit:</p>
		<ul>
			<li>you are responsible for the content you share</li>
			<li>you decide who can access it</li>
		</ul>
		<p>The Sharpest Note does not verify or review all shared content.</p>
	</section>

	<section>
		<h2>6. Credits and Purchases</h2>
		<p>Some features (such as the Composer tool) use credits.</p>
		<ul>
			<li>Credits may be granted or purchased</li>
			<li>Using certain actions (e.g. sharing a unit) consumes credits</li>
			<li>Credits are non-refundable unless required by law</li>
		</ul>
		<p>We may adjust how credits work as the service evolves.</p>
	</section>

	<section>
		<h2>7. Data and Privacy</h2>
		<p>We collect and process personal data in accordance with our Privacy Policy.</p>
		<p>
			You should avoid entering sensitive personal data into the service, especially relating to
			students.
		</p>
	</section>

	<section>
		<h2>8. Availability</h2>
		<p>We aim to provide a stable and reliable service, but:</p>
		<ul>
			<li>we do not guarantee uninterrupted availability</li>
			<li>features may change or be updated over time</li>
		</ul>
	</section>

	<section>
		<h2>9. Termination</h2>
		<p>You may stop using the service at any time.</p>
		<p>We may suspend or terminate access if:</p>
		<ul>
			<li>these terms are violated</li>
			<li>the service is used unlawfully or abusively</li>
		</ul>
	</section>

	<section>
		<h2>10. Liability</h2>
		<p>The service is provided "as is".</p>
		<p>To the extent permitted by law:</p>
		<ul>
			<li>we are not liable for indirect or consequential damages</li>
			<li>total liability is limited to the amount paid for the service (if any)</li>
		</ul>
	</section>

	<section>
		<h2>11. Changes to Terms</h2>
		<p>
			We may update these terms as the service evolves. Continued use means you accept the updated
			terms.
		</p>
	</section>

	<section>
		<h2>12. Contact</h2>
		<p>For questions, including copyright concerns:</p>
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
