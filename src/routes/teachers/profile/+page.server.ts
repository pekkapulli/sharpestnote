import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isStudioNameTooCloseToBrand, isValidStudioName } from '$lib/util/studioNameValidation';
import type { UserRole } from '$lib/config/types';

const OWNER_STUDIO_NAME = 'TheSharpestNote';

interface ComposerAccessPlan {
	name: string;
	headline: string;
	details: string;
}

function getComposerAccessPlan(role: UserRole): ComposerAccessPlan {
	switch (role) {
		case 'core':
			return {
				name: 'Collaborator plan',
				headline:
					'Thank you for your collaboration! You get 15 composer credits per every month you log in.',
				details: 'Your account includes an expanded monthly composer allowance.'
			};
		case 'institution_teacher':
			return {
				name: 'Organization-covered plan',
				headline: 'You have unlimited access to the composer tool.',
				details: 'Your composer use is being covered by your organization.'
			};
		case 'admin':
			return {
				name: 'Admin access',
				headline: 'You can use the composer tool freely.',
				details: 'Admin access includes free use of composer features.'
			};
		case 'owner':
			return {
				name: 'Owner access',
				headline: 'Hi Pekka!',
				details: 'Owner access includes free use of all features.'
			};
		case 'user':
		case null:
		default:
			return {
				name: 'Free plan',
				headline: 'You get 3 free composer credits per every month you log in.',
				details: 'Credits refresh monthly.'
			};
	}
}

function sanitizeDisplayName(value: FormDataEntryValue | null): string {
	if (typeof value !== 'string') return '';
	return value.trim();
}

function sanitizeStudioName(value: FormDataEntryValue | null): string {
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
		.select('display_name, studio_name, terms_accepted_at, email_opt_in')
		.eq('id', user.id)
		.maybeSingle();

	if (user.role === 'owner' && data?.studio_name !== OWNER_STUDIO_NAME) {
		try {
			await locals.supabase
				.from('teacher_profiles')
				.upsert(
					{ id: user.id, email: user.email, studio_name: OWNER_STUDIO_NAME },
					{ onConflict: 'id' }
				);
		} catch {
			// Keep profile page functional even if background sync fails.
		}
	}

	const hasUnlimitedComposerCredits =
		user.role === 'institution_teacher' || user.role === 'admin' || user.role === 'owner';

	return {
		teacherEmail: user.email ?? '',
		teacherDisplayName: typeof data?.display_name === 'string' ? data.display_name : '',
		teacherStudioName:
			user.role === 'owner'
				? OWNER_STUDIO_NAME
				: typeof data?.studio_name === 'string'
					? data.studio_name
					: '',
		isOwner: user.role === 'owner',
		composerCredits: hasUnlimitedComposerCredits ? null : user.credits,
		composerAccessPlan: getComposerAccessPlan(user.role),
		needsTermsAcceptance: !data?.terms_accepted_at,
		emailOptIn: data?.email_opt_in ?? false
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
		const submittedStudioName = sanitizeStudioName(formData.get('studioName'));
		const studioName = user.role === 'owner' ? OWNER_STUDIO_NAME : submittedStudioName;

		if (displayName.length > 80) {
			return fail(400, {
				errorMessage: 'Display name must be 80 characters or less.',
				displayName,
				studioName
			});
		}

		if (studioName.length > 30) {
			return fail(400, {
				errorMessage: 'Studio name must be 30 characters or less.',
				displayName,
				studioName
			});
		}

		if (studioName && !isValidStudioName(studioName)) {
			return fail(400, {
				errorMessage:
					'Studio name can contain only letters, numbers, hyphens (-), and underscores (_).',
				displayName,
				studioName
			});
		}

		if (user.role !== 'owner' && studioName && isStudioNameTooCloseToBrand(studioName)) {
			return fail(400, {
				errorMessage:
					'Studio name is too similar to Sharpest Note and cannot be used. Please choose a distinct name.',
				displayName,
				studioName
			});
		}

		if (user.role !== 'owner' && studioName) {
			const { data: existing, error: existingError } = await locals.supabase
				.from('teacher_profiles')
				.select('id')
				.eq('studio_name', studioName)
				.neq('id', user.id)
				.limit(1)
				.maybeSingle();

			if (existingError) {
				return fail(500, {
					errorMessage: 'Could not validate studio name right now. Please try again.',
					displayName,
					studioName
				});
			}

			if (existing) {
				return fail(400, {
					errorMessage: 'That studio name is already in use.',
					displayName,
					studioName
				});
			}
		}

		const { error } = await locals.supabase.from('teacher_profiles').upsert(
			{
				id: user.id,
				email: user.email,
				display_name: displayName || null,
				studio_name: studioName || null
			},
			{ onConflict: 'id' }
		);

		if (error) {
			if (error.code === '23505') {
				return fail(400, {
					errorMessage: 'That studio name is already in use.',
					displayName,
					studioName
				});
			}

			return fail(500, {
				errorMessage: 'Could not update profile right now. Please try again.',
				displayName,
				studioName
			});
		}

		return {
			successMessage: 'Profile updated.',
			displayName,
			studioName
		};
	},
	signout: async ({ locals }) => {
		await locals.supabase.auth.signOut();
		throw redirect(303, '/teachers/login');
	},

	acceptTerms: async ({ request, locals }) => {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) throw redirect(303, '/teachers/login');

		const formData = await request.formData();
		const termsAgreed = formData.get('termsAgreed') === 'on';

		if (!termsAgreed) {
			return fail(400, { acceptTermsError: 'You must agree to the terms to continue.' });
		}

		const emailOptIn = formData.get('emailOptIn') === 'on';

		const { error } = await locals.supabase
			.from('teacher_profiles')
			.update({
				terms_accepted_at: new Date().toISOString(),
				terms_accepted_version: '2026-03-18',
				email_opt_in: emailOptIn
			})
			.eq('id', user.id);

		if (error) {
			return fail(500, { acceptTermsError: 'Could not save your preferences. Please try again.' });
		}

		return {};
	},

	updateEmailOptIn: async ({ request, locals }) => {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) throw redirect(303, '/teachers/login');

		const formData = await request.formData();
		const emailOptIn = formData.get('emailOptIn') === 'on';

		const { error } = await locals.supabase
			.from('teacher_profiles')
			.update({ email_opt_in: emailOptIn })
			.eq('id', user.id);

		if (error) {
			return fail(500, { emailOptInError: 'Could not save your preference. Please try again.' });
		}

		return { emailOptInSuccess: true };
	}
};
