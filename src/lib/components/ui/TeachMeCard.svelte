<script lang="ts">
	import LinkButton from '$lib/components/ui/LinkButton.svelte';

	interface Props {
		pieceLabel: string;
		unitCode: string;
		pieceCode: string;
		hasKeyAccess: boolean;
		sheetMusicCta: string;
		teachComplete?: boolean;
	}

	const { pieceLabel, unitCode, pieceCode, hasKeyAccess, sheetMusicCta, teachComplete }: Props =
		$props();
</script>

<section class="mt-8 mb-8">
	<div class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8 shadow-sm">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<p class="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
						Guided practice {#if teachComplete}
							<span class="text-emerald-600">✓</span>
						{/if}
					</p>
				</div>
				<h2 class="text-2xl font-semibold text-slate-900">Teach me {pieceLabel}</h2>
				<p class="text-sm text-slate-700">
					Start with the scale, then move into the piece with short, guided steps.
				</p>
			</div>
			<div class="shrink-0 sm:pt-2">
				{#if hasKeyAccess}
					<LinkButton href={`/unit/${unitCode}/${pieceCode}/teach`} size="large" color="green">
						{#if teachComplete}
							Teach again
						{:else}
							Start
						{/if}
					</LinkButton>
				{:else}
					<LinkButton href={sheetMusicCta} size="medium">Get the sheet music to unlock</LinkButton>
				{/if}
			</div>
		</div>
	</div>
</section>
