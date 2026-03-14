<script lang="ts">
	import { tick } from 'svelte';
	import TheSharpestNoteLogo from '$lib/assets/The Sharpest Note Logo.svg';
	import type { KeySignature } from '$lib/config/keys';
	import type { MelodyItem } from '$lib/config/melody';
	import type { Clef } from '$lib/config/types';
	import FingerMarking from '$lib/components/music/FingerMarking.svelte';
	import { getFingerMarkingY } from '$lib/components/music/fingerMarkingPosition';
	import { renderVexFlowStaff } from '$lib/components/music/vexflowHelper';

	const DEFAULT_BARS_PER_ROW = 4;
	const COMPACT_BARS_PER_ROW = 2;
	const MAX_BARS_FOR_COMPACT_LAYOUT = 8;
	const ROWS_PER_PAGE = 4;
	const STAFF_ROW_HEIGHT = 150;
	const A4_WIDTH_MM = 210;
	const A4_HEIGHT_MM = 297;

	interface Props {
		pieceLabel: string;
		teacherShareNote?: string;
		shareUrl: string;
		qrCodeDataUrl: string;
		bars: MelodyItem[][];
		clef: Clef;
		keySignature: KeySignature;
		barLength?: number;
	}

	type RowSpec = {
		rowIndex: number;
		bars: MelodyItem[][];
		notes: MelodyItem[];
	};

	type PageSpec = {
		pageIndex: number;
		rows: RowSpec[];
	};

	type RowRenderData = {
		noteXPositions: number[];
		noteYPositions: number[];
		topLineY: number;
		lineSpacing: number;
	};

	let {
		pieceLabel,
		teacherShareNote = '',
		shareUrl,
		qrCodeDataUrl,
		bars,
		clef,
		keySignature,
		barLength
	}: Props = $props();

	let hostElement = $state<HTMLDivElement | null>(null);
	let sheetElement = $state<HTMLDivElement | null>(null);
	let notationWidth = $state(0);
	let rowContainers = $state<Array<HTMLDivElement | null>>([]);
	let rowRenderData = $state<Record<number, RowRenderData>>({});

	const trimmedPieceLabel = $derived(pieceLabel.trim() || 'Untitled piece');
	const trimmedTeacherShareNote = $derived(teacherShareNote.trim());
	const trimmedShareUrl = $derived(shareUrl.trim());
	const barsPerRow = $derived(
		bars.length <= MAX_BARS_FOR_COMPACT_LAYOUT ? COMPACT_BARS_PER_ROW : DEFAULT_BARS_PER_ROW
	);
	const rowSpecs = $derived.by(() => {
		const rows: RowSpec[] = [];

		for (let index = 0; index < bars.length; index += barsPerRow) {
			const rowBars = bars.slice(index, index + barsPerRow);
			rows.push({
				rowIndex: rows.length,
				bars: rowBars,
				notes: rowBars.flat()
			});
		}

		return rows;
	});
	const pageSpecs = $derived.by(() => {
		const pages: PageSpec[] = [];

		for (let index = 0; index < rowSpecs.length; index += ROWS_PER_PAGE) {
			pages.push({
				pageIndex: pages.length,
				rows: rowSpecs.slice(index, index + ROWS_PER_PAGE)
			});
		}

		return pages;
	});

	$effect(() => {
		if (!notationWidth || rowSpecs.length === 0) {
			rowRenderData = {};
			return;
		}

		const nextRenderData: Record<number, RowRenderData> = {};

		for (const row of rowSpecs) {
			const container = rowContainers[row.rowIndex];
			if (!container) continue;

			const result = renderVexFlowStaff(
				container,
				row.bars,
				clef,
				keySignature,
				notationWidth,
				barLength,
				row.rowIndex === 0
			);

			nextRenderData[row.rowIndex] = {
				noteXPositions: result.noteXPositions,
				noteYPositions: result.noteYPositions,
				topLineY: result.topLineY,
				lineSpacing: result.lineSpacing
			};
		}

		rowRenderData = nextRenderData;
	});

	async function waitForAssets(): Promise<void> {
		const imagePromises = Array.from(sheetElement?.querySelectorAll('img') ?? []).map((image) => {
			if (image.complete) {
				return Promise.resolve();
			}

			return new Promise<void>((resolve) => {
				image.addEventListener('load', () => resolve(), { once: true });
				image.addEventListener('error', () => resolve(), { once: true });
			});
		});

		await Promise.all(imagePromises);

		if ('fonts' in document) {
			await document.fonts.ready;
		}

		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => resolve());
			});
		});
	}

	async function waitForNotationReady(timeoutMs = 2000): Promise<void> {
		const start = performance.now();

		while (performance.now() - start < timeoutMs) {
			const isReady =
				notationWidth > 0 &&
				rowSpecs.every((row) => {
					const rowData = rowRenderData[row.rowIndex];
					return !!rowData && rowData.noteXPositions.length >= row.notes.length;
				});

			if (isReady) {
				return;
			}

			await tick();
			await new Promise<void>((resolve) => setTimeout(resolve, 30));
		}
	}

	function sanitizeFileName(label: string): string {
		const fallback = 'sharpest-note-sheet';
		const normalized = label
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');

		return normalized || fallback;
	}

	function parseRgbColor(color: string): [number, number, number] {
		const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
		if (!match) {
			return [15, 23, 42];
		}

		return [Number(match[1]), Number(match[2]), Number(match[3])];
	}

	function getLineHeightPx(styles: CSSStyleDeclaration, fontSizePx: number): number {
		const lineHeightValue = styles.lineHeight;
		if (lineHeightValue.endsWith('px')) {
			return Number.parseFloat(lineHeightValue);
		}

		return fontSizePx * 1.2;
	}

	function pxToPt(px: number): number {
		return px * 0.75;
	}

	function getRowFingerMarkingY(
		rowData: RowRenderData,
		rowNotes: MelodyItem[],
		noteIndex: number
	): number {
		return getFingerMarkingY({
			topLineY: rowData.topLineY,
			lineSpacing: rowData.lineSpacing,
			noteY: rowData.noteYPositions[noteIndex],
			notes: rowNotes,
			noteIndex
		});
	}

	function imageToDataUrl(image: HTMLImageElement): string {
		const canvas = document.createElement('canvas');
		const width = image.naturalWidth || Math.ceil(image.width) || 1;
		const height = image.naturalHeight || Math.ceil(image.height) || 1;
		canvas.width = width;
		canvas.height = height;

		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('Canvas is not available in this browser.');
		}

		context.drawImage(image, 0, 0, width, height);
		return canvas.toDataURL('image/png');
	}

	function arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		const chunkSize = 0x8000;

		for (let index = 0; index < bytes.length; index += chunkSize) {
			const chunk = bytes.subarray(index, index + chunkSize);
			binary += String.fromCharCode(...chunk);
		}

		return btoa(binary);
	}

	async function registerSpectralFont(pdf: import('jspdf').jsPDF): Promise<void> {
		const fontList = pdf.getFontList();
		if (fontList.Spectral) {
			return;
		}

		try {
			const [regularResponse, boldResponse] = await Promise.all([
				fetch('/fonts/Spectral-Regular.ttf'),
				fetch('/fonts/Spectral-Bold.ttf')
			]);

			if (!regularResponse.ok || !boldResponse.ok) {
				return;
			}

			const [regularBuffer, boldBuffer] = await Promise.all([
				regularResponse.arrayBuffer(),
				boldResponse.arrayBuffer()
			]);

			pdf.addFileToVFS('Spectral-Regular.ttf', arrayBufferToBase64(regularBuffer));
			pdf.addFileToVFS('Spectral-Bold.ttf', arrayBufferToBase64(boldBuffer));
			pdf.addFont('Spectral-Regular.ttf', 'Spectral', 'normal');
			pdf.addFont('Spectral-Bold.ttf', 'Spectral', 'bold');
		} catch {
			// Fall back to built-in PDF fonts if custom font loading fails.
		}
	}

	export async function exportPdf(): Promise<void> {
		if (!sheetElement) {
			throw new Error('Printable sheet is not ready yet.');
		}

		await tick();
		await waitForNotationReady();
		await waitForAssets();

		const pageElements = Array.from(sheetElement.querySelectorAll<HTMLDivElement>('.print-page'));
		if (pageElements.length === 0) {
			throw new Error('No printable pages were found.');
		}

		const [{ jsPDF }, { svg2pdf }, { cloneVexFlowSvgWithPathGlyphs }] = await Promise.all([
			import('jspdf'),
			import('svg2pdf.js'),
			import('$lib/util/vexflowSvgToPath')
		]);

		const pageWidthMm = A4_WIDTH_MM;
		const pageHeightMm = A4_HEIGHT_MM;
		const pdf = new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: [pageWidthMm, pageHeightMm],
			putOnlyUsedFonts: true,
			compress: true
		});

		await registerSpectralFont(pdf);

		for (let pageIndex = 0; pageIndex < pageElements.length; pageIndex++) {
			if (pageIndex > 0) {
				pdf.addPage([pageWidthMm, pageHeightMm], 'portrait');
			}

			const pageElement = pageElements[pageIndex];
			const pageRect = pageElement.getBoundingClientRect();
			const pxToMmX = pageWidthMm / pageRect.width;
			const pxToMmY = pageHeightMm / pageRect.height;

			pdf.setFillColor(255, 255, 255);
			pdf.rect(0, 0, pageWidthMm, pageHeightMm, 'F');

			const imageElements = pageElement.querySelectorAll<HTMLImageElement>('img');
			for (const image of imageElements) {
				const imageRect = image.getBoundingClientRect();
				if (!imageRect.width || !imageRect.height) continue;

				const x = (imageRect.left - pageRect.left) * pxToMmX;
				const y = (imageRect.top - pageRect.top) * pxToMmY;
				const width = imageRect.width * pxToMmX;
				const height = imageRect.height * pxToMmY;

				try {
					const dataUrl = imageToDataUrl(image);
					pdf.addImage(dataUrl, 'PNG', x, y, width, height, undefined, 'FAST');
				} catch {
					// Skip images that cannot be rasterized.
				}
			}

			const textSelectors = [
				'.sheet-header h1',
				'.eyebrow',
				'.teacher-note',
				'.footer-url',
				'.footer-cta'
			];
			const textElements = pageElement.querySelectorAll<HTMLElement>(textSelectors.join(','));
			for (const textElement of textElements) {
				const text = textElement.textContent?.trim();
				if (!text) continue;

				const textRect = textElement.getBoundingClientRect();
				if (!textRect.width || !textRect.height) continue;

				const styles = getComputedStyle(textElement);
				const x = (textRect.left - pageRect.left) * pxToMmX;
				const y = (textRect.top - pageRect.top) * pxToMmY;
				const maxWidth = textRect.width * pxToMmX;
				const fontSizePx = Number.parseFloat(styles.fontSize) || 16;
				const fontSizePt = pxToPt(fontSizePx);
				const lineHeightMm = getLineHeightPx(styles, fontSizePx) * pxToMmY;
				const alignment =
					styles.textAlign === 'center'
						? 'center'
						: styles.textAlign === 'right' || styles.textAlign === 'end'
							? 'right'
							: 'left';
				const anchorX =
					alignment === 'center' ? x + maxWidth / 2 : alignment === 'right' ? x + maxWidth : x;

				const [r, g, b] = parseRgbColor(styles.color);
				const fontWeight = Number.parseInt(styles.fontWeight, 10) >= 600 ? 'bold' : 'normal';
				const prefersSpectral = styles.fontFamily.toLowerCase().includes('spectral');
				const isFooterUrl = textElement.classList.contains('footer-url');
				pdf.setTextColor(r, g, b);
				pdf.setFont(prefersSpectral ? 'Spectral' : 'helvetica', fontWeight);

				if (isFooterUrl) {
					pdf.setFontSize(fontSizePt);
					pdf.text(text, anchorX, y + lineHeightMm, { align: alignment });
					continue;
				}

				pdf.setFontSize(fontSizePt);

				const lines = pdf.splitTextToSize(text, maxWidth);
				for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
					pdf.text(lines[lineIndex], anchorX, y + lineHeightMm * (lineIndex + 1), {
						align: alignment
					});
				}
			}

			const staffVexFlowElements =
				pageElement.querySelectorAll<SVGSVGElement>('.staff-vexflow svg');
			for (const svgElement of staffVexFlowElements) {
				const svgRect = svgElement.getBoundingClientRect();
				if (!svgRect.width || !svgRect.height) continue;

				const x = (svgRect.left - pageRect.left) * pxToMmX;
				const y = (svgRect.top - pageRect.top) * pxToMmY;
				const width = svgRect.width * pxToMmX;
				const height = svgRect.height * pxToMmY;
				const exportSvgElement = await cloneVexFlowSvgWithPathGlyphs(svgElement);

				await svg2pdf(exportSvgElement, pdf, {
					x,
					y,
					width,
					height
				});
			}

			const pageSpec = pageSpecs[pageIndex];
			const staffRows = Array.from(pageElement.querySelectorAll<HTMLDivElement>('.staff-row'));
			if (pageSpec && staffRows.length > 0) {
				for (let rowIndex = 0; rowIndex < pageSpec.rows.length; rowIndex++) {
					const rowSpec = pageSpec.rows[rowIndex];
					const rowElement = staffRows[rowIndex];
					if (!rowElement) continue;

					const rowData = rowRenderData[rowSpec.rowIndex];
					if (!rowData || rowData.noteXPositions.length === 0) continue;

					const rowRect = rowElement.getBoundingClientRect();
					const rowOriginX = (rowRect.left - pageRect.left) * pxToMmX;
					const rowOriginY = (rowRect.top - pageRect.top) * pxToMmY;
					for (let noteIndex = 0; noteIndex < rowSpec.notes.length; noteIndex++) {
						const item = rowSpec.notes[noteIndex];
						if (item.note === null || item.finger === undefined) continue;

						const noteX = rowData.noteXPositions[noteIndex];
						if (noteX === undefined) continue;

						const fingerX = rowOriginX + noteX * pxToMmX;
						const fingerY =
							rowOriginY + getRowFingerMarkingY(rowData, rowSpec.notes, noteIndex) * pxToMmY;
						const fontSizePt = pxToPt(rowData.lineSpacing * 1.5);

						pdf.setFont('helvetica', 'normal');
						pdf.setTextColor(51, 51, 51);
						pdf.setFontSize(fontSizePt);
						pdf.text(String(item.finger), fingerX, fingerY, {
							align: 'center',
							baseline: 'middle'
						});
					}
				}
			}
		}

		pdf.save(`${sanitizeFileName(trimmedPieceLabel)}.pdf`);
	}
