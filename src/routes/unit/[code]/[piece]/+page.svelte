<script lang="ts">
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import AudioPlayer from '$lib/components/audio/AudioPlayer.svelte';
	import blocksIcon from '$lib/assets/blocks_icon.png';
	import scalesIcon from '$lib/assets/scales_icon.png';
	import stepsIcon from '$lib/assets/steps_icon.png';
	import defendIcon from '$lib/assets/defend_icon.png';
	import { initUnitKeyAccess } from '$lib/util/initUnitKeyAccess';

	const sheetMusicCta = '/units'; // TODO: replace with live store link when available

	const { data } = $props();
	const { piece, code, pieceCode, previousPiece, nextPiece, unit } = $derived(data);
	let hasKeyAccess = $state(false);

	$effect(() => {
		// Initialize key access from URL or localStorage
		hasKeyAccess = initUnitKeyAccess(code, unit.keyCode);
	});
</script>

<div class="min-h-screen bg-off-white px-4 py-8">
	<div class="mx-auto w-full max-w-3xl">
		<article class="rounded-2xl bg-white p-8 shadow-md">
			<h1 class="text-3xl font-semibold text-slate-900">{piece.label}</h1>
			<p class="mb-8">From {unit.title}</p>

			<AudioPlayer {unit} {piece} />

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

			{#if !hasKeyAccess}
				<section class="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
					<p class="text-sm text-slate-700">
						Want the sheet music and printable QR? Get the full pack to unlock everything.
					</p>
					<div class="mt-3">
						<LinkButton href={sheetMusicCta} size="small">Get the sheet music</LinkButton>
					</div>
				</section>
			{/if}

			<section class="mt-8">
				<h3 class="text-sm font-semibold text-slate-800">Learn through games</h3>
				<div class="game-grid">
					{#if hasKeyAccess}
						<a
							href={`/unit/${code}/${pieceCode}/melody`}
							class="game-card"
							aria-label="Play Melody game - Play through the piece"
						>
							<div class="game-card__content">
								<div
									class="flex h-16 w-16 items-center justify-center text-4xl sm:h-20 sm:w-20"
									aria-hidden="true"
								>
									🎵
								</div>
								<span class="mt-3 font-semibold text-slate-900">Melody</span>
								<span class="mt-1 text-sm text-slate-600">Play through the piece</span>
							</div>
						</a>
					{/if}
					<a
						href={`/unit/${code}/${pieceCode}/blocks`}
						class="game-card"
						aria-label="Play Blocks game - Practice random phrases"
					>
						<div class="game-card__content">
							<img src={blocksIcon} alt="" class="h-16 w-16 sm:h-20 sm:w-20" />
							<span class="mt-3 font-semibold text-slate-900">Blocks</span>
							<span class="mt-1 text-sm text-slate-600">Practice random phrases</span>
						</div>
					</a>
					<a
						href={`/unit/${code}/${pieceCode}/scales`}
						class="game-card"
						aria-label="Play Scales game - Climb up and down the scale"
					>
						<div class="game-card__content">
							<img src={scalesIcon} alt="" class="h-16 w-16 sm:h-20 sm:w-20" />
							<span class="mt-3 font-semibold text-slate-900">Scales</span>
							<span class="mt-1 text-sm text-slate-600">Climb up and down the scale</span>
						</div>
					</a>
					<a
						href={`/unit/${code}/${pieceCode}/steps`}
						class="game-card"
						aria-label="Play Steps game - Play note pairs"
					>
						<div class="game-card__content">
							<img src={stepsIcon} alt="" class="h-16 w-16 sm:h-20 sm:w-20" />
							<span class="mt-3 font-semibold text-slate-900">Steps</span>
							<span class="mt-1 text-sm text-slate-600">Play note pairs</span>
						</div>
					</a>
					{#if hasKeyAccess}
						<a
							href={`/unit/${code}/${pieceCode}/defend`}
							class="game-card"
							aria-label="Play Defend game - Use the piece's notes to defend against space monsters"
						>
							<div class="game-card__content">
								<div class="flex h-16 w-16 items-center justify-center text-4xl sm:h-20 sm:w-20">
									<img src={defendIcon} alt="" class="h-16 w-16 sm:h-20 sm:w-20" />
								</div>
								<span class="mt-3 font-semibold text-slate-900">Defend</span>
								<span class="mt-1 text-sm text-slate-600"
									>Use the piece's notes to defend against space monsters</span
								>
							</div>
						</a>
					{/if}
				</div>
			</section>
		</article>
	</div>
</div>

<style>
	.game-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
	@media (min-width: 640px) {
		.game-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 1rem;
		}
	}
	.game-card {
		position: relative;
		display: block;
		border-radius: 0.75rem;
		background: white;
		border: 1px solid rgb(226 232 240);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
		overflow: hidden;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			background-color 150ms ease;
	}
	.game-card::before {
		content: '';
		display: block;
		padding-bottom: 100%; /* square */
	}
	.game-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
		background: rgb(248 250 252);
	}
	.game-card__content {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.75rem;
		text-align: center;
	}
</style>
