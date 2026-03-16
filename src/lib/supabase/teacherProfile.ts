import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

function createSupabaseAdminClient(): SupabaseClient | null {
	const supabaseUrl = privateEnv.SUPABASE_URL ?? publicEnv.PUBLIC_SUPABASE_URL;
	const supabaseSecretKey = privateEnv.SUPABASE_SECRET_KEY;

	if (!supabaseUrl || !supabaseSecretKey) {
		return null;
	}

	return createClient(supabaseUrl, supabaseSecretKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

export async function ensureTeacherProfile(user: User, supabase?: SupabaseClient) {
	if (!user.email) return;

	const client = createSupabaseAdminClient() ?? supabase;
	if (!client) {
		throw new Error(
			'No Supabase client available for teacher profile sync. Set SUPABASE_SECRET_KEY or pass a request client.'
		);
	}

	const displayName =
		typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;

	await client.from('teacher_profiles').upsert(
		{
			id: user.id,
			email: user.email,
			display_name: displayName
		},
		{ onConflict: 'id' }
	);
}
