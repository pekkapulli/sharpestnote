<script lang="ts">
	import type { KeySignature } from '$lib/config/keys';
	import type { MelodyItem } from '$lib/config/melody';
	import type { Clef } from '$lib/config/types';
	import ComposerShareInlinePanel from '$lib/components/composer/ComposerShareInlinePanel.svelte';
	import ComposerShareModal from '$lib/components/composer/ComposerShareModal.svelte';
	import { formatShareLinkTimeRemaining } from '$lib/util/shareLinkExpiry';

	interface Props {
		pieceLabel: string;
		bars: MelodyItem[][];
		clef: Clef;
		keySignature: KeySignature;
		barLength?: number;
		teacherShareNote?: string;
		isShareModalOpen: boolean;
		onOpenShareModal: () => void;
		onCloseShareModal: () => void;
		isPreparingShareUrl: boolean;
		shareUrl: string;
		shareError: string;
		errors: string[];
		shareStatus: string;
		onSavePiece: () => Promise<void> | void;
		isSavingPiece: boolean;
		hasSavedPiece: boolean;
		hasUnsavedPieceChanges: boolean;
		hasSharedPiece: boolean;
		hasActiveShareLink: boolean;
		shareLinkExpiresAt: string;
		onCopyUrl: () => Promise<void> | void;
		onPrepareShareUrl: () => Promise<boolean>;
		onRenewShareUrl: () => Promise<void> | void;
		isRenewingShareUrl: boolean;
		hasUnlimitedComposerCredits: boolean;
		composerCredits: number | null;
		shareCreditCost: number;
		isShareBlocked: boolean;
		hasPendingRecommendationCredits: boolean;
		hasReceivedRecommendationCredits: boolean;
		recommendationBonusCredits: number;
	}

	let {
		pieceLabel,
		bars,
		clef,
		keySignature,
		barLength,
		teacherShareNote = $bindable(''),
		isShareModalOpen,
		onOpenShareModal,
		onCloseShareModal,
		isPreparingShareUrl,
		shareUrl,
		shareError,
		errors,
		shareStatus,
		onSavePiece,
		isSavingPiece,
		hasSavedPiece,
		hasUnsavedPieceChanges,
		hasSharedPiece,
		hasActiveShareLink,
		shareLinkExpiresAt,
		onCopyUrl,
		onPrepareShareUrl,
		onRenewShareUrl,
		isRenewingShareUrl,
		hasUnlimitedComposerCredits,
		composerCredits,
		shareCreditCost,
		isShareBlocked,
		hasPendingRecommendationCredits,
		hasReceivedRecommendationCredits,
		recommendationBonusCredits
	}: Props = $props();

	const normalizedComposerCredits = $derived.by(() => {
		if (typeof composerCredits === 'number' && Number.isFinite(composerCredits)) {
			return Math.max(0, Math.trunc(composerCredits));
		}

		return 0;
	});

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
	const creditsLabel = $derived.by(() => {
		if (hasUnlimitedComposerCredits) return 'You have unlimited credits';
		const credits = normalizedComposerCredits;
		return `${credits} credits remaining`;
	});
	const shareCreditSummary = $derived.by(() => {
		if (hasUnlimitedComposerCredits) {
			return undefined;
		}

		if (hasActiveShareLink) {
			return `This assignment has an active link. Reusing it costs 0 credits until it expires after 6 months. You can also renew this same link now for ${shareCreditCost} credit to reset it to a fresh 6 months. ${creditsLabel}.`;
		}

		if (hasSharedPiece) {
			return `This assignment is in Reassign state with no active link. Creating a new assignment link uses ${shareCreditCost} credit and stays active for 6 months. ${creditsLabel}.`;
		}

		return `Sharing this assignment for the first time uses ${shareCreditCost} credit. ${creditsLabel}.`;
	});
	const recommendationCreditSummary = $derived.by(() => {
		if (hasUnlimitedComposerCredits || !hasPendingRecommendationCredits) {
			return undefined;
		}

		if (hasSharedPiece) {
			return `Recommendation bonus pending: +${recommendationBonusCredits} credits will be added shortly for your first assignment share. Estimated balance after bonus: ${normalizedComposerCredits + recommendationBonusCredits}.`;
		}

		const estimatedAfterFirstPublish =
			Math.max(0, normalizedComposerCredits - shareCreditCost) + recommendationBonusCredits;
		return `Recommendation bonus ready: after your first assignment share, +${recommendationBonusCredits} credits are added. Estimated balance after first share: ${estimatedAfterFirstPublish}.`;
	});
	const publishedChangeWarning = $derived.by(() => {
		if (!hasSharedPiece) return undefined;
		if (hasUnsavedPieceChanges) {
			return 'Save before sharing the assignment so students open the latest version.';
		}

		if (!hasActiveShareLink) {
			return 'No active assignment link found. Renew to create a new active link.';
		}

		if (isLifecycleExpiring) {
			const remaining = formatShareLinkTimeRemaining(shareLinkExpiresAt);
			return remaining
				? `Time remaining: ${remaining}. Renew the link to extend by six months (1 credit).`
				: 'This assignment link is expiring soon. Renew the link to extend by six months (1 credit).';
		}

		return undefined;
	});

	const hasShareState = $derived(
		!!shareCreditSummary || !!recommendationCreditSummary || !!publishedChangeWarning
	);
</script>

<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
	<ComposerShareInlinePanel
		{errors}
		{shareError}
		{hasShareState}
		{shareCreditSummary}
		{recommendationCreditSummary}
		{publishedChangeWarning}
		{shareCreditCost}
		bind:teacherShareNote
		{onRenewShareUrl}
		{onSavePiece}
		{isSavingPiece}
		{isPreparingShareUrl}
		{isRenewingShareUrl}
		{onOpenShareModal}
		{isShareBlocked}
		{hasSavedPiece}
		{hasUnsavedPieceChanges}
		{hasSharedPiece}
		{hasActiveShareLink}
		{shareLinkExpiresAt}
		{shareStatus}
		{isShareModalOpen}
	/>

	<ComposerShareModal
		{pieceLabel}
		{bars}
		{clef}
		{keySignature}
		{barLength}
		{teacherShareNote}
		isOpen={isShareModalOpen}
		onClose={onCloseShareModal}
		{isPreparingShareUrl}
		{shareUrl}
		{shareError}
		{onCopyUrl}
		{onPrepareShareUrl}
		{onRenewShareUrl}
		{isRenewingShareUrl}
		{shareCreditCost}
		{hasActiveShareLink}
		{isShareBlocked}
		{hasSharedPiece}
		{shareLinkExpiresAt}
		{hasUnlimitedComposerCredits}
		{hasReceivedRecommendationCredits}
		{recommendationBonusCredits}
		{hasShareState}
		{shareCreditSummary}
		{recommendationCreditSummary}
		{publishedChangeWarning}
	/>
</div>
