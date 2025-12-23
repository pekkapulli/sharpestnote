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
