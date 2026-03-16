<script lang="ts">
	import type { ActionData, PageData } from './$types';

	interface Props {
		data: PageData;
		form?: ActionData;
	}

	let { data, form }: Props = $props();
	let displayName = $derived(form?.displayName ?? data.teacherDisplayName ?? '');
	const errorMessage = $derived(form?.errorMessage ?? '');
	const successMessage = $derived(form?.successMessage ?? '');
</script>

<svelte:head>
	<title>Teacher Profile - The Sharpest Note</title>
</svelte:head>

<div class="min-h-screen bg-off-white py-10">
	<div class="mx-auto w-full max-w-2xl px-4">
		<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="mt-2 text-3xl font-semibold text-slate-900">Profile</h1>
				{#if data.teacherEmail}
					<p class="mt-1 text-sm text-slate-600">Signed in as {data.teacherEmail}</p>
				{/if}
			</div>
			<div class="flex gap-2">
				<form method="POST" action="?/signout">
					<button
						type="submit"
						class="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						Sign out
					</button>
				</form>
			</div>
		</div>

		<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<form method="POST" action="?/updateProfile" class="space-y-4">
				<div>
					<label for="displayName" class="block text-sm font-medium text-slate-700"
						>Display name</label
					>
					<input
						id="displayName"
						name="displayName"
						type="text"
						maxlength="80"
						bind:value={displayName}
						class="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-green focus:ring-2 focus:ring-brand-green/30 focus:outline-none"
						placeholder="Your name for students"
					/>
					<p class="mt-2 text-sm text-slate-500">
						Shown to you in teacher tools and reserved for future student-facing personalization.
					</p>
				</div>

				{#if errorMessage}
					<p class="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
						{errorMessage}
					</p>
				{/if}

				{#if successMessage}
					<p
						class="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
					>
						{successMessage}
					</p>
				{/if}

				<button
					type="submit"
					class="inline-flex items-center rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
				>
					Save profile
				</button>
			</form>
		</div>
	</div>
</div>
