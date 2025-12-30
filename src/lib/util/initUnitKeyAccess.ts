import { browser } from '$app/environment';
import { page } from '$app/stores';
import { get } from 'svelte/store';
import { setUnitKeyCode, hasValidKeyAccess } from './unitStorage.svelte';

export function initUnitKeyAccess(unitCode: string, expectedKeyCode: string): boolean {
	if (!browser) return false;

	// Check URL for key parameter first
	const currentPage = get(page);
	const urlKey = currentPage.url.searchParams.get('key');

	if (urlKey && urlKey.trim().toUpperCase() === expectedKeyCode.trim().toUpperCase()) {
		// Valid key in URL - store it for future visits
		setUnitKeyCode(unitCode, urlKey);
		return true;
	}

	// Check if we already have valid access from previous visit
	return hasValidKeyAccess(unitCode, expectedKeyCode);
}
