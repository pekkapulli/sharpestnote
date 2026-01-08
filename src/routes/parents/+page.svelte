<script lang="ts">
	import QAContainer from '$lib/components/ui/QAContainer.svelte';
	import QASection from '$lib/components/ui/QASection.svelte';
	import { sharePreviewStore } from '$lib/stores/sharePreview';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		const origin = data.origin || window.location.origin;
		sharePreviewStore.set({
			title: 'For Parents - The Sharpest Note',
			description: 'Learn how The Sharpest Note helps your child practice music more effectively',
			type: 'website',
			image: `${origin}/og-logo.png`,
			url: `${origin}${data.pathname}`
		});
	});
</script>

<svelte:head>
	<title>For Parents - SharpestNote</title>
</svelte:head>

<QAContainer title="For parents">
	<QASection title="What is The Sharpest Note?">
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
	</QASection>

	<QASection title="How does my child use it?">
		<p>Your child:</p>
		<ul>
			<li>plays from printed sheet music (just like in lessons)</li>
			<li>scans a QR code on the page</li>
			<li>practices with short musical activities on a phone, tablet, or computer</li>
		</ul>
		<p>No accounts, logins, or setup needed.</p>
	</QASection>

	<QASection title="Is this meant to be used alone?">
		<p>No, and that is intentional.</p>
		<p>The Sharpest Note works best:</p>
		<ul>
			<li>alongside regular lessons</li>
			<li>with guidance from a teacher</li>
			<li>in short practice sessions at home</li>
		</ul>
		<p>The goal is to make practice focused and musical, not longer.</p>
	</QASection>

	<QASection title="What age is this for?">
		<p>The material is written for beginner-level students, typically:</p>
		<ul>
			<li>children starting an orchestral instrument</li>
			<li>early school-age beginners and up</li>
			<li>students in their first couple of years of lessons</li>
		</ul>
		<p>Exact ages vary, and teachers choose what fits best.</p>
	</QASection>

	<QASection title="Do the games replace practice?">
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
	</QASection>

	<QASection title="Is my child’s data collected?">
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
	</QASection>

	<QASection title="Do I need to buy something?">
		<p>Some units are free, and others are paid.</p>
		<p>
			Teachers or parents can choose what to use. There are no subscriptions, hidden fees, or
			automatic renewals.
		</p>
	</QASection>

	<QASection title="Who makes this?">
		<p>
			The Sharpest Note is created by Pekka Pulli, a Finnish sound and UX designer, developer,
			part-time composer, and parent of two string instrument players. Pekka is joined on the
			platform by other composers, all experienced music pedagogists.
		</p>
		<p>The material is built from real teaching and home practice experience.</p>
	</QASection>

	<QASection title="Questions?">
		<p>If you have questions or concerns, feel free to get in touch at:</p>
		<p>
			<a href="mailto:support@sharpestnote.com">support@sharpestnote.com</a>
		</p>
	</QASection>
</QAContainer>
