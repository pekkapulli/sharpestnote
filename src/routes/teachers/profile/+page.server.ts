import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function sanitizeDisplayName(value: FormDataEntryValue | null): string {
	if (typeof value !== 'string') return '';
	return value.trim();
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		const redirectTarget = `${url.pathname}${url.search}`;
		throw redirect(303, `/teachers/login?next=${encodeURIComponent(redirectTarget)}`);
	}

	const { data } = await locals.supabase
		.from('teacher_profiles')
		.select('display_name')
		.eq('id', user.id)
		.maybeSingle();

	return {
		teacherEmail: user.email ?? '',
		teacherDisplayName: typeof data?.display_name === 'string' ? data.display_name : ''
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			throw redirect(303, '/teachers/login');
		}

		const formData = await request.formData();
		const displayName = sanitizeDisplayName(formData.get('displayName'));

		if (displayName.length > 80) {
			return fail(400, {
				errorMessage: 'Display name must be 80 characters or less.',
				displayName
			});
		}

		const { error } = await locals.supabase.from('teacher_profiles').upsert(
			{
				id: user.id,
				email: user.email,
				display_name: displayName || null
			},
			{ onConflict: 'id' }
		);

		if (error) {
			return fail(500, {
				errorMessage: 'Could not update profile right now. Please try again.',
				displayName
			});
		}

		return {
			successMessage: 'Profile updated.',
			displayName
		};
	},
	signout: async ({ locals }) => {
		await locals.supabase.auth.signOut();
		throw redirect(303, '/teachers/login');
	}
};