</script>

<div bind:this={hostElement} class="print-sheet-host" aria-hidden="true">
	<div bind:this={sheetElement} class="print-sheet">
		{#each pageSpecs as page (page.pageIndex)}
			<div class="print-page">
				<header class="sheet-header">
					<h1>{trimmedPieceLabel}</h1>
					{#if page.pageIndex === 0 && trimmedTeacherShareNote}
						<div class="teacher-note-card">
							<p class="eyebrow">Teacher note</p>
							<p class="teacher-note">{trimmedTeacherShareNote}</p>
						</div>
					{/if}
				</header>

				<section class="sheet-notation" bind:clientWidth={notationWidth}>
					{#each page.rows as row (row.rowIndex)}
						<div class="staff-row">
							<div bind:this={rowContainers[row.rowIndex]} class="staff-vexflow"></div>
							<svg
								class="staff-overlay"
								width={notationWidth}
								height={STAFF_ROW_HEIGHT}
								aria-hidden="true"
							>
								{#if rowRenderData[row.rowIndex]}
									{#each row.notes as item, noteIndex (`${row.rowIndex}-${noteIndex}`)}
										{#if item.note !== null}
											<FingerMarking
												{item}
												x={rowRenderData[row.rowIndex].noteXPositions[noteIndex] ?? 0}
												y={getRowFingerMarkingY(rowRenderData[row.rowIndex], row.notes, noteIndex)}
												lineSpacing={rowRenderData[row.rowIndex].lineSpacing}
											/>
										{/if}
									{/each}
								{/if}
							</svg>
						</div>
					{/each}
				</section>

				<footer class="sheet-footer">
					<div class="footer-qr-block">
						{#if qrCodeDataUrl}
							<img src={qrCodeDataUrl} alt={`QR code for ${trimmedPieceLabel}`} class="footer-qr" />
						{/if}
					</div>

					<div class="footer-copy">
						<img src={TheSharpestNoteLogo} alt="The Sharpest Note" class="footer-logo" />
						<p class="footer-url">{trimmedShareUrl}</p>
						<p class="footer-cta">Open on The Sharpest Note to practice with immediate feedback!</p>
					</div>
				</footer>
			</div>
		{/each}
	</div>
</div>

<style>
	.print-sheet-host {
		position: fixed;
		left: -10000px;
		top: 0;
		pointer-events: none;
		z-index: -1;
	}

	:global(html.composer-print-active),
	:global(body.composer-print-active) {
		margin: 0 !important;
		padding: 0 !important;
		background: #ffffff !important;
	}

	:global(body.composer-print-active) {
		overflow: hidden !important;
	}

	:global(body.composer-print-active > *:not(.print-sheet-host)) {
		display: none !important;
	}

	:global(body.composer-print-active) .print-sheet-host {
		position: fixed !important;
		inset: 0 !important;
		left: auto !important;
		top: auto !important;
		width: 100vw !important;
		height: 100vh !important;
		padding: 6mm 0 !important;
		margin: 0 !important;
		visibility: visible !important;
		pointer-events: none !important;
		z-index: 9999 !important;
		display: block !important;
		overflow: auto;
		background: #ffffff;
	}

	:global(body.composer-print-active) .print-sheet {
		min-height: auto;
		padding-bottom: 0;
		margin: 0 auto;
	}

	.print-sheet {
		width: 210mm;
		padding: 0;
		box-sizing: border-box;
		background: #ffffff;
		color: #0f172a;
		display: block;
		font-family: var(--font-serif, 'Spectral', serif);
	}

	.print-page {
		width: 100%;
		min-height: 297mm;
		padding: 15mm;
		box-sizing: border-box;
		background: #ffffff;
		display: flex;
		flex-direction: column;
		gap: 8mm;
		break-after: page;
		page-break-after: always;
	}

	.print-page:last-child {
		break-after: auto;
		page-break-after: auto;
	}

	.sheet-header {
		display: grid;
		gap: 5mm;
		padding-top: 2mm;
		text-align: center;
		justify-items: center;
	}

	.sheet-header h1 {
		margin: 0;
		font-size: 40pt;
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: 0.01em;
		text-align: center;
	}

	.teacher-note-card {
		width: 100%;
		max-width: 130mm;
		padding: 1mm 0 2mm;
		text-align: center;
	}

	.eyebrow {
		margin: 0 0 2mm;
		font-family: var(--font-serif, 'Spectral', serif);
		font-size: 10.5pt;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #64748b;
	}

	.teacher-note {
		margin: 0;
		font-size: 14pt;
		line-height: 1.5;
		white-space: pre-wrap;
		text-align: center;
	}

	.sheet-notation {
		display: grid;
		gap: 4mm;
		flex: 0 0 auto;
	}

	.staff-row {
		position: relative;
		height: 150px;
		break-inside: avoid;
	}

	.staff-vexflow {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.staff-overlay {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: visible;
	}

	.staff-vexflow :global(svg) {
		overflow: visible;
	}

	.sheet-footer {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 5mm;
		align-items: center;
		margin-top: auto;
		padding-top: 2mm;
		break-inside: avoid;
	}

	.footer-qr-block {
		width: 32mm;
		height: 32mm;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #d6d3d1;
		background: #ffffff;
		padding: 2mm;
		box-sizing: border-box;
	}

	.footer-qr {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.footer-copy {
		min-width: 0;
		display: grid;
		justify-items: start;
		row-gap: 1mm;
	}

	.footer-url {
		margin: 0;
		font-family: var(--font-serif, 'Spectral', serif);
		font-size: 12pt;
		font-weight: 700;
		line-height: 1.4;
		white-space: nowrap;
		word-break: normal;
		overflow: visible;
		text-overflow: clip;
		color: #0f172a;
	}

	.footer-cta {
		margin: 0;
		font-family: var(--font-serif, 'Spectral', serif);
		font-size: 12pt;
		line-height: 1.4;
		color: #334155;
	}

	.footer-logo {
		width: 64mm;
		margin: 0;
		height: auto;
	}

	@media print {
		@page {
			size: A4 portrait;
			margin: 0;
		}

		:global(html.composer-print-active),
		:global(body.composer-print-active) {
			margin: 0 !important;
			padding: 0 !important;
			background: #ffffff !important;
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}

		/* Print host: flow normally (not fixed) so it appears exactly once. */
		.print-sheet-host {
			position: static !important;
			left: auto !important;
			top: auto !important;
			width: 100% !important;
			height: auto !important;
			padding: 0 !important;
			margin: 0 !important;
			visibility: visible !important;
			pointer-events: none !important;
			z-index: auto !important;
			display: block !important;
		}

		.print-sheet-host * {
			visibility: visible !important;
		}

		.print-sheet {
			background: #ffffff !important;
			box-shadow: none !important;
			min-height: auto !important;
			padding-bottom: 0;
			display: block !important;
			width: 210mm !important;
			margin: 0 auto !important;
		}

		.print-page {
			background: #ffffff !important;
			display: block !important;
			break-inside: avoid-page;
			page-break-inside: avoid;
		}

		.print-page > .sheet-footer {
			margin-top: 8mm;
		}
	}
</style>
