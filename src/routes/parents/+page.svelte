<script lang="ts">
	import BackButton from '$lib/components/ui/BackButton.svelte';
</script>

<svelte:head>
	<title>For Parents - SharpestNote</title>
</svelte:head>

<div class="faq-container">
	<h1>For parents</h1>

	<section>
		<h2>What is The Sharpest Note?</h2>
		<p>
			The Sharpest Note is a collection of beginner music units designed to help children practice
			their instrument in a more musical and engaging way.
		</p>
		<p>Each unit combines:</p>
		<ul>
			<li>printable sheet music</li>
			<li>simple play-along tracks</li>
			<li>small, focused practice games</li>
		</ul>
		<p>
			It is not a replacement for lessons, but a companion that helps practice feel clearer and more
			rewarding between lessons.
		</p>
	</section>

	<hr />

	<section>
		<h2>How does my child use it?</h2>
		<p>Your child:</p>
		<ol>
			<li>plays from printed sheet music (just like in lessons)</li>
			<li>scans a QR code on the page</li>
			<li>practices with short musical activities on a phone, tablet, or computer</li>
		</ol>
		<p>No accounts, logins, or setup needed.</p>
	</section>

	<hr />

	<section>
		<h2>Is this meant to be used alone?</h2>
		<p>No, and that is intentional.</p>
		<p>The Sharpest Note works best:</p>
		<ul>
			<li>alongside regular lessons</li>
			<li>with guidance from a teacher</li>
			<li>in short practice sessions at home</li>
		</ul>
		<p>The goal is to make practice focused and musical, not longer.</p>
	</section>

	<hr />

	<section>
		<h2>What age is this for?</h2>
		<p>The material is written for beginner-level students, typically:</p>
		<ul>
			<li>children starting an orchestral instrument</li>
			<li>early school-age beginners and up</li>
			<li>students in their first couple of years of lessons</li>
		</ul>
		<p>Exact ages vary, and teachers choose what fits best.</p>
	</section>

	<hr />

	<section>
		<h2>Do the games replace practice?</h2>
		<p>No.</p>
		<p>The games are there to support:</p>
		<ul>
			<li>listening</li>
			<li>pitch awareness</li>
			<li>rhythm</li>
			<li>confidence</li>
		</ul>
		<p>
			They are designed to reinforce what the student is already playing on their instrument, not to
			turn practice into screen time.
		</p>
	</section>

	<hr />

	<section>
		<h2>Is my child’s data collected?</h2>
		<p>No personal data from children is collected.</p>
		<p>There are:</p>
		<ul>
			<li>no user accounts</li>
			<li>no profiles</li>
			<li>no advertising trackers</li>
		</ul>
		<p>The site only stores minimal technical information needed for the tools to work.</p>
		<p>
			You can read more in the <a href="/privacy">Privacy Policy</a>.
		</p>
	</section>

	<hr />

	<section>
		<h2>Do I need to buy something?</h2>
		<p>Some units are free, and others are paid.</p>
		<p>
			Teachers or parents can choose what to use. There are no subscriptions, hidden fees, or
			automatic renewals.
		</p>
	</section>

	<hr />

	<section>
		<h2>Who makes this?</h2>
		<p>
			The Sharpest Note is created by Pekka Pulli, a Finnish sound and UX designer, developer,
			part-time composer, and parent of two string instrument players. Pekka is joined on the
			platform by other composers, all experienced music pedagogists.
		</p>
		<p>The material is built from real teaching and home practice experience.</p>
	</section>

	<hr />

	<section>
		<h2>Questions?</h2>
		<p>If you have questions or concerns, feel free to get in touch at:</p>
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

	h1 {
		margin-bottom: 1rem;
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

	ul,
	ol {
		margin-left: 1.5rem;
		margin-bottom: 1rem;
	}

	li {
		margin-bottom: 0.5rem;
		color: #555;
	}

	hr {
		border: none;
		border-top: 1px solid #e5e5e5;
		margin: 2rem 0;
	}

	a {
		color: #0066cc;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
