import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	handleMagic,
	handleResend,
	handleVerifyCode,
	handlePassword,
	sanitizeNextPath
} from '$lib/server/loginActions';

function normalizeRef(value: string | null): string {
	if (!value) return '';
	return value
		.trim()
		.replace(/[^A-Za-z0-9_-]/g, '')
		.slice(0, 30);
}

type StudioRow = { display_name: string | null; studio_name: string | null };

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	const next = sanitizeNextPath(url.searchParams.get('next'));
	const ref = normalizeRef(url.searchParams.get('ref'));

	if (session) {
		throw redirect(303, next);
	}

	let studioName: string | null = null;
	let displayName: string | null = null;
	let found = false;

	if (ref) {
		try {
			const { data } = await locals.supabase
				.rpc('get_teacher_by_studio_name', { p_studio_name: ref })
				.maybeSingle();

			if (data) {
				const row = data as StudioRow;
				studioName = row.studio_name ?? null;
				displayName = row.display_name ?? null;
				found = Boolean(studioName);
			}
		} catch {
			// Non-blocking — page shows generic fallback on any lookup error.
		}
	}

	return { next, referralStudio: ref, studioName, displayName, found };
};

export const actions: Actions = {
	magic: (event) => handleMagic(event),
	resend: (event) => handleResend(event),
	verifyCode: (event) => handleVerifyCode(event),
	password: (event) => handlePassword(event)
};
