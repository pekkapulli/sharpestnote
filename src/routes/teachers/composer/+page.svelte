<script lang="ts">
	import searchIcon from '$lib/assets/search_icon.svg';
	import trashIcon from '$lib/assets/trash_icon.svg';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import PiecesArray from '$lib/components/composer/PiecesArray.svelte';
	import PiecesList from '$lib/components/composer/PiecesList.svelte';
	import type { PageData } from './$types';
	import { instrumentConfigs } from '$lib/config/instruments';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let deletedPieceIds = $state<string[]>([]);
	let pieceSearch = $state('');
	const visiblePieces = $derived(
		data.pieces.filter((piece) => !deletedPieceIds.includes(piece.id))
	);
	const normalizedPieceSearch = $derived(pieceSearch.trim().toLowerCase());
	const filteredVisiblePieces = $derived(
		normalizedPieceSearch
			? visiblePieces.filter((piece) => {
					const instrument = formatInstrument(piece.instrument).toLowerCase();
					return (
						piece.pieceLabel.toLowerCase().includes(normalizedPieceSearch) ||
						piece.pieceCode.toLowerCase().includes(normalizedPieceSearch) ||
						instrument.includes(normalizedPieceSearch)
					);
				})
			: visiblePieces
	);
	let isDeleteModalOpen = $state(false);
	let pieceToDelete = $state<(typeof data.pieces)[number] | null>(null);
	let isDeletingPiece = $state(false);
	let deleteError = $state('');
	let deleteStatus = $state('');

	const formatter = new Intl.DateTimeFormat('en-GB', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
	const instrumentLabelById: Map<string, string> = new Map(
		instrumentConfigs.map((config) => [config.id as string, config.label])
	);

	function formatTimestamp(value: string): string {
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return 'Unknown';
		return formatter.format(parsed);
	}

	function formatInstrument(instrumentId: string): string {
		return instrumentLabelById.get(instrumentId) ?? instrumentId;
	}

	function openDeleteModal(piece: (typeof data.pieces)[number]) {
		pieceToDelete = piece;
		deleteError = '';
		deleteStatus = '';
		isDeleteModalOpen = true;
	}

	function closeDeleteModal() {
		if (isDeletingPiece) return;
		isDeleteModalOpen = false;
		pieceToDelete = null;
		deleteError = '';
	}

	async function confirmDeletePiece() {
		if (!pieceToDelete || isDeletingPiece) return;

		isDeletingPiece = true;
		deleteError = '';

		try {
			const response = await fetch(`/api/teacher-pieces/${pieceToDelete.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => ({}))) as { error?: string };
				throw new Error(payload.error || 'Unable to delete piece.');
			}

			const deletedLabel = pieceToDelete.pieceLabel;
			deletedPieceIds = [...deletedPieceIds, pieceToDelete.id];
			isDeleteModalOpen = false;
			pieceToDelete = null;
			deleteStatus = `Deleted "${deletedLabel}".`;
		} catch (error) {
			deleteError = error instanceof Error ? error.message : 'Unable to delete piece.';
		} finally {
			isDeletingPiece = false;
		}
	}
</script>

<svelte:head>
	<title>My Pieces - Teacher Tools - The Sharpest Note</title>
</svelte:head>

<div class="min-h-screen bg-off-white">
	<section class="mx-auto w-full max-w-6xl px-4 pt-20 pb-8">
		<p class="text-sm font-semibold tracking-wide text-brand-green uppercase">Teacher tools</p>
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h1 class="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">My pieces</h1>
				<p class="mt-3 max-w-2xl text-sm text-slate-700 sm:text-base">
					Saved drafts and shared student pieces for {data.teacherEmail || 'your account'}.
				</p>
			</div>
		</div>
	</section>

	<section class="mx-auto w-full max-w-6xl px-4 pb-20">
		{#if visiblePieces.length !== 0}
			<div
				class="mb-2 flex w-full flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between"
			>
				<div class="relative w-full sm:max-w-sm">
					<label class="sr-only" for="piece-search">Search pieces</label>
					<img
						src={searchIcon}
						alt=""
						aria-hidden="true"
						class="pointer-events-none absolute top-1/2 left-3 h-6 w-6 -translate-y-1/2"
					/>
					<input
						id="piece-search"
						type="search"
						bind:value={pieceSearch}
						placeholder="Search by title or instrument"
						autocomplete="off"
						class="w-full rounded-lg border border-slate-300 bg-white py-2 pr-10 pl-10 text-sm text-slate-900 shadow-sm transition outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/25"
					/>
					{#if pieceSearch.trim()}
						<button
							type="button"
							onclick={() => (pieceSearch = '')}
							aria-label="Clear piece search"
							class="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:outline-none"
						>
							<span aria-hidden="true" class="text-base leading-none">×</span>
						</button>
					{/if}
				</div>
				<div class="flex justify-end">
					<LinkButton href="/teachers/composer/edit" color="green" size="medium"
						>+ New piece</LinkButton
					>
				</div>
			</div>
		{/if}
		{#if data.loadError}
			<p class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{data.loadError}
			</p>
		{/if}
		{#if deleteStatus}
			<p
				class="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
			>
				{deleteStatus}
			</p>
		{/if}

		{#if visiblePieces.length === 0}
			<div class="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
				<p class="text-lg font-semibold text-slate-900">No pieces yet</p>
				<p class="mt-2 text-slate-600">
					Create your first piece in Composer to see it listed here.
				</p>
				<div class="mt-6 flex justify-center">
					<LinkButton href="/teachers/composer/edit" color="green" size="medium"
						>+ New piece</LinkButton
					>
				</div>
			</div>
		{:else if filteredVisiblePieces.length === 0}
			<div class="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
				<p class="text-lg font-semibold text-slate-900">No matching pieces</p>
				<p class="mt-2 text-slate-600">
					No pieces match "{pieceSearch.trim()}". Try a different search term.
				</p>
			</div>
		{:else}
			<div class="md:hidden">
				<PiecesList
					pieces={filteredVisiblePieces}
					{formatTimestamp}
					{formatInstrument}
					onDelete={openDeleteModal}
					{trashIcon}
				/>
			</div>
			<div class="hidden md:block">
				<PiecesArray
					pieces={filteredVisiblePieces}
					{formatTimestamp}
					{formatInstrument}
					onDelete={openDeleteModal}
					{trashIcon}
				/>
			</div>
		{/if}
	</section>
</div>

<Modal
	isOpen={isDeleteModalOpen}
	onClose={closeDeleteModal}
	title="Delete piece"
	icon={trashIcon}
	maxWidth="md"
>
	<p class="text-sm text-slate-700">
		Delete
		<span class="font-semibold text-slate-900">{pieceToDelete?.pieceLabel ?? 'this piece'}</span>?
		This also removes its short share link and cannot be undone.
	</p>
	{#if deleteError}
		<p class="mt-3 text-sm font-medium text-red-700">{deleteError}</p>
	{/if}
	<div class="mt-6 flex justify-end gap-3">
		<Button
			type="button"
			size="medium"
			color="secondary"
			onclick={closeDeleteModal}
			disabled={isDeletingPiece}>Cancel</Button
		>
		<button
			type="button"
			onclick={confirmDeletePiece}
			disabled={isDeletingPiece}
			class="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{isDeletingPiece ? 'Deleting...' : 'Delete piece'}
		</button>
	</div>
</Modal>
