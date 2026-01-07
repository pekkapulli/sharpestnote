import { browser } from '$app/environment';
import { page } from '$app/stores';
import { get } from 'svelte/store';
import { setUnitKeyCode, getUnitKeyCode } from './unitStorage.svelte';

export async function initUnitKeyAccess(unitCode: string): Promise<boolean> {
	if (!browser) return false;

	// Check URL for key parameter first
	const currentPage = get(page);
	const urlKey = currentPage.url.searchParams.get('key');

	if (urlKey) {
		// Validate key against backend
		try {
			const res = await fetch('/api/access', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ unitCode, keyCode: urlKey })
			});

			const data = (await res.json()) as { hasAccess?: boolean };

			if (data.hasAccess) {
				// Valid key - store it for future visits
				setUnitKeyCode(unitCode, urlKey);
				// Remove the key parameter from URL
				const newUrl = new URL(currentPage.url);
				newUrl.searchParams.delete('key');
				window.history.replaceState({}, '', newUrl.toString());
				return true;
			}
		} catch (error) {
			console.error('Failed to validate key:', error);
		}
	}

	// Check if we already have valid access from previous visit
	const storedKey = getUnitKeyCode(unitCode);
	if (storedKey) {
		try {
			const res = await fetch('/api/access', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ unitCode, keyCode: storedKey })
			});

			const data = (await res.json()) as { hasAccess?: boolean };
			return !!data.hasAccess;
		} catch (error) {
			console.error('Failed to validate stored key:', error);
		}
	}

	return false;
}
