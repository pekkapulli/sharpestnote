<script lang="ts">
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const formatter = new Intl.DateTimeFormat('en-GB', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});

	function formatTimestamp(value: string): string {
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return 'Unknown';
		return formatter.format(parsed);
	}
</script>

<svelte:head>
	<title>My Pieces - Teacher Tools - The Sharpest Note</title>
</svelte:head>

<div class="min-h-screen bg-off-white">
	<section class="mx-auto w-full max-w-6xl px-4 pt-20 pb-8">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-sm font-semibold tracking-wide text-brand-green uppercase">Teacher tools</p>
				<h1 class="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">My pieces</h1>
				<p class="mt-3 max-w-2xl text-sm text-slate-700 sm:text-base">
					Saved drafts and shared student pieces for {data.teacherEmail || 'your account'}.
				</p>
			</div>
			<div class="sm:pb-1">
				<LinkButton href="/teachers/composer" color="green" size="medium">+ New piece</LinkButton>
			</div>
		</div>
	</section>

	<section class="mx-auto w-full max-w-6xl px-4 pb-20">
		{#if data.loadError}
			<p class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{data.loadError}
			</p>
		{/if}

		{#if data.pieces.length === 0}
			<div class="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
				<p class="text-lg font-semibold text-slate-900">No pieces yet</p>
				<p class="mt-2 text-slate-600">
					Create your first piece in Composer to see it listed here.
				</p>
				<div class="mt-6 flex justify-center">
					<LinkButton href="/teachers/composer" color="green" size="medium">+ New piece</LinkButton>
				</div>
			</div>
		{:else}
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
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 bg-white">
							{#each data.pieces as piece (piece.id)}
								<tr>
									<td class="px-4 py-4 align-top">
										<p class="font-semibold text-slate-900">{piece.pieceLabel}</p>
										<p class="mt-1 text-xs text-slate-500">Code: {piece.pieceCode}</p>
									</td>
									<td class="px-4 py-4 align-top text-sm text-slate-700">{piece.instrument}</td>
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
											<a
												class="font-semibold text-brand-green hover:underline"
												href={piece.composerUrl}>Edit in Composer</a
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
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</section>
</div>
