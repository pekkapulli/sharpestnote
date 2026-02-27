import { fileStore, normalizeUnitCode } from '$lib/config/units';

export const getImageUrl = (code: string, thumb?: boolean) => {
	const normalizedCode = normalizeUnitCode(code);
	const thumbPostfix = thumb ? '_thumb' : '';
	return `${fileStore}/${normalizedCode}/${normalizedCode}${thumbPostfix}.jpg`;
};
