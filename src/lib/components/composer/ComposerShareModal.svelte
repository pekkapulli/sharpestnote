<script lang="ts">
	import TheSharpestNoteLogo from '$lib/assets/The Sharpest Note Logo.svg';
	import printIcon from '$lib/assets/print.svg';
	import type { KeySignature } from '$lib/config/keys';
	import type { MelodyItem } from '$lib/config/melody';
	import type { Clef } from '$lib/config/types';
	import ComposerPrintableSheet from '$lib/components/composer/ComposerPrintableSheet.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { formatShareLinkTimeRemaining } from '$lib/util/shareLinkExpiry';

	interface Props {
		pieceLabel: string;
		bars: MelodyItem[][];
		clef: Clef;
		keySignature: KeySignature;
		barLength?: number;
		teacherShareNote?: string;
		isOpen: boolean;
		onClose: () => void;
		isPreparingShareUrl: boolean;
		shareUrl: string;
		shareError: string;
		onCopyUrl: () => Promise<void> | void;
		onPrepareShareUrl: () => Promise<boolean>;
		onRenewShareUrl: () => Promise<void> | void;
		isRenewingShareUrl: boolean;
		shareCreditCost: number;
		hasActiveShareLink: boolean;
		isShareBlocked: boolean;
		hasSharedPiece: boolean;
		shareLinkExpiresAt: string;
		hasUnlimitedComposerCredits: boolean;
		hasReceivedRecommendationCredits: boolean;
		recommendationBonusCredits: number;
		hasShareState: boolean;
		shareCreditSummary?: string;
		recommendationCreditSummary?: string;
		publishedChangeWarning?: string;
	}

	let {
		pieceLabel,
		bars,
		clef,
		keySignature,
		barLength,
		teacherShareNote = '',
		isOpen,
		onClose,
		isPreparingShareUrl,
		shareUrl,
		shareError,
		onCopyUrl,
		onPrepareShareUrl,
		onRenewShareUrl,
		isRenewingShareUrl,
		shareCreditCost,
		hasActiveShareLink,
		isShareBlocked,
		hasSharedPiece,
		shareLinkExpiresAt,
		hasUnlimitedComposerCredits,
		hasReceivedRecommendationCredits,
		recommendationBonusCredits,
		hasShareState,
		shareCreditSummary,
		recommendationCreditSummary,
		publishedChangeWarning
	}: Props = $props();

	let qrCodeDataUrl = $state('');
	let qrCodeError = $state('');
	let copyActionStatus = $state('');
	let imageActionStatus = $state('');
	let pdfActionStatus = $state('');
	let isCopyConfirmed = $state(false);
	let copyFeedbackTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
	let isPreparingImage = $state(false);
	let isPreparingPdf = $state(false);
	let printableSheet = $state<{ exportPdf: () => Promise<void> } | null>(null);

	const trimmedPieceLabel = $derived(pieceLabel.trim() || 'Untitled piece');
	const trimmedTeacherShareNote = $derived(teacherShareNote.trim());
	const canCreateShareImage = $derived(
		shareUrl.trim().length > 0 && qrCodeDataUrl.length > 0 && !qrCodeError
	);
	const canUseNativeShare = $derived.by(() => {
		if (typeof navigator === 'undefined') return false;
		return typeof navigator.share === 'function';
	});
	const shareLinkTimeRemainingLabel = $derived.by(() => {
		if (!hasActiveShareLink) return undefined;
		const remaining = formatShareLinkTimeRemaining(shareLinkExpiresAt);
		return remaining ? `Time remaining: ${remaining}` : undefined;
	});
	const modalRecommendationCreditSummary = $derived.by(() => {
		if (hasUnlimitedComposerCredits) {
			return undefined;
		}

		if (hasReceivedRecommendationCredits && hasSharedPiece) {
			return `Great work! Your +${recommendationBonusCredits} recommendation credits have been added to your balance.`;
		}

		return recommendationCreditSummary;
	});

	async function ensureShareReadyForAction(): Promise<boolean> {
		if (isShareBlocked) {
			imageActionStatus = 'You need at least 1 credit to share the assignment.';
			pdfActionStatus = 'You need at least 1 credit to share the assignment.';
			return false;
		}

		if (shareUrl.trim().length > 0) return true;
		const isReady = await onPrepareShareUrl();
		if (!isReady) {
			imageActionStatus = 'Unable to prepare share link.';
			pdfActionStatus = 'Unable to prepare share link.';
		}
		return isReady;
	}

	async function handleRenewShareUrl() {
		if (isPreparingShareUrl || isRenewingShareUrl) return;
		await onRenewShareUrl();
	}

	async function waitForQrCodeReady(timeoutMs = 2200): Promise<boolean> {
		const start = Date.now();
		while (Date.now() - start < timeoutMs) {
			if (qrCodeError) return false;
			if (shareUrl.trim().length > 0 && qrCodeDataUrl.length > 0) return true;
			await new Promise((resolve) => setTimeout(resolve, 50));
		}

		return shareUrl.trim().length > 0 && qrCodeDataUrl.length > 0 && !qrCodeError;
	}

	function resetCopyFeedback() {
		if (copyFeedbackTimeout) {
			clearTimeout(copyFeedbackTimeout);
			copyFeedbackTimeout = null;
		}

		isCopyConfirmed = false;
		copyActionStatus = '';
	}

	function showCopyFeedback(message: string, isSuccess: boolean) {
		resetCopyFeedback();
		isCopyConfirmed = isSuccess;
		copyActionStatus = message;

		if (!isSuccess) {
			return;
		}

		copyFeedbackTimeout = setTimeout(() => {
			isCopyConfirmed = false;
			copyActionStatus = '';
			copyFeedbackTimeout = null;
		}, 5000);
	}

	async function handleCopyUrl() {
		if (isPreparingShareUrl || isShareBlocked) return;

		resetCopyFeedback();

		try {
			await onCopyUrl();
			showCopyFeedback('Copied to clipboard.', true);
		} catch {
			showCopyFeedback('Unable to copy link.', false);
		}
	}

	$effect(() => {
		if (!isOpen) {
			qrCodeDataUrl = '';
			qrCodeError = '';
			resetCopyFeedback();
			pdfActionStatus = '';
			isPreparingPdf = false;
			return;
		}

		const nextShareUrl = shareUrl.trim();
		let isActive = true;

		qrCodeDataUrl = '';
		qrCodeError = '';

		if (!nextShareUrl) {
			return () => {
				isActive = false;
			};
		}

		void import('qrcode')
			.then(({ toDataURL }) =>
				toDataURL(nextShareUrl, {
					margin: 1,
					width: 320,
					color: {
						dark: '#0f172a',
						light: '#0000'
					}
				})
			)
			.then((dataUrl) => {
				if (!isActive) return;
				qrCodeDataUrl = dataUrl;
			})
			.catch(() => {
				if (!isActive) return;
				qrCodeError = 'Unable to generate QR code preview.';
			});

		return () => {
			isActive = false;
		};
	});

	$effect(() => {
		return () => {
			if (copyFeedbackTimeout) {
				clearTimeout(copyFeedbackTimeout);
			}
		};
	});

	function sanitizeFileName(label: string): string {
		const fallback = 'sharpest-note-share';
		const normalized = label
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');

		return normalized || fallback;
	}

	type WrappedTextBlock = {
		lines: string[];
		lineHeight: number;
		height: number;
	};

	function wrapTextBlock(
		context: CanvasRenderingContext2D,
		text: string,
		maxWidth: number,
		lineHeight: number
	): WrappedTextBlock {
		const paragraphs = text.split(/\n/);
		const lines: string[] = [];

		for (const paragraph of paragraphs) {
			const words = paragraph.trim().split(/\s+/).filter(Boolean);

			if (words.length === 0) {
				lines.push('');
				continue;
			}

			let currentLine = words[0];

			for (let index = 1; index < words.length; index++) {
				const candidate = `${currentLine} ${words[index]}`;
				if (context.measureText(candidate).width <= maxWidth) {
					currentLine = candidate;
					continue;
				}

				lines.push(currentLine);
				currentLine = words[index];
			}

			lines.push(currentLine);
		}

		return {
			lines,
			lineHeight,
			height: Math.max(lines.length, 1) * lineHeight
		};
	}

	function drawRoundedRect(
		context: CanvasRenderingContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number
	) {
		context.beginPath();
		context.moveTo(x + radius, y);
		context.lineTo(x + width - radius, y);
		context.quadraticCurveTo(x + width, y, x + width, y + radius);
		context.lineTo(x + width, y + height - radius);
		context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		context.lineTo(x + radius, y + height);
		context.quadraticCurveTo(x, y + height, x, y + height - radius);
		context.lineTo(x, y + radius);
		context.quadraticCurveTo(x, y, x + radius, y);
		context.closePath();
	}

	function loadImage(src: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve(image);
			image.onerror = () => reject(new Error('Image failed to load.'));
			image.src = src;
		});
	}

	function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
		return new Promise((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (!blob) {
					reject(new Error('Canvas export failed.'));
					return;
				}

				resolve(blob);
			}, 'image/png');
		});
	}

	async function buildShareImageBlob(): Promise<{ blob: Blob; fileName: string }> {
		if (!canCreateShareImage) {
			throw new Error('Share image is not ready yet.');
		}

		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('Canvas is not available in this browser.');
		}

		const width = 800;
		const padding = 64;
		const qrSize = 480;
		const contentWidth = width - padding * 2;
		const titleLineHeight = 60;
		const noteLineHeight = 40;

		context.font = '700 48px ui-sans-serif, system-ui, sans-serif';
		const titleBlock = wrapTextBlock(context, trimmedPieceLabel, contentWidth, titleLineHeight);

		context.font = '400 28px ui-sans-serif, system-ui, sans-serif';
		const noteSource =
			trimmedTeacherShareNote || 'Open this piece, scan the QR code, and practice the assignment.';
		const noteBlock = wrapTextBlock(context, noteSource, contentWidth, noteLineHeight);

		const qrLabelHeight = 56;
		const logoTargetWidth = 180;
		const logoBottomGap = 36;
		const logoImage = await loadImage(TheSharpestNoteLogo);
		const logoHeight =
			logoImage.naturalWidth > 0
				? (logoImage.naturalHeight / logoImage.naturalWidth) * logoTargetWidth
				: 36;
		const height =
			padding +
			logoHeight +
			logoBottomGap +
			qrSize +
			qrLabelHeight +
			48 +
			titleBlock.height +
			24 +
			noteBlock.height +
			padding;

		canvas.width = width;
		canvas.height = height;

		context.fillStyle = '#f5f5f0';
		context.fillRect(0, 0, width, height);

		const backgroundGradient = context.createLinearGradient(0, 0, width, height);
		backgroundGradient.addColorStop(0, '#ffffff');
		backgroundGradient.addColorStop(1, '#e7f0eb');
		context.fillStyle = backgroundGradient;
		drawRoundedRect(context, 40, 40, width - 80, height - 80, 36);
		context.fill();

		const logoX = (width - logoTargetWidth) / 2;
		const logoY = padding;
		context.drawImage(logoImage, logoX, logoY, logoTargetWidth, logoHeight);

		const qrImage = await loadImage(qrCodeDataUrl);
		const qrCardX = (width - qrSize) / 2;
		const qrCardY = logoY + logoHeight + logoBottomGap;

		context.fillStyle = '#ffffff';
		drawRoundedRect(context, qrCardX - 24, qrCardY - 24, qrSize + 48, qrSize + 80, 28);
		context.shadowColor = 'rgba(15, 23, 42, 0.08)';
		context.shadowBlur = 28;
		context.fill();
		context.shadowColor = 'transparent';
		context.drawImage(qrImage, qrCardX, qrCardY, qrSize, qrSize);

		context.fillStyle = '#475569';
		context.font = '600 22px ui-sans-serif, system-ui, sans-serif';
		context.textAlign = 'center';
		context.fillText('Scan to open', width / 2, qrCardY + qrSize + 44);

		let currentY = qrCardY + qrSize + qrLabelHeight + 48;
		context.textAlign = 'left';
		context.fillStyle = '#0f172a';
		context.font = '700 48px ui-sans-serif, system-ui, sans-serif';
		for (const line of titleBlock.lines) {
			context.fillText(line, padding, currentY);
			currentY += titleBlock.lineHeight;
		}

		currentY += 24;
		context.fillStyle = '#334155';
		context.font = '400 28px ui-sans-serif, system-ui, sans-serif';
		for (const line of noteBlock.lines) {
			context.fillText(line, padding, currentY);
			currentY += noteBlock.lineHeight;
		}

		return {
			blob: await canvasToBlob(canvas),
			fileName: `${sanitizeFileName(trimmedPieceLabel)}-share.png`
		};
	}

	async function handleDownloadImage() {
		if (isPreparingImage || isPreparingShareUrl || isShareBlocked) return;

		isPreparingImage = true;
		imageActionStatus = '';

		try {
			const isShareReady = await ensureShareReadyForAction();
			if (!isShareReady) return;

			const isQrReady = await waitForQrCodeReady();
			if (!isQrReady) {
				throw new Error(qrCodeError || 'Preparing QR code preview. Please try again.');
			}

			const { blob, fileName } = await buildShareImageBlob();
			const objectUrl = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = objectUrl;
			anchor.download = fileName;
			document.body.appendChild(anchor);
			anchor.click();
			document.body.removeChild(anchor);
			URL.revokeObjectURL(objectUrl);
			imageActionStatus = 'PNG downloaded.';
		} catch (error) {
			imageActionStatus = error instanceof Error ? error.message : 'Unable to download PNG.';
		} finally {
			isPreparingImage = false;
		}
	}

	async function handleNativeShareImage() {
		if (isPreparingImage || isPreparingShareUrl || isShareBlocked) return;
		if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
			imageActionStatus = 'Native sharing is not available in this browser.';
			return;
		}

		isPreparingImage = true;
		imageActionStatus = '';

		try {
			const isShareReady = await ensureShareReadyForAction();
			if (!isShareReady) return;

			const isQrReady = await waitForQrCodeReady();
			if (!isQrReady) {
				throw new Error(qrCodeError || 'Preparing QR code preview. Please try again.');
			}

			const { blob, fileName } = await buildShareImageBlob();
			const file = new File([blob], fileName, { type: 'image/png' });

			if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
				imageActionStatus = 'This browser can share links, but not PNG files.';
				return;
			}

			await navigator.share({
				title: trimmedPieceLabel,
				text: trimmedTeacherShareNote || 'Practice assignment from The Sharpest Note',
				files: [file]
			});
			imageActionStatus = 'PNG shared.';
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				imageActionStatus = '';
				return;
			}

			imageActionStatus = error instanceof Error ? error.message : 'Unable to share image.';
		} finally {
			isPreparingImage = false;
		}
	}

	async function handleDownloadPdf() {
		if (
			isPreparingImage ||
			isPreparingPdf ||
			isPreparingShareUrl ||
			isShareBlocked ||
			!printableSheet
		)
			return;

		isPreparingPdf = true;
		pdfActionStatus = '';

		try {
			const isShareReady = await ensureShareReadyForAction();
			if (!isShareReady) return;

			const isQrReady = await waitForQrCodeReady();
			if (!isQrReady) {
				throw new Error(qrCodeError || 'Preparing QR code preview. Please try again.');
			}

			await printableSheet.exportPdf();
			pdfActionStatus = 'PDF downloaded.';
		} catch (error) {
			pdfActionStatus = error instanceof Error ? error.message : 'Unable to generate PDF.';
		} finally {
			isPreparingPdf = false;
		}
	}
