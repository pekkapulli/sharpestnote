import type { UserRole } from '$lib/config/types';

const UNLIMITED_COMPOSER_ROLES = new Set<Exclude<UserRole, null>>([
	'core',
	'institutional_teacher',
	'admin',
	'owner'
]);

export function isUnlimitedComposerCredits(role: UserRole): boolean {
	return role !== null && UNLIMITED_COMPOSER_ROLES.has(role);
}

export function getMonthlyComposerCreditAmount(role: UserRole): number | null {
	return isUnlimitedComposerCredits(role) ? null : 1;
}
