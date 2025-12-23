<script lang="ts">
	import AudioPlayer from '$lib/components/audio/AudioPlayer.svelte';

	const { data } = $props();
	const { unit, code } = $derived(data);
	const hasExtras = $derived((unit.extraLinks?.length ?? 0) > 0);
</script>

<div class="flex min-h-screen items-center justify-center bg-off-white px-4 py-12">
	<article class="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-md">
		<p class="text-xs tracking-[0.15em] text-slate-500 uppercase">Extra materials</p>
		<h1 class="mt-2 text-3xl font-semibold text-slate-900">{unit.title}</h1>
		<p class="mt-2 text-slate-700">{unit.description}</p>
		<p class="mt-1 text-xs text-slate-500">Code: {code}</p>

		<AudioPlayer unit={code} tracks={unit.tracks} />

		<section class="mt-8">
			<h3 class="text-sm font-semibold text-slate-800">Games</h3>
			<div class="game-grid">
				<a href={`/unit/${code}/blocks`} class="game-card">
					<div class="game-card__content">
						<span class="text-6xl sm:text-7xl" aria-hidden="true">🧩</span>
						<span class="mt-3 text-sm font-semibold text-slate-900">Blocks</span>
						<span class="mt-1 text-xs text-slate-600">Practice random phrases</span>
					</div>
				</a>
				<a href={`/unit/${code}/scales`} class="game-card">
					<div class="game-card__content">
						<span class="text-6xl sm:text-7xl" aria-hidden="true">🎼</span>
						<span class="mt-3 text-sm font-semibold text-slate-900">Scales</span>
						<span class="mt-1 text-xs text-slate-600">Up and down</span>
					</div>
				</a>
			</div>
		</section>

		{#if hasExtras}
			<section class="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
				<p class="text-sm font-semibold text-slate-800">Extras</p>
				<ul class="mt-3 space-y-2">
					{#each unit.extraLinks ?? [] as link}
						<li>
							<a
								class="text-blue-700 underline decoration-2 underline-offset-4 hover:text-blue-800"
								href={link.url}
								target="_blank"
								rel="noreferrer"
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section
			class="mt-10 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
		>
			<p>Scanned the wrong code? <a class="underline" href="/">Go home</a></p>
			<p>
				Need help? Email <a class="underline" href="mailto:support@sharpestnote.com"
					>support@sharpestnote.com</a
				>
			</p>
		</section>
	</article>
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
