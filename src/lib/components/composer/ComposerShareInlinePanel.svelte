<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ComposerShareRenewAction from '$lib/components/composer/ComposerShareRenewAction.svelte';

	interface Props {
		errors: string[];
		shareError: string;
		hasShareState: boolean;
		shareCreditSummary?: string;
		recommendationCreditSummary?: string;
		publishedChangeWarning?: string;
		shareCreditCost?: number;
		teacherShareNote?: string;
		onRenewShareUrl?: () => Promise<void> | void;
		onSavePiece: () => Promise<void> | void;
		isSavingPiece: boolean;
		isPreparingShareUrl: boolean;
		isRenewingShareUrl?: boolean;
		onOpenShareModal: () => void;
		isShareBlocked: boolean;
		hasSavedPiece: boolean;
		hasUnsavedPieceChanges: boolean;
		hasSharedPiece: boolean;
		hasActiveShareLink: boolean;
		shareLinkExpiresAt: string;
		shareStatus: string;
		isShareModalOpen: boolean;
	}

	let {
		errors,
		shareError,
		hasShareState,
		shareCreditSummary,
		recommendationCreditSummary,
		publishedChangeWarning,
		shareCreditCost = 1,
		teacherShareNote = $bindable(''),
		onRenewShareUrl = () => {},
		onSavePiece,
		isSavingPiece,
		isPreparingShareUrl,
		isRenewingShareUrl = false,
		onOpenShareModal,
		isShareBlocked,
		hasSavedPiece,
		hasUnsavedPieceChanges,
		hasSharedPiece,
		hasActiveShareLink,
		shareLinkExpiresAt,
		shareStatus,
		isShareModalOpen
	}: Props = $props();

	const daysUntilShareExpiry = $derived.by(() => {
		if (!shareLinkExpiresAt) return null;
		const expiresAt = new Date(shareLinkExpiresAt);
		if (Number.isNaN(expiresAt.getTime())) return null;
		return (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
	});
	const isLifecycleExpiring = $derived.by(() => {
		if (!hasSharedPiece || !hasActiveShareLink) return false;
		if (daysUntilShareExpiry === null) return false;
		return daysUntilShareExpiry <= 30;
	});
	const showInlineRenewAction = $derived.by(() => {
		return hasActiveShareLink && isLifecycleExpiring;
	});
	const publishStateLabel = $derived.by(() => {
		if (!hasSavedPiece) {
			return 'Draft';
		}

		if (!hasSharedPiece) {
			return hasUnsavedPieceChanges ? 'Draft, changes pending' : 'Draft';
		}

		if (!hasActiveShareLink) {
			return 'Reassign';
		}

		if (isLifecycleExpiring) {
			return 'Expiring';
		}

		return hasUnsavedPieceChanges ? 'Active, changes pending' : 'Active';
	});
	const publishStateTone = $derived.by(() => {
		if (hasSharedPiece && !hasActiveShareLink) {
			return 'border-amber-300 bg-amber-50 text-amber-900';
		}

		if (hasSharedPiece && isLifecycleExpiring) {
			return 'border-amber-300 bg-amber-50 text-amber-900';
		}

		if (hasSharedPiece) {
			return hasUnsavedPieceChanges
				? 'border-amber-300 bg-amber-50 text-amber-900'
				: 'border-emerald-300 bg-emerald-50 text-emerald-900';
		}

		if (hasSavedPiece) {
			return hasUnsavedPieceChanges
				? 'border-amber-300 bg-amber-50 text-amber-900'
				: 'border-slate-300 bg-slate-100 text-slate-700';
		}

		return 'border-slate-300 bg-slate-100 text-slate-700';
	});
	const shareCardIntro = $derived.by(() => {
		if (hasSharedPiece) {
			if (!hasActiveShareLink) {
				return 'This assignment is ready to reassign. Create a new assignment link to make it active again.';
			}

			return hasUnsavedPieceChanges
				? 'This assignment is active. Save changes before sharing the assignment so students get your latest version.'
				: 'This assignment is active. You can reuse the active assignment link or share the assignment again.';
		}

		if (hasSavedPiece) {
			return 'This assignment is saved privately. Share the assignment when you are ready for students to see it.';
		}

		return 'Save privately for free, then share the assignment when you are ready.';
	});
	const saveButtonLabel = $derived.by(() => {
		if (isSavingPiece) return 'Saving...';
		if (hasSharedPiece) return 'Save assignment changes';
		return 'Save draft';
	});
	const shareButtonLabel = $derived.by(() => {
		const prefix = hasUnsavedPieceChanges ? 'Save and ' : '';
		if (hasSharedPiece && !hasActiveShareLink) {
			return `${prefix}Reassign`;
		}
		return `${prefix}Share the assignment`;
	});
</script>

<div>
	<div>
		<div class="flex flex-wrap items-center gap-3">
			<h2 class="text-xl font-semibold text-slate-900">Share the assignment</h2>
			<span
				class={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${publishStateTone}`}
			>
				{publishStateLabel}
			</span>
		</div>
		<p class="mt-1 text-sm text-slate-600">{shareCardIntro}</p>
	</div>
</div>

{#if errors.length > 0}
	<div class="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
		<p class="font-semibold">Fix these before sharing:</p>
		<ul class="mt-2 list-disc pl-5">
			{#each errors as error (error)}
				<li>{error}</li>
			{/each}
		</ul>
	</div>
{:else if shareError}
	<div class="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
		{shareError}
	</div>
{/if}

<div class="mt-5 space-y-4">
	{#if hasShareState}
		<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
			<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Assignment state</p>
			{#if shareCreditSummary}
				<p class="mt-2 text-sm text-slate-700">{shareCreditSummary}</p>
			{/if}
			{#if recommendationCreditSummary}
				<p class="mt-2 text-sm text-emerald-900">{recommendationCreditSummary}</p>
			{/if}
			{#if publishedChangeWarning}
				<p class="mt-2 text-sm font-medium text-amber-800">{publishedChangeWarning}</p>
			{/if}
			{#if showInlineRenewAction}
				<ComposerShareRenewAction
					{shareCreditCost}
					{isPreparingShareUrl}
					{isRenewingShareUrl}
					{isShareBlocked}
					{onRenewShareUrl}
				/>
			{/if}
		</div>
	{/if}

	<label class="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
		Teacher note
		<textarea
			bind:value={teacherShareNote}
			rows="5"
			placeholder="Add a note for the student about how to practice this piece."
			class="rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-800"
		></textarea>
	</label>

	<div class="flex flex-wrap gap-2">
		<Button
			type="button"
			size="medium"
			color="secondary"
			onclick={onSavePiece}
			disabled={errors.length > 0 || isSavingPiece || isPreparingShareUrl}
		>
			{saveButtonLabel}
		</Button>
		<Button
			type="button"
			size="medium"
			color="green"
			onclick={onOpenShareModal}
			disabled={errors.length > 0 || isPreparingShareUrl || isSavingPiece || isShareBlocked}
		>
			{shareButtonLabel}
		</Button>
	</div>

	{#if hasSavedPiece && hasUnsavedPieceChanges}
		<p class="text-sm text-amber-800">
			{hasSharedPiece
				? 'You have unsaved changes to an active assignment.'
				: 'You have unsaved draft changes.'}
		</p>
	{:else if hasSavedPiece && hasSharedPiece}
		<p class="text-sm text-slate-700">
			This assignment has been shared before. Save changes, then share the assignment with an active
			link or reassign it.
		</p>
	{:else if hasSavedPiece}
		<p class="text-sm text-slate-700">
			Draft saved privately. Share the assignment when you are ready.
		</p>
	{/if}

	{#if shareStatus}
		<p class="text-sm font-medium text-brand-green">{shareStatus}</p>
	{/if}
	{#if shareError && !isShareModalOpen}
		<p class="text-sm text-amber-800">{shareError}</p>
	{/if}
	{#if isShareBlocked}
		<p class="text-sm text-amber-800">
			You need at least 1 credit to create a new assignment link.
		</p>
	{/if}
</div>
