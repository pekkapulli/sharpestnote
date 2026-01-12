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
	import KeyCodeNavigator from '$lib/components/ui/KeyCodeNavigator.svelte';
	import { units } from '$lib/config/units';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import SharePreview from '$lib/components/SharePreview.svelte';

	let { data } = $props();

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

<SharePreview data={data.sharePreviewData} />

<div class="py-2rem flex min-h-screen flex-col items-center justify-center bg-off-white px-2">
	<header class="mt-6 mb-12 flex flex-col items-center px-4 text-center">
		<img src={TheSharpestNoteLogo} alt="The Sharpest Note" class="mt-24 mb-8 w-200" />

		<h2 class="mb-4 max-w-lg text-center text-xl font-light">
			Beginner units for orchestral instruments, with interactive practice tools.
		</h2>
		<p class="text-center">Built for music educators, families, and adult learners.</p>
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
				href="/teachers"
			>
				For Teachers
			</a>
			<a
				class="rounded-full bg-white px-4 py-2 shadow-sm transition hover:-translate-y-px hover:shadow"
				href="/parents"
			>
				For Parents
			</a>
		</nav>
	</header>

	<details class="mt-8 w-full max-w-md">
		<summary
			class="cursor-pointer rounded-lg bg-emerald-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-emerald-700"
		>
			I have a code, take me to my unit!
		</summary>
		<div class="mt-4">
			<KeyCodeNavigator />
		</div>
	</details>

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
			The Sharpest Note works like a method book. Teachers choose the units they want to use.
			Families purchase them for personal use at home.
		</p>
		<p>No accounts. No subscriptions. No setup for students.</p>
		<p>
			Self-guided adult learners can simply choose a unit, download it, and practice the same way.
		</p>
	</section>

	<section class="mt-16 w-full max-w-md">
		<h2 class="mb-4 text-2xl font-semibold">Why teachers recommend it</h2>
		<CardGrid items={howTeachersUse} />
	</section>

	<section class="mt-16 w-full max-w-md">
		<h2 class="mb-4 text-2xl font-semibold">How it works</h2>
		<p>
			Students scan the QR code on the sheet music to practice interactively between lessons. The
			interactive material runs directly in the browser and works on phones, tablets, and computers.
		</p>
	</section>

	<section class="mt-16 w-full max-w-md">
		<h2 class="mb-4 text-2xl font-semibold">Try a free demo</h2>
		<UnitGrid
			units={Object.values(units)
				.filter((u) => u.demo)
				.slice(0, 3)}
		/>
		<div class="mt-6 flex w-full flex-col items-center">
			<LinkButton href="/units" size="large" color="green">Browse the units</LinkButton>
		</div>
	</section>

	<section class="mt-16 w-full max-w-md">
		<h2 class="mb-4 text-2xl font-semibold">Licensing</h2>
		<p>
			Units are one-time purchases with a single-household license, for personal use alongside
			lessons with a teacher. For school, studio-wide, or institutional use, please get in touch.
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
