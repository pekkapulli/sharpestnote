import type { UnitMaterial, Units } from './types';

export const fileStore = 'https://f002.backblazeb2.com/file/sharpestnote/unit';

// Dynamically import all unit files from the units directory
const unitModules = import.meta.glob<{ default: Record<string, UnitMaterial> }>('./units/**/*.ts', {
	eager: true
});

export const units: Units = Object.values(unitModules).reduce((acc, module) => {
	return { ...acc, ...module.default };
}, {} as Units);

export const normalizeUnitCode = (code: string | null | undefined): string =>
	(code ?? '').trim().toLowerCase();

export const unitOptions = Object.values(units).map((unit) => ({
	value: unit.code,
	label: unit.title
}));

export const getUnitByCode = (code: string | null | undefined): UnitMaterial | null => {
	const normalized = normalizeUnitCode(code);
	return normalized ? (units[normalized] ?? null) : null;
};
