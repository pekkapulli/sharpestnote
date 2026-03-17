<script lang="ts">
	import LoginForm from '$lib/components/auth/LoginForm.svelte';
	import type { ActionData, PageData } from './$types';

	interface Props {
		data: PageData;
		form?: ActionData;
	}

	let { data, form }: Props = $props();
</script>

<svelte:head>
	<title>Join The Sharpest Note</title>
</svelte:head>

<div class="min-h-screen bg-off-white py-14">
	<div class="mx-auto w-full max-w-lg px-4">
		<p class="text-sm font-semibold tracking-wide text-brand-green uppercase">Teacher tools</p>

		{#if data.found && data.studioName}
			<h1 class="mt-3 text-3xl font-semibold text-slate-900">
				You've been invited to The Sharpest Note
			</h1>
			<p class="mt-3 text-slate-700">
				<span class="font-semibold text-slate-900">{data.displayName ?? data.studioName}</span
				>{#if data.displayName && data.studioName && data.displayName !== data.studioName}
					<span class="text-slate-500"> ({data.studioName})</span>
				{/if}
				recommends The Sharpest Note for music teachers. Sign up below — when you publish your first piece,
				you'll both receive 3 bonus credits.
			</p>
		{:else}
			<h1 class="mt-3 text-3xl font-semibold text-slate-900">Join The Sharpest Note</h1>
			<p class="mt-3 text-slate-700">
				Sign up or log in to access teacher tools. If a colleague gave you a referral code, enter it
				below — you'll both receive 3 bonus credits when you publish your first piece.
			</p>
		{/if}

		<LoginForm {form} next={data.next} referralStudio={data.referralStudio} />
	</div>
</div>
