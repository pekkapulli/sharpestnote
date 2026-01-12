import { browser } from '$app/environment';
import { page } from '$app/state';
import { setUnitKeyCode, getUnitKeyCode } from './unitStorage.svelte';
import type { UnitMaterial } from '$lib/config/units';

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
			const res = await fetch('/api/access', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ unitCode: unit.code, keyCode: urlKey })
			});

			const data = (await res.json()) as { hasAccess?: boolean };

			if (data.hasAccess) {
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
			const res = await fetch('/api/access', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ unitCode: unit.code, keyCode: storedKey })
			});

			const data = (await res.json()) as { hasAccess?: boolean };
			return !!data.hasAccess;
		} catch (error) {
			console.error('Failed to validate stored key:', error);
		}
	}

	return false;
}
