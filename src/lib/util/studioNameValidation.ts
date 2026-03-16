const STUDIO_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const SHARPEST_NOTE_ALIASES = ['thesharpestnote', 'sharpestnote'];

export function isValidStudioName(value: string): boolean {
	return STUDIO_NAME_PATTERN.test(value);
}

function normalizeForSimilarity(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshteinDistance(a: string, b: string): number {
	const rows = a.length + 1;
	const cols = b.length + 1;
	const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

	for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
	for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

	for (let i = 1; i < rows; i += 1) {
		for (let j = 1; j < cols; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			matrix[i][j] = Math.min(
				matrix[i - 1][j] + 1,
				matrix[i][j - 1] + 1,
				matrix[i - 1][j - 1] + cost
			);
		}
	}

	return matrix[rows - 1][cols - 1];
}

function similarityScore(a: string, b: string): number {
	if (!a.length && !b.length) return 1;
	const maxLen = Math.max(a.length, b.length);
	const distance = levenshteinDistance(a, b);
	return 1 - distance / maxLen;
}

export function isStudioNameTooCloseToBrand(value: string): boolean {
	const normalized = normalizeForSimilarity(value);
	if (!normalized) return false;

	for (const alias of SHARPEST_NOTE_ALIASES) {
		if (normalized === alias) return true;
		if (normalized.includes(alias)) return true;
		if (alias.includes(normalized) && normalized.length >= Math.ceil(alias.length * 0.7)) {
			return true;
		}
		if (similarityScore(normalized, alias) >= 0.82) return true;
	}

	return false;
}
