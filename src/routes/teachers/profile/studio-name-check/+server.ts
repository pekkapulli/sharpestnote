import { json, type RequestHandler } from '@sveltejs/kit';
import { isStudioNameTooCloseToBrand, isValidStudioName } from '$lib/util/studioNameValidation';

const OWNER_STUDIO_NAME = 'TheSharpestNote';

function sanitizeStudioName(value: string | null): string {
	if (typeof value !== 'string') return '';
	return value.trim();
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		return json(
			{
				ok: false,
				valid: false,
				available: false,
				message: 'Please sign in to validate studio name.'
			},
			{ status: 401 }
		);
	}

	const studioName = sanitizeStudioName(url.searchParams.get('value'));

	if (user.role === 'owner') {
		const requested = studioName || OWNER_STUDIO_NAME;
		if (requested !== OWNER_STUDIO_NAME) {
			return json({
				ok: true,
				valid: false,
				available: false,
				message: 'Owner studio name is fixed to TheSharpestNote.'
			});
		}

		return json({
			ok: true,
			valid: true,
			available: true,
			message: 'Owner studio name is fixed to TheSharpestNote.'
		});
	}

	if (!studioName) {
		return json({
			ok: true,
			valid: true,
			available: true,
			message: 'Studio name is optional.'
		});
	}

	if (studioName.length > 30) {
		return json({
			ok: true,
			valid: false,
			available: false,
			message: 'Must be 30 characters or less.'
		});
	}

	if (!isValidStudioName(studioName)) {
		return json({
			ok: true,
			valid: false,
			available: false,
			message: 'Use only letters, numbers, hyphens (-), and underscores (_).'
		});
	}

	if (isStudioNameTooCloseToBrand(studioName)) {
		return json({
			ok: true,
			valid: false,
			available: false,
			message:
				'Studio name is too similar to Sharpest Note and cannot be used. Please choose a distinct name.'
		});
	}

	const { data: existing, error } = await locals.supabase
		.from('teacher_profiles')
		.select('id')
		.eq('studio_name', studioName)
		.neq('id', user.id)
		.limit(1)
		.maybeSingle();

	if (error) {
		return json(
			{
				ok: false,
				valid: true,
				available: false,
				message: 'Could not check availability right now.'
			},
			{ status: 500 }
		);
	}

	if (existing) {
		return json({
			ok: true,
			valid: true,
			available: false,
			message: 'This studio name is already taken.'
		});
	}

	return json({
		ok: true,
		valid: true,
		available: true,
		message: 'Studio name is available.'
	});
};
