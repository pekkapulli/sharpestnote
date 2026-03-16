import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ensureTeacherProfile } from '$lib/supabase/teacherProfile';

const DEFAULT_NEXT = '/teachers/profile';
const GENERIC_ERROR = 'Could not sign in. Please try again.';

function sanitizeNextPath(next: string | null): string {
	if (!next || !next.startsWith('/') || next.startsWith('//')) {
		return DEFAULT_NEXT;
	}

	return next;
}

function normalizeEmail(value: FormDataEntryValue | null): string {
	if (typeof value !== 'string') return '';
	return value.trim().toLowerCase();
}

function normalizePassword(value: FormDataEntryValue | null): string {
	if (typeof value !== 'string') return '';
	return value;
}

function normalizeToken(value: FormDataEntryValue | null): string {
	if (typeof value !== 'string') return '';
	return value.replace(/\s+/g, '');
}

function normalizeSentAt(value: FormDataEntryValue | null): number | null {
	if (typeof value !== 'string') return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return null;
	return parsed;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	const next = sanitizeNextPath(url.searchParams.get('next'));

	if (session) {
		throw redirect(303, next);
	}

	return {
		next,
		errorMessage: url.searchParams.get('error') ?? ''
	};
};

export const actions: Actions = {
	magic: async ({ request, locals, url }) => {
		const formData = await request.formData();
		const email = normalizeEmail(formData.get('email'));
		const next = sanitizeNextPath(formData.get('next')?.toString() ?? null);

		if (!email) {
			return fail(400, {
				errorMessage: 'Email is required to receive a sign-in email.',
				next,
				email
			});
		}

		const redirectTo = `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`;
		const { error } = await locals.supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: redirectTo }
		});

		if (error) {
			return fail(400, {
				errorMessage: error.message || GENERIC_ERROR,
				next,
				email
			});
		}

		return {
			successMessage: 'Check your email for a sign-in link and a 6-digit code.',
			showCodeSection: true,
			sentAt: Date.now(),
			next,
			email
		};
	},
	resend: async ({ request, locals, url }) => {
		const formData = await request.formData();
		const email = normalizeEmail(formData.get('email'));
		const next = sanitizeNextPath(formData.get('next')?.toString() ?? null);

		if (!email) {
			return fail(400, {
				errorMessage: 'Email is required to resend a sign-in email.',
				showCodeSection: true,
				next,
				email
			});
		}

		const redirectTo = `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`;
		const { error } = await locals.supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: redirectTo }
		});

		if (error) {
			return fail(400, {
				errorMessage: error.message || GENERIC_ERROR,
				showCodeSection: true,
				next,
				email
			});
		}

		return {
			successMessage: 'A new sign-in email has been sent.',
			showCodeSection: true,
			sentAt: Date.now(),
			next,
			email
		};
	},
	verifyCode: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = normalizeEmail(formData.get('email'));
		const token = normalizeToken(formData.get('token'));
		const next = sanitizeNextPath(formData.get('next')?.toString() ?? null);
		const sentAt = normalizeSentAt(formData.get('sentAt'));

		if (!email || !token) {
			return fail(400, {
				errorMessage: 'Email and 6-digit code are required.',
				showCodeSection: true,
				sentAt,
				next,
				email
			});
		}

		if (!/^\d{6}$/.test(token)) {
			return fail(400, {
				errorMessage: 'Enter the 6-digit code from your email.',
				showCodeSection: true,
				sentAt,
				next,
				email
			});
		}

		const { data, error } = await locals.supabase.auth.verifyOtp({
			email,
			token,
			type: 'email'
		});

		if (error) {
			return fail(400, {
				errorMessage: error.message || GENERIC_ERROR,
				showCodeSection: true,
				sentAt,
				next,
				email
			});
		}

		if (data.user) {
			try {
				await ensureTeacherProfile(data.user, locals.supabase);
			} catch {
				// Auth should still succeed even if profile sync is temporarily unavailable.
			}
		}

		throw redirect(303, next);
	},
	oauthGoogle: async ({ request, locals, url }) => {
		const formData = await request.formData();
		const next = sanitizeNextPath(formData.get('next')?.toString() ?? null);

		const redirectTo = `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`;
		const { data, error } = await locals.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo }
		});

		if (error || !data.url) {
			return fail(400, {
				errorMessage: error?.message || GENERIC_ERROR,
				next
			});
		}

		throw redirect(303, data.url);
	},
	password: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = normalizeEmail(formData.get('email'));
		const password = normalizePassword(formData.get('password'));
		const next = sanitizeNextPath(formData.get('next')?.toString() ?? null);

		if (!email || !password) {
			return fail(400, {
				errorMessage: 'Email and password are required.',
				next,
				email
			});
		}

		const { data, error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) {
			return fail(400, {
				errorMessage: error.message || GENERIC_ERROR,
				next,
				email
			});
		}

		if (data.user) {
			try {
				await ensureTeacherProfile(data.user, locals.supabase);
			} catch {
				// Auth should still succeed even if profile sync is temporarily unavailable.
			}
		}

		throw redirect(303, next);
	}
};
