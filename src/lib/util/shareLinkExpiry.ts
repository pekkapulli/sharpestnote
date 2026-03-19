export function formatShareLinkTimeRemaining(value: string): string | null {
	if (!value) return null;

	const expiresAt = new Date(value);
	if (Number.isNaN(expiresAt.getTime())) return null;

	const now = new Date();
	if (expiresAt.getTime() <= now.getTime()) {
		return '0 days';
	}

	let months =
		(expiresAt.getFullYear() - now.getFullYear()) * 12 + (expiresAt.getMonth() - now.getMonth());

	const makeMonthAnchor = (monthOffset: number) =>
		new Date(
			now.getFullYear(),
			now.getMonth() + monthOffset,
			now.getDate(),
			now.getHours(),
			now.getMinutes(),
			now.getSeconds(),
			now.getMilliseconds()
		);

	const initialMonthAnchor = makeMonthAnchor(months);
	if (initialMonthAnchor.getTime() > expiresAt.getTime()) {
		months = Math.max(0, months - 1);
	}

	const monthAnchor = makeMonthAnchor(months);

	const msPerDay = 1000 * 60 * 60 * 24;
	const days = Math.max(0, Math.floor((expiresAt.getTime() - monthAnchor.getTime()) / msPerDay));

	if (months === 0) {
		return `${days} day${days === 1 ? '' : 's'}`;
	}

	return `${months} month${months === 1 ? '' : 's'}, ${days} day${days === 1 ? '' : 's'}`;
}
