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

<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
	<div class="overflow-x-auto">
		<table class="min-w-full divide-y divide-slate-200">
			<thead class="bg-slate-50">
				<tr>
					<th
						class="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
					>
						Piece
					</th>
					<th
						class="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
					>
						Instrument
					</th>
					<th
						class="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
					>
						Updated
					</th>
					<th
						class="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
					>
						Status
					</th>
					<th
						class="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
					>
						Actions
					</th>
					<th
						class="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
					>
						Delete
					</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 bg-white">
				{#each pieces as piece (piece.id)}
					<tr>
						<td class="px-4 py-4 align-top">
							<p class="font-semibold text-slate-900">{piece.pieceLabel}</p>
						</td>
						<td class="px-4 py-4 align-top text-sm text-slate-700">
							{formatInstrument(piece.instrument)}
						</td>
						<td class="px-4 py-4 align-top text-sm text-slate-700">
							{formatTimestamp(piece.updatedAt)}
						</td>
						<td class="px-4 py-4 align-top">
							<span
								class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {piece.isPublished
									? 'bg-emerald-100 text-emerald-800'
									: 'bg-amber-100 text-amber-800'}"
							>
								{piece.isPublished ? 'Published' : 'Draft'}
							</span>
						</td>
						<td class="px-4 py-4 align-top">
							<div class="flex flex-col gap-2 text-sm">
								<a class="font-semibold text-brand-green hover:underline" href={piece.composerUrl}
									>Edit in Composer</a
								>
								{#if piece.shareUrl}
									<a class="text-slate-700 hover:underline" href={piece.shareUrl}
										>Open student page</a
									>
								{:else}
									<span class="text-slate-400">Share from Composer to publish</span>
								{/if}
							</div>
						</td>
						<td class="px-4 py-4 align-top">
							<button
								type="button"
								onclick={() => onDelete(piece)}
								aria-label={`Delete ${piece.pieceLabel}`}
								title="Delete piece"
								class="inline-flex rounded-md p-0 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
							>
								<img src={trashIcon} alt="" class="h-8 w-8" />
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
