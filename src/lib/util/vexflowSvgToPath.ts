import { createFont, woff2, type TTF } from 'fonteditor-core';
// @ts-expect-error Internal VexFlow font data module has no published declaration file.
import { Bravura } from '../../../node_modules/vexflow/build/esm/src/fonts/bravura.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BRAVURA_WASM_URL = new URL(
	'../../../node_modules/fonteditor-core/woff2/woff2.wasm',
	import.meta.url
).href;

type ParsedFont = {
	unitsPerEm: number;
	cmap: Record<string, number>;
	glyphs: TTF.Glyph[];
};

let bravuraFontPromise: Promise<ParsedFont> | null = null;

function dataUriToArrayBuffer(dataUri: string): ArrayBuffer {
	const base64Data = dataUri.split(',')[1] ?? '';
	const binary = atob(base64Data);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes.buffer;
}

async function loadBravuraFont(): Promise<ParsedFont> {
	if (!bravuraFontPromise) {
		bravuraFontPromise = (async () => {
			await woff2.init(BRAVURA_WASM_URL);
			const font = createFont(dataUriToArrayBuffer(Bravura), {
				type: 'woff2',
				compound2simple: true
			});
			const parsed = font.get();
			const unitsPerEm =
				(parsed.head as { unitsPerEm?: number; unitsPerE?: number }).unitsPerEm ??
				(parsed.head as { unitsPerEm?: number; unitsPerE?: number }).unitsPerE ??
				1000;

			return {
				unitsPerEm,
				cmap: parsed.cmap,
				glyphs: parsed.glyf
			};
		})();
	}

	return bravuraFontPromise;
}

function midpoint(first: TTF.Point, second: TTF.Point): TTF.Point {
	return {
		x: (first.x + second.x) / 2,
		y: (first.y + second.y) / 2,
		onCurve: true
	};
}

function appendContourPath(
	commands: string[],
	contour: TTF.Contour,
	offsetX: number,
	baselineY: number,
	scale: number
): void {
	if (contour.length === 0) {
		return;
	}

	const firstPoint = contour[0];
	const lastPoint = contour[contour.length - 1];
	const startPoint = firstPoint.onCurve
		? firstPoint
		: lastPoint.onCurve
			? lastPoint
			: midpoint(lastPoint, firstPoint);
	const startIndex = firstPoint.onCurve ? 1 : 0;

	commands.push(`M ${offsetX + startPoint.x * scale} ${baselineY - startPoint.y * scale}`);

	for (let step = 0; step < contour.length; step += 1) {
		const point = contour[(startIndex + step) % contour.length];
		const nextPoint = contour[(startIndex + step + 1) % contour.length];

		if (point.onCurve) {
			commands.push(`L ${offsetX + point.x * scale} ${baselineY - point.y * scale}`);
			continue;
		}

		if (nextPoint.onCurve) {
			commands.push(
				`Q ${offsetX + point.x * scale} ${baselineY - point.y * scale} ${offsetX + nextPoint.x * scale} ${baselineY - nextPoint.y * scale}`
			);
			step += 1;
			continue;
		}

		const impliedPoint = midpoint(point, nextPoint);
		commands.push(
			`Q ${offsetX + point.x * scale} ${baselineY - point.y * scale} ${offsetX + impliedPoint.x * scale} ${baselineY - impliedPoint.y * scale}`
		);
	}

	commands.push('Z');
}

function getNumericAttribute(element: SVGTextElement, name: string): number {
	const rawValue = element.getAttribute(name);
	if (!rawValue) {
		return 0;
	}

	const firstValue = rawValue.trim().split(/\s+/)[0] ?? '0';
	return Number.parseFloat(firstValue) || 0;
}

function shouldConvertTextNode(textNode: SVGTextElement): boolean {
	const text = textNode.textContent?.trim();
	if (!text) {
		return false;
	}

	const fontFamily = getComputedStyle(textNode).fontFamily.toLowerCase();
	return fontFamily.includes('bravura');
}

