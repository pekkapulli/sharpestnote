<script lang="ts">
	import SharePreview from '$lib/components/SharePreview.svelte';
	import UnitGrid from '$lib/components/ui/UnitGrid.svelte';
	import QAContainer from '$lib/components/ui/QAContainer.svelte';
	import QASection from '$lib/components/ui/QASection.svelte';
	import CardGrid from '$lib/components/ui/CardGrid.svelte';
	import { units } from '$lib/config/units';
	import practiceImage from '$lib/assets/practice.png';
	import listeningImage from '$lib/assets/intonation.png';
	import printableSheetMusicImage from '$lib/assets/printable_sheet_music.png';

	let { data } = $props();

	const demoUnits = $derived(Object.values(units).filter((unit) => unit.demo));

	const teacherFeatures = [
		{
			icon: practiceImage,
			text: 'Lessons continue exactly as usual. The tools reinforce what you teach, phrase by phrase.'
		},
		{
			icon: listeningImage,
			text: 'Short reps target phrasing, rhythm, and intonation — meaningful practice without turning it into screen time.'
		},
		{
			icon: printableSheetMusicImage,
			text: 'PDFs are easy to buy, download, and print. No accounts, no apps, nothing for students to manage.'
		}
	];
</script>

<svelte:head>
	<title>Teacher Demo - The Sharpest Note</title>
</svelte:head>

<SharePreview data={data.sharePreviewData} />

<div class="min-h-screen bg-off-white">
	<section class="mx-auto w-full max-w-xl px-4 pt-16 pb-8">
		<p class="text-sm font-semibold tracking-wide text-brand-green uppercase">Teacher demo</p>
		<h1 class="mt-3 mb-8 max-w-xl text-4xl font-semibold text-slate-900">
			Our vision for home practice
		</h1>
		<p class="mt-4 max-w-3xl text-lg text-slate-700">
			See how home practice can support your teaching, not compete with it. The Sharpest Note puts
			printed music first, keeps tech simple, and guides students with short, focused exercises —
			all in a calm, distraction-free interface.
		</p>
	</section>

	<section class="mx-auto w-full max-w-lg px-4 pb-12">
		<CardGrid items={teacherFeatures} />
	</section>

	<section class="mx-auto w-full max-w-lg px-4 pb-14">
		<h2 class="text-2xl font-semibold text-slate-900">A teacher-first flow</h2>
		<ol class="mt-4 space-y-3 text-slate-700">
			<li>
				<span class="font-bold">Teacher chooses a unit</span> — same as any sheet music you’d normally
				assign.
			</li>
			<li>
				<span class="font-bold">Parents purchase & print</span> — PDFs are sold on Gumroad: easy to download
				and print.
			</li>
			<li>
				<span class="font-bold">In lesson</span> — Teach as usual, assigning specific exercises from the
				unit.
			</li>
			<li>
				<span class="font-bold">Home practice</span> — This is where The Sharpest Note shines: phrase-based
				practice and immediate feedback, plus accompaniment tracks even when the parent's aren't classically
				trained.
			</li>
		</ol>
	</section>

	<section class="mx-auto w-full max-w-lg px-4 pb-20">
		<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<div>
				<h2 class="text-2xl font-semibold text-slate-900">Download the printable demos</h2>
				<p class="mt-2 max-w-2xl text-slate-700">
					These PDFs open directly—no checkout. Each demo pairs with the interactive unit so you can
					see the full practice flow.
				</p>
			</div>
		</div>

		<UnitGrid units={demoUnits} emptyMessage="Demo PDFs will appear here." />
	</section>

	<section class="mx-auto w-full max-w-xl px-4 pb-20">
		<QAContainer title="Frequently Asked Questions" lastUpdated="31st Dec 2025">
			<QASection title="What is The Sharpest Note?">
				<p>
					The Sharpest Note is a collection of musical beginner units that combine printable sheet
					music with interactive practice tools. Each unit is designed to support early learning
					through listening, reading, and playful repetition.
				</p>
			</QASection>

			<QASection title="Who is this for?">
				<p>
					Like method books, teachers choose the material and families purchase individual units for
					their student. The units also work well for self-guided adult beginners who want
					structured, musical practice. They fit one-to-one lessons and are easy to use at home.
				</p>
			</QASection>

			<QASection title="Which instruments are supported?">
				<p>
					The Sharpest Note plans to support a wide range of orchestral instruments. Stay tuned or
					join the mailing list on <a href="https://sharpestnote.gumroad.com">Gumroad</a>!
				</p>
			</QASection>

			<QASection title="What level are the units?">
				<p>
					The Sharpest Note focuses on early beginner to early-intermediate levels, roughly the
					first 2–4 years of study. Units are designed to fit alongside any method or curriculum.
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
					Students scan the QR code in the sheet music or visit the unit page directly. No accounts
					or logins are required.
				</p>
			</QASection>

			<QASection title="Is this a subscription?">
				<p>No. All units are one-time purchases.</p>
			</QASection>

			<QASection title="Can I use this with all my students?">
				<p>
					Each unit is licensed for a single household (one student and their family). Teachers
					should recommend that families purchase their own copy, or purchase on behalf of a single
					student. For studio-wide or institutional use, please contact us.
				</p>
			</QASection>

			<QASection title="Can I share the files with my students?">
				<p>
					Yes, within the licensed household and their teacher. The PDFs and audio may be shared
					between the student, their family, and their teacher for study and practice.
				</p>
			</QASection>

			<QASection title="Can I share the materials publicly or resell them?">
				<p>
					No. The materials may not be resold, redistributed publicly, or uploaded to shared drives
					or websites. For broader licensing needs, reach out to us.
				</p>
			</QASection>

			<QASection title="Do students need accounts or personal data?">
				<p>No. Students do not need accounts, and no personal data is collected on this site.</p>
			</QASection>

			<QASection title="Why are some units free?">
				<p>
					Free units are provided as demos so teachers and students can explore how The Sharpest
					Note works before purchasing paid units.
				</p>
			</QASection>

			<QASection title="Can I use this in a school or institution?">
				<p>
					If you teach in a school, institution, or multi-teacher program and need broader usage,
					please get in touch for a wider license.
				</p>
			</QASection>

			<QASection title="Who makes The Sharpest Note?">
				<p>
					The Sharpest Note is created by Pekka Pulli, a Finnish sound and UX designer, developer,
					composer, and dad of two string instrument players (a cellist and a violist). Other
					composers on the platform are experienced music pedagogists.
				</p>
				<p>
					The project grew out of real teaching rooms and real home practice: trying to make
					beginner material that sounds musical, feels calm to use, and actually helps students
					practice between classes.
				</p>
			</QASection>

			<QASection title="How can I get in touch?">
				<p>For questions, feedback, or licensing inquiries, contact:</p>
				<p>
					<a href="mailto:support@sharpestnote.com">support@sharpestnote.com</a>
				</p>
			</QASection>
		</QAContainer>
	</section>
</div>
