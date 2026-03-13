export function isTouchDevice(): boolean {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') {
		return false;
	}

	if ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) {
		return true;
	}

	return (
		'ontouchstart' in window ||
		window.matchMedia?.('(pointer: coarse)').matches ||
		window.matchMedia?.('(any-pointer: coarse)').matches
	);
}
