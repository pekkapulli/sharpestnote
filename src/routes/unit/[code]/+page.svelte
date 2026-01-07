<script lang="ts">
	import KeyEntry from '$lib/components/ui/KeyEntry.svelte';
	import { initUnitKeyAccess } from '$lib/util/initUnitKeyAccess';

	const { data } = $props();
	const { unit, code, imageUrl, instrumentLabel } = $derived(data);
	const hasExtras = $derived((unit.extraLinks?.length ?? 0) > 0);
	const sheetMusicCta = '/units'; // TODO: replace with live store link when available
	let imageLoaded = $state(false);
	let hasKeyAccess = $state(false);
	let showSuccessMessage = $state(false);

	$effect(() => {
		// Initialize key access from URL or localStorage
		void initUnitKeyAccess(code).then((access) => {
			hasKeyAccess = access;
		});
	});

	$effect(() => {
		// Reset loading state when the image URL changes
		imageLoaded = false;
		imageUrl;
	});

	function handleKeySuccess() {
		hasKeyAccess = true;
		showSuccessMessage = true;
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-off-white px-4 py-12">
	<article class="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-md">
		<div class="mb-6 w-full rounded-xl shadow-sm" style="position: relative; aspect-ratio: 1 / 1;">
			{#if !imageLoaded}
				<div class="shimmer bg-off-white" style="position: absolute; inset: 0;"></div>
			{/if}
			<img
				alt={`${unit.title} cover art`}
				class="object-cover"
				decoding="async"
				loading="lazy"
				onload={() => (imageLoaded = true)}
				style="position: absolute; inset: 0; width: 100%; height: 100%;"
				src={imageUrl}
			/>
		</div>
		<h1 class="text-3xl font-semibold text-slate-900">{unit.title}</h1>
		<p class="mt-1 text-sm font-semibold text-emerald-700">For {instrumentLabel}</p>
		<p class="mt-3 text-slate-700">
			{unit.description}
		</p>

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

		<section class="mt-8">
			<h3 class="text-sm font-semibold text-slate-800">Play the Pieces</h3>
			<div class="piece-grid">
				{#each unit.pieces as piece (piece.code)}
					<a href={`/unit/${code}/${piece.code}`} class="piece-card">
						<div class="piece-card__content">
							<span class="text-xl font-semibold text-slate-900">{piece.label}</span>
						</div>
					</a>
				{/each}
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
	@keyframes shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	.shimmer {
		border-radius: inherit;
		background-image: linear-gradient(
			90deg,
			rgba(248, 250, 252, 1) 0%,
			rgba(241, 245, 249, 1) 40%,
			rgba(248, 250, 252, 1) 80%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s linear infinite;
		will-change: background-position;
	}

	@media (prefers-reduced-motion: reduce) {
		.shimmer {
			animation: none;
		}
	}
	.piece-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
	.piece-card {
		display: block;
		border-radius: 0.75rem;
		background: white;
		border: 1px solid rgb(226 232 240);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
		padding: 1rem 2rem;
		text-decoration: none;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			background-color 150ms ease;
	}
	.piece-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
		background: rgb(248 250 252);
	}
	.piece-card__content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}
</style>
