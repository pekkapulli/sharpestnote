<script lang="ts">
	import { tick } from 'svelte';
	import TheSharpestNoteLogo from '$lib/assets/The Sharpest Note Logo.svg';
	import type { KeySignature } from '$lib/config/keys';
	import type { MelodyItem } from '$lib/config/melody';
	import type { Clef } from '$lib/config/types';
	import FingerMarking from '$lib/components/music/FingerMarking.svelte';
	import { renderVexFlowStaff } from '$lib/components/music/vexflowHelper';

	const DEFAULT_BARS_PER_ROW = 4;
	const COMPACT_BARS_PER_ROW = 2;
	const MAX_BARS_FOR_COMPACT_LAYOUT = 8;
	const ROWS_PER_PAGE = 4;
	const PRINT_MODE_CLASS = 'composer-print-active';

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

	export async function printSheet(): Promise<void> {
		if (!sheetElement || !hostElement) {
			throw new Error('Printable sheet is not ready yet.');
		}

		await tick();

		// Move host to a direct body child so our display:none sibling rule
		// collapses the rest of the page and avoids extra printed pages.
		const originalParent = hostElement.parentElement;
		document.body.appendChild(hostElement);

		document.documentElement.classList.add(PRINT_MODE_CLASS);
		document.body.classList.add(PRINT_MODE_CLASS);
		const originalTitle = document.title;
		document.title = trimmedPieceLabel;

		await waitForAssets();

		const cleanup = () => {
			document.documentElement.classList.remove(PRINT_MODE_CLASS);
			document.body.classList.remove(PRINT_MODE_CLASS);
			document.title = originalTitle;
			if (originalParent && hostElement) {
				originalParent.appendChild(hostElement);
			}
		};

		const afterprintHandler = () => cleanup();
		window.addEventListener('afterprint', afterprintHandler, { once: true });

		try {
			window.print();
		} catch (error) {
			window.removeEventListener('afterprint', afterprintHandler);
			cleanup();
			throw error;
		}
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
							<svg class="staff-overlay" width="100%" height="100%" aria-hidden="true">
								{#if rowRenderData[row.rowIndex]}
									{#each row.notes as item, noteIndex (noteIndex)}
										{#if item.note !== null}
											<FingerMarking
												{item}
												x={rowRenderData[row.rowIndex].noteXPositions[noteIndex] ?? 0}
												y={140}
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
		padding: 12mm 0 !important;
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
		width: 186mm;
		padding: 0;
		box-sizing: border-box;
		background: #ffffff;
		color: #0f172a;
		display: block;
		font-family: var(--font-serif, 'Spectral', serif);
	}

	.print-page {
		width: 100%;
		min-height: 273mm;
		padding: 0 0 4mm;
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
		padding-top: 7mm;
		text-align: center;
		justify-items: center;
	}

	.sheet-header h1 {
		margin: 0;
		font-size: 36pt;
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
		font-size: 8.5pt;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #64748b;
	}

	.teacher-note {
		margin: 0;
		font-size: 12pt;
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
		width: 28mm;
		height: 28mm;
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
		row-gap: 1.25mm;
	}

	.footer-url {
		margin: 0;
		font-family: var(--font-serif, 'Spectral', serif);
		font-size: 9pt;
		font-weight: 700;
		line-height: 1.4;
		word-break: break-all;
		color: #0f172a;
	}

	.footer-cta {
		margin: 0;
		font-family: var(--font-serif, 'Spectral', serif);
		font-size: 9.5pt;
		line-height: 1.4;
		color: #334155;
	}

	.footer-logo {
		width: 32mm;
		margin: 0 0 1mm;
		height: auto;
	}

	@media print {
		@page {
			size: A4 portrait;
			margin: 12mm;
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
			width: 186mm !important;
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
