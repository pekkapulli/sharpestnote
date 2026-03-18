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
	<p class="last-updated">Effective date: 18th Mar 2026</p>

	<section>
		<p>This Privacy Policy explains how The Sharpest Note collects and uses personal data.</p>
	</section>

	<section>
		<h2>1. What we collect</h2>
		<p>We collect only the data needed to operate and improve the service.</p>
		<p>Account information:</p>
		<ul>
			<li>Name (if provided)</li>
			<li>Email address</li>
		</ul>
		<p>Usage data:</p>
		<ul>
			<li>Features you use (e.g. Composer, shared units)</li>
			<li>Credit usage and activity</li>
			<li>Basic interaction data</li>
		</ul>
		<p>Technical data:</p>
		<ul>
			<li>IP address</li>
			<li>Browser and device type</li>
		</ul>
	</section>

	<section>
		<h2>2. How we use data</h2>
		<p>We use data to:</p>
		<ul>
			<li>provide and maintain the service</li>
			<li>process content (e.g. generate notation, audio, interactive tools)</li>
			<li>manage credits and access</li>
			<li>improve the product and user experience</li>
			<li>ensure security and prevent misuse</li>
		</ul>
	</section>

	<section>
		<h2>3. Legal basis (GDPR)</h2>
		<p>We process personal data based on:</p>
		<ul>
			<li>Contract - to provide the service you signed up for</li>
			<li>Legitimate interest - to improve and secure the service</li>
			<li>Consent - where required (e.g. certain analytics or cookies)</li>
		</ul>
	</section>

	<section>
		<h2>4. Teacher responsibility and student data</h2>
		<p>The service is designed to work without student personal data.</p>
		<p>
			Teachers should not enter personal data of students into the service unless they have a valid
			legal basis and appropriate consent.
		</p>
	</section>

	<section>
		<h2>5. Sharing and third parties</h2>
		<p>We do not sell personal data.</p>
		<p>We use trusted third-party services to operate the platform, such as:</p>
		<ul>
			<li>hosting and database providers</li>
			<li>infrastructure and delivery services</li>
			<li>analytics tools (if applicable)</li>
		</ul>
		<p>These providers process data only as needed to provide their services.</p>
	</section>

	<section>
		<h2>6. International data transfers</h2>
		<p>Some data may be processed outside the EU.</p>
		<p>In such cases, we ensure appropriate safeguards are in place in accordance with GDPR.</p>
	</section>

	<section>
		<h2>7. Data retention</h2>
		<p>We retain personal data only as long as necessary to:</p>
		<ul>
			<li>provide the service</li>
			<li>comply with legal obligations</li>
		</ul>
		<p>
			If you delete your account, your personal data will be removed within a reasonable period,
			unless retention is required by law.
		</p>
	</section>

	<section>
		<h2>8. Your rights</h2>
		<p>Under GDPR, you have the right to:</p>
		<ul>
			<li>access your personal data</li>
			<li>correct inaccurate data</li>
			<li>request deletion of your data</li>
			<li>restrict or object to processing</li>
			<li>request data portability</li>
		</ul>
		<p>To exercise these rights, contact us at the email below.</p>
	</section>

	<section>
		<h2>9. Security</h2>
		<p>We take reasonable technical and organizational measures to protect personal data.</p>
	</section>

	<section>
		<h2>10. Changes to this policy</h2>
		<p>
			We may update this policy as the service evolves. Continued use means you accept the updated
			version.
		</p>
	</section>

	<section>
		<h2>11. Contact</h2>
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
