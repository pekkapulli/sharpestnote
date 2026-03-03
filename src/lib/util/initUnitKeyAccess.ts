import { browser } from '$app/environment';
import { page } from '$app/state';
import { setUnitKeyCode, getUnitKeyCode } from './unitStorage.svelte';
import type { UnitMaterial } from '$lib/config/units';

async function validateAccess(unitCode: string, keyCode: string): Promise<boolean> {
	const res = await fetch('/api/access', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ unitCode, keyCode })
	});

	const data = (await res.json()) as { hasAccess?: boolean };
	return !!data.hasAccess;
}

export async function initUnitKeyAccess(unit: UnitMaterial): Promise<boolean> {
	if (!browser) return false;

	if (unit.demo) {
		// Demo units are always accessible
		return true;
	}

	// Check URL for key parameter first
	const urlKey = page.url.searchParams.get('key');

	if (urlKey) {
		// Validate key against backend
		try {
			if (await validateAccess(unit.code, urlKey)) {
				// Valid key - store it for future visits
				setUnitKeyCode(unit.code, urlKey);
				// Remove the key parameter from URL
				const newUrl = new URL(page.url);
				newUrl.searchParams.delete('key');
				window.history.replaceState({}, '', newUrl.toString());
				return true;
			}
		} catch (error) {
			console.error('Failed to validate key:', error);
		}
	}

	// Check if we already have valid access from previous visit
	const storedKey = getUnitKeyCode(unit.code);
	if (storedKey) {
		try {
			if (await validateAccess(unit.code, storedKey)) {
				return true;
			}
		} catch (error) {
			console.error('Failed to validate stored key:', error);
		}
	}

	// If a key was entered while this async check was running, validate the latest one before failing.
	const latestStoredKey = getUnitKeyCode(unit.code);
	if (latestStoredKey && latestStoredKey !== storedKey) {
		try {
			return await validateAccess(unit.code, latestStoredKey);
		} catch (error) {
			console.error('Failed to validate latest stored key:', error);
		}
	}

	return false;
}
