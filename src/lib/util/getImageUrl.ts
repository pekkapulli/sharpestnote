import { fileStore, normalizeUnitCode } from '$lib/config/units';

export const getImageUrl = (code: string) => {
	const normalizedCode = normalizeUnitCode(code);
	return `${fileStore}/${normalizedCode}/${normalizedCode}.jpg`;
};
