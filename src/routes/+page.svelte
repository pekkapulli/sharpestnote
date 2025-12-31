<script>
	import TheSharpestNoteLogo from '../lib/assets/The Sharpest Note Logo.svg';
	import CardGrid from '$lib/components/ui/CardGrid.svelte';

	const whatThisIs = [
		{ icon: '🎼', text: 'printable sheet music' },
		{ icon: '🎵', text: 'simple accompaniments and play-alongs' },
		{ icon: '🎮', text: 'lightweight interactive tools that support real practice' }
	];

	const howTeachersUse = [
		{ icon: '🎻', text: 'first repertoire that sounds musical' },
		{ icon: '📝', text: 'structured practice between lessons' },
		{ icon: '👂', text: 'listening and intonation support' },
		{ icon: '📚', text: 'short, self-contained units that fit into any curriculum' }
	];
</script>

<div class="py-2rem flex min-h-screen flex-col items-center justify-center bg-off-white px-1">
	<img src={TheSharpestNoteLogo} alt="The Sharpest Note" class="mb-8 w-200" />
	<h2 class="mb-4 text-center text-4xl font-light">
		Musical beginner units with interactive practice tools.
	</h2>
	<p class="text-center">Designed for teachers. Built for curious ears.</p>
	<section class="mt-8 max-w-md">
		<h2 class="mb-4 text-2xl font-semibold">What this is</h2>

		<p>
			The Sharpest Note creates short, musical units for early orchestral players. Each unit
			combines:
		</p>
		<CardGrid items={whatThisIs} />
		<p class="mt-4">
			The focus is on listening, phrasing, and musical sense from the very beginning.
		</p>
	</section>
	<section class="mt-8 max-w-md">
		<h2 class="mb-4 text-2xl font-semibold">How teachers use it</h2>
		<p>Most teachers use The Sharpest Note alongside their existing method books. Typical uses:</p>
		<CardGrid items={howTeachersUse} />
		<p class="mt-4">No accounts. No subscriptions. No setup for students.</p>
	</section>
</div>
