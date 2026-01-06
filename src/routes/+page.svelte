<script>
	import TheSharpestNoteLogo from '../lib/assets/The Sharpest Note Logo.svg';
	import CardGrid from '$lib/components/ui/CardGrid.svelte';
	import printableSheetMusicImage from '$lib/assets/printable_sheet_music.png';
	import accompanimentsImage from '$lib/assets/accompaniments.png';
	import interactiveToolsImage from '$lib/assets/interactive_tools.png';
	import repertoireImage from '$lib/assets/repertoire.png';
	import practiceImage from '$lib/assets/practice.png';
	import listeningImage from '$lib/assets/intonation.png';
	import UnitGrid from '$lib/components/ui/UnitGrid.svelte';
	import { units } from '$lib/config/units';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';

	const whatThisIs = [
		{ icon: printableSheetMusicImage, text: 'Printable sheet music' },
		{ icon: accompanimentsImage, text: 'Simple accompaniments and play-alongs' },
		{
			icon: interactiveToolsImage,
			text: 'Lightweight interactive tools that support real practice'
		}
	];

	const howTeachersUse = [
		{ icon: repertoireImage, text: 'First repertoire that sounds musical' },
		{ icon: practiceImage, text: 'Structured practice between lessons' },
		{ icon: listeningImage, text: 'Listening and intonation support' }
	];
</script>

<div class="py-2rem flex min-h-screen flex-col items-center justify-center bg-off-white px-1">
	<img src={TheSharpestNoteLogo} alt="The Sharpest Note" class="mt-24 mb-8 w-200" />

	<h2 class="mb-4 text-center text-4xl font-light">
		Musical beginner units with interactive practice tools.
	</h2>
	<p class="text-center">Designed for teachers. Built for curious ears.</p>
	<nav
		class="mb-6 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-slate-800"
	>
		<a
			class="rounded-full bg-white px-4 py-2 shadow-sm transition hover:-translate-y-px hover:shadow"
			href="/units"
		>
			Units
		</a>
		<a
			class="rounded-full bg-white px-4 py-2 shadow-sm transition hover:-translate-y-px hover:shadow"
			href="/unit/tw-v"
		>
			FREE DEMO
		</a>
		<a
			class="rounded-full bg-white px-4 py-2 shadow-sm transition hover:-translate-y-px hover:shadow"
			href="/faq"
		>
			FAQ
		</a>
		<a
			class="rounded-full bg-white px-4 py-2 shadow-sm transition hover:-translate-y-px hover:shadow"
			href="/parents"
		>
			For Parents
		</a>
	</nav>
	<section class="mt-24 w-full max-w-md">
		<p class="text-md">
			The Sharpest Note creates short, musical units for early orchestral players. Each unit
			combines:
		</p>
		<CardGrid items={whatThisIs} />
		<p class="text-md mt-4">
			The focus is on listening, phrasing, and musical sense from the very beginning.
		</p>
	</section>

	<section class="mt-16 w-full max-w-md">
		<h2 class="mb-4 text-2xl font-semibold">How teachers use it</h2>
		<p>
			Most teachers use The Sharpest Note alongside their existing method books. No accounts. No
			subscriptions. No setup for students. Buy once, use forever.
		</p>
		<CardGrid items={howTeachersUse} />
	</section>

	<section class="mt-16 w-full max-w-md">
		<h2 class="mb-4 text-2xl font-semibold">How it works</h2>
		<ul>
			<li>Choose a unit for your instrument</li>
			<li>Download the PDFs and give to your student</li>
			<li>Students scan the QR code to practice interactively between lessons</li>
		</ul>
		<p>
			The interactive material runs directly in the browser and works on phones, tablets, and
			computers.
		</p>
	</section>

	<section class="mt-16 w-full max-w-md">
		<h2 class="mb-4 text-2xl font-semibold">Try a free demo</h2>
		<UnitGrid
			units={[units['tw-v']]}
			emptyMessage="No materials available for this instrument yet."
		/>
		<div class="mt-6 flex w-full flex-col items-center">
			<LinkButton href="/units" size="large" color="green">Browse the units</LinkButton>
		</div>
	</section>

	<section class="mt-16 w-full max-w-md">
		<h2 class="mb-4 text-2xl font-semibold">Licencing</h2>
		<p>
			Units are sold as one-time purchases and include a single-studio license. You may use the
			materials with all of your own students.
		</p>
	</section>

	<section class="mt-16 w-full max-w-md">
		<h2 class="mb-4 text-2xl font-semibold">About The Sharpest Note</h2>
		<p>
			The Sharpest Note is created by Pekka Pulli, a Finnish sound and UX designer, developer,
			part-time composer, and dad of two string players.
		</p>
		<p>
			The project grew out of real teaching rooms and real home practice: trying to make beginner
			material that sounds musical, feels calm to use, and actually helps students practice between
			classes.
		</p>
		<p>
			If you have questions, feedback, or licensing inquiries, you can get in touch at: <a
				href="mailto:support@sharpestnote.com">support@sharpestnote.com</a
			>.
		</p>
	</section>
</div>
