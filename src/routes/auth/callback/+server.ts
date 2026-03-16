import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureTeacherProfile } from '$lib/supabase/teacherProfile';

const DEFAULT_NEXT = '/teachers/profile';

function sanitizeNextPath(next: string | null): string {
	if (!next || !next.startsWith('/') || next.startsWith('//')) {
		return DEFAULT_NEXT;
	}

	return next;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const next = sanitizeNextPath(url.searchParams.get('next'));
	const code = url.searchParams.get('code');

	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			const {
				data: { user }
			} = await locals.supabase.auth.getUser();

			if (user) {
				try {
					await ensureTeacherProfile(user, locals.supabase);
				} catch {
					// Auth should still succeed even if profile sync is temporarily unavailable.
				}
			}

			throw redirect(303, next);
		}
	}

	const encodedNext = encodeURIComponent(next);
	const encodedError = encodeURIComponent('Could not finish sign-in. Please try again.');
	throw redirect(303, `/teachers/login?next=${encodedNext}&error=${encodedError}`);
};
