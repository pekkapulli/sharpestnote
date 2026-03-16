<script lang="ts">
	type Piece = {
		id: string;
		pieceCode: string;
		pieceLabel: string;
		instrument: string;
		createdAt: string;
		updatedAt: string;
		isPublished: boolean;
		composerUrl: string;
		shareUrl: string | null;
	};

	interface Props {
		pieces: Piece[];
		formatTimestamp: (value: string) => string;
		formatInstrument: (instrumentId: string) => string;
		onDelete: (piece: Piece) => void;
		trashIcon: string;
	}

	let { pieces, formatTimestamp, formatInstrument, onDelete, trashIcon }: Props = $props();
</script>

<div class="space-y-3">
	{#each pieces as piece (piece.id)}
		<article class="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<div class="flex items-start justify-between gap-3">
				<div>
					<h2 class="text-base font-semibold text-slate-900">{piece.pieceLabel}</h2>
					<p class="mt-1 mb-0! text-sm text-slate-700">{formatInstrument(piece.instrument)}</p>
				</div>
				<div class="flex items-center gap-2">
					<div
						class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {piece.isPublished
							? 'bg-emerald-100 text-emerald-800'
							: 'bg-amber-100 text-amber-800'}"
					>
						{piece.isPublished ? 'Published' : 'Draft'}
					</div>
					<button
						type="button"
						onclick={() => onDelete(piece)}
						aria-label={`Delete ${piece.pieceLabel}`}
						title="Delete piece"
						class="inline-flex rounded-md p-0 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
					>
						<img src={trashIcon} alt="" class="h-8 w-8" />
					</button>
				</div>
			</div>

			<div>
				<p class="text-xs font-medium tracking-wide text-slate-500 uppercase">
					Updated {formatTimestamp(piece.updatedAt)}
				</p>
			</div>

			<div class="flex flex-wrap gap-3 text-sm">
				<a class="font-semibold text-brand-green hover:underline" href={piece.composerUrl}
					>Edit in Composer</a
				>
				{#if piece.shareUrl}
					<a class="text-slate-700 hover:underline" href={piece.shareUrl}>Open student page</a>
				{:else}
					<span class="text-slate-400">Share from Composer to publish</span>
				{/if}
			</div>
		</article>
	{/each}
</div>
