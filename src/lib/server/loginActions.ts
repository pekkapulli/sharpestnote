import { fail, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureTeacherProfile, applyReferral } from '$lib/supabase/teacherProfile';

const DEFAULT_NEXT = '/teachers/profile';
const GENERIC_ERROR = 'Could not sign in. Please try again.';

export function sanitizeNextPath(next: string | null): string {
	if (!next || !next.startsWith('/') || next.startsWith('//')) {
		return DEFAULT_NEXT;
	}
	return next;
}

function normalizeEmail(value: FormDataEntryValue | null): string {
	if (typeof value !== 'string') return '';
	return value.trim().toLowerCase();
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

function normalizeReferralStudio(value: FormDataEntryValue | null): string {
	if (typeof value !== 'string') return '';
	// Strip any chars that aren't valid in a studio name
	return value
		.trim()
		.replace(/[^A-Za-z0-9_-]/g, '')
		.slice(0, 30);
}

export async function handleMagic(event: RequestEvent) {
	const formData = await event.request.formData();
	const email = normalizeEmail(formData.get('email'));
	const next = sanitizeNextPath(formData.get('next')?.toString() ?? null);
	const referralStudio = normalizeReferralStudio(formData.get('referralStudio'));

	if (!email) {
		return fail(400, {
			errorMessage: 'Email is required to receive a sign-in email.',
			next,
			email,
			referralStudio
		});
	}

	const redirectTo = `${event.url.origin}/auth/callback?next=${encodeURIComponent(next)}`;
	const { error } = await event.locals.supabase.auth.signInWithOtp({
		email,
		options: { emailRedirectTo: redirectTo }
	});

	if (error) {
		return fail(400, {
			errorMessage: error.message || GENERIC_ERROR,
			next,
			email,
			referralStudio
		});
	}

	return {
		successMessage: 'Check your email for a sign-in link and a 6-digit code.',
		showCodeSection: true,
		sentAt: Date.now(),
		next,
		email,
		referralStudio
	};
}

export async function handleResend(event: RequestEvent) {
	const formData = await event.request.formData();
	const email = normalizeEmail(formData.get('email'));
	const next = sanitizeNextPath(formData.get('next')?.toString() ?? null);
	const referralStudio = normalizeReferralStudio(formData.get('referralStudio'));

	if (!email) {
		return fail(400, {
			errorMessage: 'Email is required to resend a sign-in email.',
			showCodeSection: true,
			next,
			email,
			referralStudio
		});
	}

	const redirectTo = `${event.url.origin}/auth/callback?next=${encodeURIComponent(next)}`;
	const { error } = await event.locals.supabase.auth.signInWithOtp({
		email,
		options: { emailRedirectTo: redirectTo }
	});

	if (error) {
		return fail(400, {
			errorMessage: error.message || GENERIC_ERROR,
			showCodeSection: true,
			next,
			email,
			referralStudio
		});
	}

	return {
		successMessage: 'A new sign-in email has been sent.',
		showCodeSection: true,
		sentAt: Date.now(),
		next,
		email,
		referralStudio
	};
}

export async function handleVerifyCode(event: RequestEvent) {
	const formData = await event.request.formData();
	const email = normalizeEmail(formData.get('email'));
	const token = normalizeToken(formData.get('token'));
	const next = sanitizeNextPath(formData.get('next')?.toString() ?? null);
	const sentAt = normalizeSentAt(formData.get('sentAt'));
	const referralStudio = normalizeReferralStudio(formData.get('referralStudio'));

	if (!email || !token) {
		return fail(400, {
			errorMessage: 'Email and 6-digit code are required.',
			showCodeSection: true,
			sentAt,
			next,
			email,
			referralStudio
		});
	}

	if (!/^\d{6}$/.test(token)) {
		return fail(400, {
			errorMessage: 'Enter the 6-digit code from your email.',
			showCodeSection: true,
			sentAt,
			next,
			email,
			referralStudio
		});
	}

	const { data, error } = await event.locals.supabase.auth.verifyOtp({
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
			email,
			referralStudio
		});
	}

	if (data.user) {
		try {
			await ensureTeacherProfile(data.user, event.locals.supabase);
		} catch {
			// Auth still succeeds even if profile sync is temporarily unavailable.
		}

		if (referralStudio) {
			try {
				await applyReferral(data.user.id, referralStudio, event.locals.supabase);
			} catch {
				// Non-blocking.
			}
		}
	}

	throw redirect(303, next);
}

export async function handlePassword(event: RequestEvent) {
	const formData = await event.request.formData();
	const email = normalizeEmail(formData.get('email'));
	const password =
		typeof formData.get('password') === 'string' ? String(formData.get('password')) : '';
	const next = sanitizeNextPath(formData.get('next')?.toString() ?? null);
	const referralStudio = normalizeReferralStudio(formData.get('referralStudio'));

	if (!email || !password) {
		return fail(400, {
			errorMessage: 'Email and password are required.',
			next,
			email,
			referralStudio
		});
	}

	const { data, error } = await event.locals.supabase.auth.signInWithPassword({ email, password });

	if (error) {
		return fail(400, {
			errorMessage: error.message || GENERIC_ERROR,
			next,
			email,
			referralStudio
		});
	}

	if (data.user) {
		try {
			await ensureTeacherProfile(data.user, event.locals.supabase);
		} catch {
			// Auth still succeeds.
		}

		if (referralStudio) {
			try {
				await applyReferral(data.user.id, referralStudio, event.locals.supabase);
			} catch {
				// Non-blocking.
			}
		}
	}

	throw redirect(303, next);
}