function buildPathForTextNode(
	sourceTextNode: SVGTextElement,
	cloneTextNode: SVGTextElement,
	font: ParsedFont
): SVGPathElement | null {
	const text = sourceTextNode.textContent ?? '';
	if (!text.trim()) {
		return null;
	}

	const styles = getComputedStyle(sourceTextNode);
	const fontSize =
		Number.parseFloat(styles.fontSize) || getNumericAttribute(sourceTextNode, 'font-size');
	if (!fontSize) {
		return null;
	}

	const x = getNumericAttribute(sourceTextNode, 'x');
	const y = getNumericAttribute(sourceTextNode, 'y');
	const scale = fontSize / font.unitsPerEm;
	const codePoints = Array.from(text);
	const glyphs = codePoints
		.map((character) => {
			const codePoint = character.codePointAt(0);
			if (codePoint === undefined) {
				return null;
			}

			const glyphIndex = font.cmap[String(codePoint)];
			return glyphIndex === undefined ? null : (font.glyphs[glyphIndex] ?? null);
		})
		.filter((glyph): glyph is TTF.Glyph => glyph !== null);

	if (glyphs.length === 0) {
		return null;
	}

	const totalAdvance = glyphs.reduce(
		(width, glyph) => width + (glyph.advanceWidth ?? 0) * scale,
		0
	);
	const textAnchor = (
		styles.textAnchor ||
		sourceTextNode.getAttribute('text-anchor') ||
		'start'
	).toLowerCase();
	const originX =
		textAnchor === 'middle' ? x - totalAdvance / 2 : textAnchor === 'end' ? x - totalAdvance : x;

	let penX = originX;
	const commands: string[] = [];

	for (const glyph of glyphs) {
		for (const contour of glyph.contours ?? []) {
			appendContourPath(commands, contour, penX, y, scale);
		}

		penX += (glyph.advanceWidth ?? 0) * scale;
	}

	if (commands.length === 0) {
		return null;
	}

	const pathNode = cloneTextNode.ownerDocument.createElementNS(SVG_NS, 'path');
	pathNode.setAttribute('d', commands.join(' '));
	pathNode.setAttribute('fill-rule', 'nonzero');
	pathNode.setAttribute('fill', styles.fill && styles.fill !== 'none' ? styles.fill : '#000000');

	if (styles.stroke && styles.stroke !== 'none') {
		pathNode.setAttribute('stroke', styles.stroke);
		pathNode.setAttribute('stroke-width', styles.strokeWidth);
		pathNode.setAttribute('stroke-linecap', styles.strokeLinecap);
		pathNode.setAttribute('stroke-linejoin', styles.strokeLinejoin);
		if (styles.strokeDasharray && styles.strokeDasharray !== 'none') {
			pathNode.setAttribute('stroke-dasharray', styles.strokeDasharray);
		}
	}

	if (styles.opacity && styles.opacity !== '1') {
		pathNode.setAttribute('opacity', styles.opacity);
	}

	if (styles.fillOpacity && styles.fillOpacity !== '1') {
		pathNode.setAttribute('fill-opacity', styles.fillOpacity);
	}

	if (styles.strokeOpacity && styles.strokeOpacity !== '1') {
		pathNode.setAttribute('stroke-opacity', styles.strokeOpacity);
	}

	for (const attributeName of ['class', 'id', 'transform', 'clip-path', 'mask']) {
		const attributeValue = cloneTextNode.getAttribute(attributeName);
		if (attributeValue) {
			pathNode.setAttribute(attributeName, attributeValue);
		}
	}

	return pathNode;
}

export async function cloneVexFlowSvgWithPathGlyphs(
	sourceSvg: SVGSVGElement
): Promise<SVGSVGElement> {
	const cloneSvg = sourceSvg.cloneNode(true) as SVGSVGElement;
	const sourceTextNodes = Array.from(sourceSvg.querySelectorAll<SVGTextElement>('text'));
	const cloneTextNodes = Array.from(cloneSvg.querySelectorAll<SVGTextElement>('text'));

	if (!sourceTextNodes.some(shouldConvertTextNode)) {
		return cloneSvg;
	}

	const font = await loadBravuraFont();

	for (let index = 0; index < sourceTextNodes.length; index += 1) {
		const sourceTextNode = sourceTextNodes[index];
		const cloneTextNode = cloneTextNodes[index];
		if (!cloneTextNode || !shouldConvertTextNode(sourceTextNode)) {
			continue;
		}

		const pathNode = buildPathForTextNode(sourceTextNode, cloneTextNode, font);
		if (pathNode) {
			cloneTextNode.replaceWith(pathNode);
		}
	}

	return cloneSvg;
}
