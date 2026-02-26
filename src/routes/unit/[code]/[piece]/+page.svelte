<script lang="ts">
	import KeyEntry from '$lib/components/ui/KeyEntry.svelte';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import AudioPlayer from '$lib/components/audio/AudioPlayer.svelte';
	import melodyIcon from '$lib/assets/melody_icon.png';
	import blocksIcon from '$lib/assets/blocks_icon.png';
	import scalesIcon from '$lib/assets/scales_icon.png';
	import stepsIcon from '$lib/assets/steps_icon.png';
	import defendIcon from '$lib/assets/defend_icon.png';
	import GameCard from '$lib/components/games/GameCard.svelte';
	import GameCardGrid from '$lib/components/games/GameCardGrid.svelte';
	import { getUnitStorage } from '$lib/util/unitStorage.svelte';
	import { initUnitKeyAccess } from '$lib/util/initUnitKeyAccess';
	import SharePreview from '$lib/components/SharePreview.svelte';

	const { data } = $props();
	const { piece, code, pieceCode, previousPiece, nextPiece, unit, imageUrl, pageUrl } =
		$derived(data);
	let hasKeyAccess = $state(false);
	const sheetMusicCta = $derived(`/unit/${unit.gumroadUrl}`);
	let badgeTexts = $state<Record<string, string | undefined>>({});
	let showSuccessMessage = $state(false);

	const gameCards = [
		{
			slug: 'melody',
			title: 'Melody',
			description: 'Play through the piece',
			icon: melodyIcon,
			requiresAccess: true
		},
		{
			slug: 'blocks',
			title: 'Blocks',
			description: 'Practice random phrases',
			icon: blocksIcon,
			requiresAccess: true
		},
		{
			slug: 'scales',
			title: 'Scales',
			description: 'Climb up and down the scale',
			icon: scalesIcon,
			requiresAccess: false
		},
		{
			slug: 'steps',
			title: 'Steps',
			description: 'Play note pairs',
			icon: stepsIcon,
			requiresAccess: false
		},
		{
			slug: 'defend',
			title: 'Defend',
			description: "Use the piece's notes to defend against space monsters",
			icon: defendIcon,
			requiresAccess: true
		}
	];

	const visibleGameCards = $derived(
		gameCards
			.map((game) => ({
				...game,
				locked: game.requiresAccess && !hasKeyAccess
			}))
			.sort((a, b) => Number(a.locked) - Number(b.locked))
	);

	const sharePreviewData = $derived({
		title: `${piece.label} - ${unit.title}`,
		description: unit.description,
		image: imageUrl,
		url: pageUrl
	});

	$effect(() => {
		// Initialize key access from URL or localStorage
		void initUnitKeyAccess(unit).then((access) => {
			hasKeyAccess = access;
		});
	});

	$effect(() => {
		const storage = getUnitStorage(code) as Record<string, number>;
		const melodyCompletions = storage[`${pieceCode}_melody_completions`] || 0;
		const blocksCompletions = storage[`${pieceCode}_blocks_completions`] || 0;
		const scalesCompletions = storage[`${pieceCode}_scales_completions`] || 0;
		const stepsCompletions = storage[`${pieceCode}_steps_completions`] || 0;
		const highScore = storage[`${pieceCode}_defend_highScore`] || 0;

		badgeTexts = {
			melody: melodyCompletions > 0 ? `${melodyCompletions}×` : undefined,
			blocks: blocksCompletions > 0 ? `${blocksCompletions}×` : undefined,
			scales: scalesCompletions > 0 ? `${scalesCompletions}×` : undefined,
			steps: stepsCompletions > 0 ? `${stepsCompletions}×` : undefined,
			defend: highScore > 0 ? `${highScore} pts` : undefined
		};
	});

	function handleKeySuccess() {
		hasKeyAccess = true;
		showSuccessMessage = true;
	}
</script>

<SharePreview data={sharePreviewData} />

<div class="min-h-screen bg-off-white px-4 py-8">
	<div class="mx-auto w-full max-w-3xl">
		<article class="rounded-2xl bg-white p-8 shadow-md">
			<h1 class="text-3xl font-semibold text-slate-900">{piece.label}</h1>
			<p class="mb-8">From {unit.title}</p>

			{#if showSuccessMessage}
				<div class="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
					<p class="text-sm font-semibold text-emerald-800">✓ Access unlocked!</p>
					<p class="mt-1 text-sm text-emerald-700">
						You can now access all the content for this unit.
					</p>
				</div>
			{/if}

			{#if !hasKeyAccess}
				<KeyEntry unitCode={code} onSuccess={handleKeySuccess} purchaseUrl={sheetMusicCta} />
			{/if}

			<section class="mt-16 mb-8">
				<div class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8 shadow-sm">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="space-y-3">
							<p class="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
								Guided practice
							</p>
							<h2 class="text-2xl font-semibold text-slate-900">Teach me {piece.label}</h2>
							<p class="text-sm text-slate-700">
								Start with the scale, then move into the piece with short, guided steps.
							</p>
						</div>
						<div class="shrink-0 sm:pt-2">
							{#if hasKeyAccess}
								<LinkButton href={`/unit/${code}/${pieceCode}/teach`} size="medium" color="green">
									Start guided practice
								</LinkButton>
							{:else}
								<LinkButton href={sheetMusicCta} size="medium">
									Get the sheet music to unlock
								</LinkButton>
							{/if}
						</div>
					</div>
				</div>
			</section>

			{#if piece.tracks && Object.values(piece.tracks).length > 0}
				<AudioPlayer {unit} {piece} />
			{/if}

			<nav aria-label="Piece navigation" class="mt-8 flex justify-between">
				{#if previousPiece}
					<a
						href={`/unit/${code}/${previousPiece.code}`}
						class="flex items-center gap-2 text-blue-700 underline decoration-2 underline-offset-4 hover:text-blue-800"
					>
						← {previousPiece.label}
					</a>
				{:else}
					<div></div>
				{/if}

				{#if nextPiece}
					<a
						href={`/unit/${code}/${nextPiece.code}`}
						class="flex items-center gap-2 text-blue-700 underline decoration-2 underline-offset-4 hover:text-blue-800"
					>
						{nextPiece.label} →
					</a>
				{/if}
			</nav>

			<section class="mt-8">
				<h3 class="text-sm font-semibold text-slate-800">Learn through games</h3>
				<GameCardGrid>
					{#each visibleGameCards as game}
						<GameCard
							href={`/unit/${code}/${pieceCode}/${game.slug}`}
							icon={game.icon}
							title={game.title}
							description={game.description}
							badgeText={badgeTexts[game.slug]}
							disabled={game.locked}
						/>
					{/each}
				</GameCardGrid>
			</section>
		</article>
	</div>
</div>
