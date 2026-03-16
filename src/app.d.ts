import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { UserRole } from '$lib/config/types';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{
				session: Session | null;
				user: (User & { role: UserRole; credits: number }) | null;
			}>;
		}
		interface PageData {
			session: Session | null;
			user: (User & { role: UserRole; credits: number }) | null;
		}
		// interface PageState {}
		interface Platform {
			env: {
				COUNTER: DurableObjectNamespace;
			};
			context: {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
