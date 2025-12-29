<script lang="ts">
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import AudioPlayer from '$lib/components/audio/AudioPlayer.svelte';
	import blocksIcon from '$lib/assets/blocks_icon.png';
	import scalesIcon from '$lib/assets/scales_icon.png';
	import stepsIcon from '$lib/assets/steps_icon.png';

	const sheetMusicCta = '/store'; // TODO: replace with live store link when available

	const { data } = $props();
	const { piece, code, pieceCode, previousPiece, nextPiece, hasKeyAccess, keyQuery } =
		$derived(data);
</script>

<div class="min-h-screen bg-off-white px-4 py-8">
	<div class="mx-auto w-full max-w-3xl">
		<nav class="mb-4">
			<LinkButton href={`/unit/${code}${keyQuery}`}>← Back to unit</LinkButton>
		</nav>

		<article class="rounded-2xl bg-white p-8 shadow-md">
			<h1 class="text-3xl font-semibold text-slate-900">{piece.label}</h1>

			<AudioPlayer unit={code} tracks={piece.tracks} />

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
				<h3 class="text-sm font-semibold text-slate-800">Games</h3>
				<div class="game-grid">
					<a href={`/unit/${code}/${pieceCode}/blocks${keyQuery}`} class="game-card">
						<div class="game-card__content">
							<img src={blocksIcon} alt="" class="h-16 w-16 sm:h-20 sm:w-20" />
							<span class="mt-3 font-semibold text-slate-900">Blocks</span>
							<span class="mt-1 text-sm text-slate-600">Practice random phrases</span>
						</div>
					</a>
					<a href={`/unit/${code}/${pieceCode}/scales${keyQuery}`} class="game-card">
						<div class="game-card__content">
							<img src={scalesIcon} alt="" class="h-16 w-16 sm:h-20 sm:w-20" />
							<span class="mt-3 font-semibold text-slate-900">Scales</span>
							<span class="mt-1 text-sm text-slate-600">Climb up and down the scale</span>
						</div>
					</a>
					<a href={`/unit/${code}/${pieceCode}/steps${keyQuery}`} class="game-card">
						<div class="game-card__content">
							<img src={stepsIcon} alt="" class="h-16 w-16 sm:h-20 sm:w-20" />
							<span class="mt-3 font-semibold text-slate-900">Steps</span>
							<span class="mt-1 text-sm text-slate-600">Play note pairs</span>
						</div>
					</a>
				</div>
			</section>

			<section class="mt-8 flex justify-between">
				{#if previousPiece}
					<a
						href={`/unit/${code}/${previousPiece.code}${keyQuery}`}
						class="flex items-center gap-2 text-blue-700 underline decoration-2 underline-offset-4 hover:text-blue-800"
					>
						← {previousPiece.label}
					</a>
				{:else}
					<div></div>
				{/if}

				{#if nextPiece}
					<a
						href={`/unit/${code}/${nextPiece.code}${keyQuery}`}
						class="flex items-center gap-2 text-blue-700 underline decoration-2 underline-offset-4 hover:text-blue-800"
					>
						{nextPiece.label} →
					</a>
				{/if}
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
