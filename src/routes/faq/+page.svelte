<script lang="ts">
	import QAContainer from '$lib/components/ui/QAContainer.svelte';
	import QASection from '$lib/components/ui/QASection.svelte';
	import SharePreview from '$lib/components/SharePreview.svelte';

	let { data } = $props();
</script>

<SharePreview data={data.sharePreviewData} />

<svelte:head>
	<title>FAQ - SharpestNote</title>
</svelte:head>

<QAContainer title="Frequently Asked Questions" lastUpdated="31st Dec 2025">
	<QASection title="What is The Sharpest Note?">
		<p>
			The Sharpest Note is a collection of musical beginner units that combine printable sheet music
			with interactive practice tools. Each unit is designed to support early learning through
			listening, reading, and playful repetition.
		</p>
	</QASection>

	<QASection title="Who is this for?">
		<p>
			The materials are designed primarily for teachers and private studios, and are used by
			students in lessons and at home. They work well for individual teaching and mixed-ability
			studios.
		</p>
	</QASection>

	<QASection title="Which instruments are supported?">
		<p>
			The Sharpest Note plans to support a wide range of orchestral instruments. Stay tuned or join
			the mailing list on <a href="https://sharpestnote.gumroad.com">Gumroad</a>!
		</p>
	</QASection>

	<QASection title="What level are the units?">
		<p>
			The Sharpest Note focuses on early beginner to early-intermediate levels, roughly the first
			2–4 years of study. Units are designed to fit alongside any method or curriculum.
		</p>
	</QASection>

	<QASection title="Does this replace my method book?">
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
	</QASection>

	<QASection title="What's included in a unit?">
		<p>Each unit includes:</p>
		<ul>
			<li>printable PDFs (score and parts)</li>
			<li>accompaniment and play-along audio (MP3)</li>
			<li>interactive practice tools and games</li>
			<li>QR codes linking students directly to the online materials</li>
		</ul>
	</QASection>

	<QASection title="How do students access the interactive materials?">
		<p>
			Students scan the QR code in the sheet music or visit the unit page directly. No accounts or
			logins are required.
		</p>
	</QASection>

	<QASection title="Is this a subscription?">
		<p>No. All units are one-time purchases.</p>
	</QASection>

	<QASection title="Can I use this with all my students?">
		<p>
			Yes. Each purchase includes a single-studio license, allowing you to use the materials with
			all of your own students.
		</p>
	</QASection>

	<QASection title="Can I share the files with my students?">
		<p>
			Yes. You may share PDFs and audio files directly with your students for study and practice.
		</p>
	</QASection>

	<QASection title="Can I share the materials publicly or resell them?">
		<p>
			No. The materials may not be resold, redistributed publicly, or uploaded to shared drives or
			websites.
		</p>
	</QASection>

	<QASection title="Do students need accounts or personal data?">
		<p>No. Students do not need accounts, and no personal data is collected on this site.</p>
	</QASection>

	<QASection title="Why are some units free?">
		<p>
			Free units are provided as demos so teachers and students can explore how The Sharpest Note
			works before purchasing paid units.
		</p>
	</QASection>

	<QASection title="Can I use this in a school or institution?">
		<p>
			If you teach in a school, institution, or multi-teacher program and need broader usage, please
			get in touch.
		</p>
	</QASection>

	<QASection title="Who makes The Sharpest Note?">
		<p>
			The Sharpest Note is created by Pekka Pulli, a Finnish sound and UX designer, developer,
			composer, and dad of two string instrument players (a cellist and a violist). Other composers
			on the platform are experienced music pedagogists.
		</p>
		<p>
			The project grew out of real teaching rooms and real home practice: trying to make beginner
			material that sounds musical, feels calm to use, and actually helps students practice between
			classes.
		</p>
	</QASection>

	<QASection title="How can I get in touch?">
		<p>For questions, feedback, or licensing inquiries, contact:</p>
		<p>
			<a href="mailto:support@sharpestnote.com">support@sharpestnote.com</a>
		</p>
	</QASection>
</QAContainer>
