import { env } from '$env/dynamic/public';
import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';

export function createSupabaseServerClient(event: RequestEvent) {
	const supabaseUrl = env.PUBLIC_SUPABASE_URL;
	const supabasePublishableKey =
		env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabasePublishableKey) {
		throw new Error(
			'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables.'
		);
	}

	return createServerClient(supabaseUrl, supabasePublishableKey, {
		cookies: {
			getAll() {
				return event.cookies.getAll();
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					event.cookies.set(name, value, {
						...options,
						path: '/'
					});
				}
			}
		}
	});
}