</script>

<Modal {isOpen} {onClose} title="Share the assignment" maxWidth="xl">
	{#if hasShareState}
		<div class="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
			<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Share status</p>
			{#if shareCreditSummary}
				<p class="mt-2 text-sm text-slate-700">{shareCreditSummary}</p>
			{/if}

			{#if publishedChangeWarning}
				<p class="mt-2 text-sm font-medium text-amber-800">{publishedChangeWarning}</p>
			{/if}
			{#if shareLinkTimeRemainingLabel}
				<p class="mt-2 text-xs text-slate-500">{shareLinkTimeRemainingLabel}</p>
			{/if}
			{#if hasActiveShareLink}
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<Button
						type="button"
						size="medium"
						color="secondary"
						onclick={handleRenewShareUrl}
						disabled={isPreparingShareUrl || isRenewingShareUrl || isShareBlocked}
					>
						{isRenewingShareUrl ? 'Renewing link...' : `Renew link (${shareCreditCost} credit)`}
					</Button>
				</div>
			{/if}
			{#if modalRecommendationCreditSummary}
				<p
					class={`mt-2 text-sm ${hasReceivedRecommendationCredits && hasSharedPiece ? 'font-semibold text-emerald-800' : 'text-emerald-900'}`}
				>
					{modalRecommendationCreditSummary}
				</p>
			{/if}
		</div>
	{/if}

	<ComposerPrintableSheet
		bind:this={printableSheet}
		{pieceLabel}
		{bars}
		{clef}
		{keySignature}
		{barLength}
		{teacherShareNote}
		{shareUrl}
		{qrCodeDataUrl}
	/>

	<div class="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-5">
		<div>
			<div class="space-y-4">
				<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
					<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Share link</p>
					<p class="mt-2 text-sm text-slate-600">Copy the short link or share the QR image.</p>
					<div class="mt-3 flex flex-wrap gap-2"></div>
					<div class="flex flex-wrap gap-2">
						<Button
							type="button"
							size="medium"
							onclick={handleCopyUrl}
							disabled={isPreparingShareUrl || isRenewingShareUrl || isShareBlocked}
						>
							{isCopyConfirmed ? 'Copied!' : 'Copy link'}
						</Button>
						<Button
							type="button"
							size="medium"
							color="green"
							onclick={handleDownloadImage}
							disabled={isPreparingImage ||
								isPreparingShareUrl ||
								isRenewingShareUrl ||
								isShareBlocked}
						>
							{isPreparingImage ? 'Preparing image...' : 'Download QR code'}
						</Button>
						<Button
							type="button"
							size="medium"
							color="green"
							onclick={handleNativeShareImage}
							disabled={!canUseNativeShare ||
								isPreparingImage ||
								isPreparingShareUrl ||
								isRenewingShareUrl ||
								isShareBlocked}
						>
							Share QR code
						</Button>
						{#if qrCodeError}
							<p class="text-sm text-amber-800">{qrCodeError}</p>
						{/if}
					</div>
					{#if shareError}
						<p class="mt-2 text-sm text-amber-800">{shareError}</p>
					{/if}
					{#if copyActionStatus}
						<p
							class={`mt-2 text-sm font-medium ${isCopyConfirmed ? 'text-brand-green' : 'text-amber-800'}`}
						>
							{copyActionStatus}
						</p>
					{/if}
					{#if imageActionStatus}
						<p class="mt-2 text-sm font-medium text-brand-green">{imageActionStatus}</p>
					{/if}
					{#if !canUseNativeShare}
						<p class="mt-2 text-xs text-slate-500">
							Native image sharing depends on browser support.
						</p>
					{/if}
				</div>
			</div>
		</div>
		<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
			<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">PDF</p>
			<div class="flex flex-wrap gap-2">
				<Button
					type="button"
					size="medium"
					color="secondary"
					onclick={handleDownloadPdf}
					disabled={isPreparingImage ||
						isPreparingPdf ||
						isPreparingShareUrl ||
						isRenewingShareUrl ||
						isShareBlocked}
				>
					<img src={printIcon} alt="Print icon" class="h-8 w-8 flex-none" />
					{isPreparingPdf ? 'Preparing PDF...' : 'Download Sheet music PDF'}
				</Button>
			</div>
			{#if pdfActionStatus}
				<p class="mt-2 text-sm font-medium text-brand-green">{pdfActionStatus}</p>
			{/if}
		</div>
	</div>
</Modal>
