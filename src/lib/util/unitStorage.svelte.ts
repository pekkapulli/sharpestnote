import { browser } from '$app/environment';

const STORAGE_PREFIX = 'unit_';
const KEY_CODE_SUFFIX = '_keyCode';

interface UnitStorage {
	keyCode?: string;
}

export function getUnitStorage(unitCode: string): UnitStorage {
	if (!browser) return {};

	const key = `${STORAGE_PREFIX}${unitCode}`;
	const stored = localStorage.getItem(key);

	if (!stored) return {};

	try {
		return JSON.parse(stored);
	} catch {
		return {};
	}
}

export function setUnitStorage(unitCode: string, data: UnitStorage): void {
	if (!browser) return;

	const key = `${STORAGE_PREFIX}${unitCode}`;
	const existing = getUnitStorage(unitCode);
	const merged = { ...existing, ...data };

	localStorage.setItem(key, JSON.stringify(merged));
}

export function getUnitKeyCode(unitCode: string): string | undefined {
	return getUnitStorage(unitCode).keyCode;
}

export function setUnitKeyCode(unitCode: string, keyCode: string): void {
	setUnitStorage(unitCode, { keyCode });
}

export function hasValidKeyAccess(unitCode: string, expectedKeyCode: string): boolean {
	const storedKey = getUnitKeyCode(unitCode);
	return storedKey?.trim().toUpperCase() === expectedKeyCode.trim().toUpperCase();
}
