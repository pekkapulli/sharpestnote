import type { Handle } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import type { UserRole } from '$lib/config/types';
import { ensureTeacherProfile } from '$lib/supabase/teacherProfile';
import { getMonthlyComposerCreditAmount } from '$lib/util/teacherAccess';

const USER_ROLES = new Set(['admin', 'owner', 'core', 'institutional_teacher', 'user']);

function toUserRole(value: unknown): UserRole {
	if (value === null) return null;
	if (typeof value !== 'string') return null;

	return USER_ROLES.has(value) ? (value as Exclude<UserRole, null>) : null;
}

function toUserCredits(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return Math.max(0, Math.trunc(value));
	}

	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return Math.max(0, Math.trunc(parsed));
		}
	}

	return 0;
}

type ProfileCreditsResult = {
	teacher_role: unknown;
	credits: unknown;
};

type ProfileFallbackRow = {
	teacher_role: unknown;
	credits: unknown;
	credits_refreshed_at: unknown;
};

function getMonthlyCreditAmount(role: UserRole): number | null {
	return getMonthlyComposerCreditAmount(role);
}

function getElapsedRefreshMonths(value: unknown, now = new Date()): number {
	const currentYear = now.getUTCFullYear();
	const currentMonth = now.getUTCMonth();

	if (!value || typeof value !== 'string') {
		return 1;
	}

	const refreshed = new Date(value);
	if (Number.isNaN(refreshed.getTime())) {
		return 1;
	}

	const refreshedYear = refreshed.getUTCFullYear();
	const refreshedMonth = refreshed.getUTCMonth();
	const monthDelta = (currentYear - refreshedYear) * 12 + (currentMonth - refreshedMonth);

	return Math.max(0, monthDelta);
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event);

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error || !user) {
			return { session: null, user: null };
		}

		let role: UserRole = null;
		let credits = 0;

		const { data: profileFromRpc, error: rpcError } = await event.locals.supabase
			.rpc('get_profile_with_credits')
			.maybeSingle();

		if (!rpcError && profileFromRpc) {
			const rpcProfile = profileFromRpc as ProfileCreditsResult;
			role = toUserRole(rpcProfile.teacher_role);
			credits = toUserCredits(rpcProfile.credits);
		} else {
			let { data: profileData, error: profileError } = await event.locals.supabase
				.from('teacher_profiles')
				.select('teacher_role, credits, credits_refreshed_at')
				.eq('id', user.id)
				.maybeSingle();

			if (!profileError && !profileData) {
				try {
					await ensureTeacherProfile(user, event.locals.supabase);
				} catch {
					// Keep auth flow functional even if profile bootstrap fails.
				}

				const bootstrapResult = await event.locals.supabase
					.from('teacher_profiles')
					.select('teacher_role, credits, credits_refreshed_at')
					.eq('id', user.id)
					.maybeSingle();

				profileData = bootstrapResult.data;
				profileError = bootstrapResult.error;
			}

			if (!profileError && profileData) {
				const fallbackProfile = profileData as ProfileFallbackRow;
				role = toUserRole(fallbackProfile.teacher_role);
				credits = toUserCredits(fallbackProfile.credits);

				const monthsDue = getElapsedRefreshMonths(fallbackProfile.credits_refreshed_at);
				if (monthsDue > 0) {
					const monthlyAmount = getMonthlyCreditAmount(role);
					const currentMonthStartIso = new Date(
						Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
					).toISOString();

					if (monthlyAmount === null) {
						await event.locals.supabase
							.from('teacher_profiles')
							.update({ credits_refreshed_at: new Date().toISOString() })
							.eq('id', user.id)
							.or(`credits_refreshed_at.is.null,credits_refreshed_at.lt.${currentMonthStartIso}`);
					} else {
						await event.locals.supabase
							.from('teacher_profiles')
							.update({
								credits: credits + monthlyAmount * monthsDue,
								credits_refreshed_at: new Date().toISOString()
							})
							.eq('id', user.id)
							.or(`credits_refreshed_at.is.null,credits_refreshed_at.lt.${currentMonthStartIso}`);

						credits += monthlyAmount * monthsDue;
					}
				}
			}
		}

		return {
			session,
			user: { ...user, role, credits } as typeof user & { role: UserRole; credits: number }
		};
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
