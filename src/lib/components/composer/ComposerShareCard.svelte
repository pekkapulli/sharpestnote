<script lang="ts">
	import QRCode from 'qrcode';

	interface Props {
		pieceLabel: string;
		teacherShareNote?: string;
		shareUrl: string;
		shareError: string;
		errors: string[];
		shareStatus: string;
		onCopyUrl: () => void;
	}

	let {
		pieceLabel,
		teacherShareNote = $bindable(''),
		shareUrl,
		shareError,
		errors,
		shareStatus,
		onCopyUrl
	}: Props = $props();

	let qrCodeDataUrl = $state('');
	let qrCodeError = $state('');
	let imageActionStatus = $state('');
	let isPreparingImage = $state(false);

	const trimmedPieceLabel = $derived(pieceLabel.trim() || 'Untitled piece');
	const trimmedTeacherShareNote = $derived(teacherShareNote.trim());
	const canCreateShareImage = $derived(shareUrl.trim().length > 0 && qrCodeDataUrl.length > 0);
	const canUseNativeShare = $derived.by(() => {
		if (typeof navigator === 'undefined') return false;
		return typeof navigator.share === 'function';
	});

	$effect(() => {
		const nextShareUrl = shareUrl.trim();
		let isActive = true;

		qrCodeDataUrl = '';
		qrCodeError = '';

		if (!nextShareUrl) {
			return () => {
				isActive = false;
			};
		}

		void QRCode.toDataURL(nextShareUrl, {
			margin: 1,
			width: 320,
			color: {
				dark: '#0f172a',
				light: '#0000'
			}
		})
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

		const width = 1600;
		const padding = 96;
		const qrSize = 420;
		const gap = 56;
		const bodyWidth = width - padding * 2 - qrSize - gap;
		const titleLineHeight = 78;
		const noteLineHeight = 44;

		context.font = '700 64px ui-sans-serif, system-ui, sans-serif';
		const titleBlock = wrapTextBlock(context, trimmedPieceLabel, bodyWidth, titleLineHeight);

		context.font = '400 34px ui-sans-serif, system-ui, sans-serif';
		const noteSource =
			trimmedTeacherShareNote || 'Open this piece, scan the QR code, and practice the assignment.';
		const noteBlock = wrapTextBlock(context, noteSource, bodyWidth, noteLineHeight);

		const urlFontSize = 24;
		const footerHeight = 84;
		const contentHeight = Math.max(titleBlock.height + 48 + noteBlock.height, qrSize);
		const height = padding * 2 + 72 + contentHeight + footerHeight;

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

		context.fillStyle = '#2f6d4f';
		context.font = '700 24px ui-sans-serif, system-ui, sans-serif';
		context.fillText('THE SHARPEST NOTE', padding, padding);

		let currentY = padding + 72;
		context.fillStyle = '#0f172a';
		context.font = '700 64px ui-sans-serif, system-ui, sans-serif';
		for (const line of titleBlock.lines) {
			context.fillText(line, padding, currentY);
			currentY += titleBlock.lineHeight;
		}

		currentY += 24;
		context.fillStyle = '#334155';
		context.font = '400 34px ui-sans-serif, system-ui, sans-serif';
		for (const line of noteBlock.lines) {
			context.fillText(line, padding, currentY);
			currentY += noteBlock.lineHeight;
		}

		const qrImage = await loadImage(qrCodeDataUrl);
		const qrCardX = width - padding - qrSize;
		const qrCardY = padding + 20;

		context.fillStyle = '#ffffff';
		drawRoundedRect(context, qrCardX - 24, qrCardY - 24, qrSize + 48, qrSize + 110, 28);
		context.shadowColor = 'rgba(15, 23, 42, 0.08)';
		context.shadowBlur = 28;
		context.fill();
		context.shadowColor = 'transparent';
		context.drawImage(qrImage, qrCardX, qrCardY, qrSize, qrSize);

		context.fillStyle = '#475569';
		context.font = '600 24px ui-sans-serif, system-ui, sans-serif';
		context.textAlign = 'center';
		context.fillText('Scan to open', qrCardX + qrSize / 2, qrCardY + qrSize + 54);

		context.textAlign = 'left';
		context.fillStyle = '#64748b';
		context.font = `400 ${urlFontSize}px ui-monospace, SFMono-Regular, monospace`;
		const footerText = shareUrl;
		const maxFooterWidth = width - padding * 2;
		const footerTextWidth = context.measureText(footerText).width;
		if (footerTextWidth <= maxFooterWidth) {
			context.fillText(footerText, padding, height - padding);
		} else {
			let truncated = footerText;
			while (
				truncated.length > 0 &&
				context.measureText(`${truncated}...`).width > maxFooterWidth
			) {
				truncated = truncated.slice(0, -1);
			}
			context.fillText(`${truncated}...`, padding, height - padding);
		}

		return {
			blob: await canvasToBlob(canvas),
			fileName: `${sanitizeFileName(trimmedPieceLabel)}-share.png`
		};
	}

	async function handleDownloadImage() {
		if (!canCreateShareImage || isPreparingImage) return;

		isPreparingImage = true;
		imageActionStatus = '';

		try {
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
		if (!canCreateShareImage || isPreparingImage) return;
		if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
			imageActionStatus = 'Native sharing is not available in this browser.';
			return;
		}

		isPreparingImage = true;
		imageActionStatus = '';

		try {
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

			imageActionStatus = error instanceof Error ? error.message : 'Unable to share PNG.';
		} finally {
			isPreparingImage = false;
		}
	}
</script>

<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
	<div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
		<div>
			<h2 class="text-xl font-semibold text-slate-900">Share with student</h2>
			<p class="mt-1 text-sm text-slate-600">
				Generate a direct practice link with a printable QR preview and a teacher note.
			</p>
		</div>
		<button
			type="button"
			class="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
			onclick={onCopyUrl}
			disabled={!shareUrl}
		>
			Copy share URL
		</button>
	</div>

	<div class="mt-4 flex flex-wrap gap-2">
		<button
			type="button"
			class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
			onclick={handleDownloadImage}
			disabled={!canCreateShareImage || isPreparingImage}
		>
			{isPreparingImage ? 'Preparing PNG...' : 'Download PNG'}
		</button>
		<button
			type="button"
			class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
			onclick={handleNativeShareImage}
			disabled={!canCreateShareImage || !canUseNativeShare || isPreparingImage}
		>
			Share PNG
		</button>
	</div>

	<label class="mt-5 flex flex-col gap-2 text-sm font-medium text-slate-700">
		Student note
		<textarea
			bind:value={teacherShareNote}
			rows="4"
			placeholder="Add a note for the student about how to practice this piece."
			class="rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-800"
		></textarea>
	</label>

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

	<div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
		<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Share URL</p>
		<input
			readonly
			value={shareUrl}
			class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
		/>
		{#if shareStatus}
			<p class="mt-2 text-sm font-medium text-brand-green">{shareStatus}</p>
		{/if}
		{#if imageActionStatus}
			<p class="mt-2 text-sm font-medium text-brand-green">{imageActionStatus}</p>
		{/if}
		{#if !canUseNativeShare}
			<p class="mt-2 text-xs text-slate-500">Native PNG sharing depends on browser support.</p>
		{/if}
	</div>

	<div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
		<div class="rounded-2xl border border-slate-200 bg-white p-5">
			<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Share preview</p>
			<h3 class="mt-3 text-2xl font-semibold text-slate-900">{trimmedPieceLabel}</h3>
			{#if trimmedTeacherShareNote}
				<p class="mt-4 text-sm leading-6 whitespace-pre-wrap text-slate-700">
					{trimmedTeacherShareNote}
				</p>
			{:else}
				<p class="mt-4 text-sm leading-6 text-slate-500">
					Add a note above to include practice instructions or reminders for the student.
				</p>
			{/if}
		</div>

		<div class="rounded-2xl border border-slate-200 bg-linear-to-br from-white to-slate-100 p-5">
			<div class="flex min-h-full flex-col items-center justify-center gap-4 text-center">
				{#if qrCodeDataUrl}
					<img
						src={qrCodeDataUrl}
						alt={`QR code for ${trimmedPieceLabel}`}
						class="w-full max-w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
					/>
				{:else}
					<div
						class="flex h-64 w-full max-w-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-sm text-slate-500"
					>
						{#if qrCodeError}
							{qrCodeError}
						{:else if shareUrl}
							Generating QR code preview...
						{:else}
							The QR code will appear when the piece is ready to share.
						{/if}
					</div>
				{/if}

				<p class="text-xs leading-5 text-slate-500">
					Students can scan this code to open the custom piece directly.
				</p>
			</div>
		</div>
	</div>
</div>
