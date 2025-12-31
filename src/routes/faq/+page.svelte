<script lang="ts">
	import BackButton from '$lib/components/ui/BackButton.svelte';
</script>

<svelte:head>
	<title>FAQ - SharpestNote</title>
</svelte:head>

<div class="faq-container">
	<BackButton />
	<h1>Frequently Asked Questions</h1>
	<p class="last-updated">Last updated: 31st Dec 2025</p>

	<section>
		<h2>What is The Sharpest Note?</h2>
		<p>
			The Sharpest Note is a collection of musical beginner units that combine printable sheet music
			with interactive practice tools. Each unit is designed to support early learning through
			listening, reading, and playful repetition.
		</p>
	</section>

	<section>
		<h2>Who is this for?</h2>
		<p>
			The materials are designed primarily for teachers and private studios, and are used by
			students in lessons and at home. They work well for individual teaching and mixed-ability
			studios.
		</p>
	</section>

	<section>
		<h2>Which instruments are supported?</h2>
		<p>
			The Sharpest Note plans to support a wide range of orchestral instruments. Stay tuned or join
			the mailing list on <a href="https://sharpestnote.gumroad.com">Gumroad</a>!
		</p>
	</section>

	<section>
		<h2>What level are the units?</h2>
		<p>
			The Sharpest Note focuses on early beginner to early-intermediate levels, roughly the first
			2–4 years of study. Units are designed to fit alongside any method or curriculum.
		</p>
	</section>

	<section>
		<h2>Does this replace my method book?</h2>
		<p>
			No. The Sharpest Note is meant to supplement your existing method books and repertoire.
			Teachers typically use the units as:
		</p>
		<ul>
			<li>first repertoire</li>
			<li>reinforcement pieces</li>
			<li>listening and intonation support</li>
			<li>structured practice material</li>
		</ul>
	</section>

	<section>
		<h2>What's included in a unit?</h2>
		<p>Each unit includes:</p>
		<ul>
			<li>printable PDFs (score and parts)</li>
			<li>accompaniment and play-along audio (MP3)</li>
			<li>interactive practice tools and games</li>
			<li>QR codes linking students directly to the online materials</li>
		</ul>
	</section>

	<section>
		<h2>How do students access the interactive materials?</h2>
		<p>
			Students scan the QR code in the sheet music or visit the unit page directly. No accounts or
			logins are required.
		</p>
	</section>

	<section>
		<h2>Is this a subscription?</h2>
		<p>No. All units are one-time purchases.</p>
	</section>

	<section>
		<h2>Can I use this with all my students?</h2>
		<p>
			Yes. Each purchase includes a single-studio license, allowing you to use the materials with
			all of your own students.
		</p>
	</section>

	<section>
		<h2>Can I share the files with my students?</h2>
		<p>
			Yes. You may share PDFs and audio files directly with your students for study and practice.
		</p>
	</section>

	<section>
		<h2>Can I share the materials publicly or resell them?</h2>
		<p>
			No. The materials may not be resold, redistributed publicly, or uploaded to shared drives or
			websites.
		</p>
	</section>

	<section>
		<h2>Do students need accounts or personal data?</h2>
		<p>No. Students do not need accounts, and no personal data is collected on this site.</p>
	</section>

	<section>
		<h2>Why are some units free?</h2>
		<p>
			Free units are provided as demos so teachers and students can explore how The Sharpest Note
			works before purchasing paid units.
		</p>
	</section>

	<section>
		<h2>Can I use this in a school or institution?</h2>
		<p>
			If you teach in a school, institution, or multi-teacher program and need broader usage, please
			get in touch.
		</p>
	</section>

	<section>
		<h2>Who makes The Sharpest Note?</h2>
		<p>
			The Sharpest Note is created by an independent teacher and composer, developed and tested in
			real teaching studios.
		</p>
	</section>

	<section>
		<h2>How can I get in touch?</h2>
		<p>For questions, feedback, or licensing inquiries, contact:</p>
		<p>
			<a href="mailto:support@sharpestnote.com">support@sharpestnote.com</a>
		</p>
	</section>
</div>

<style>
	.faq-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		line-height: 1.6;
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
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
		color: #333;
	}

	p {
		margin-bottom: 1rem;
		color: #555;
	}

	ul {
		margin-left: 1.5rem;
		margin-bottom: 1rem;
	}

	li {
		margin-bottom: 0.5rem;
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
