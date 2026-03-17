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
	<title>Login - The Sharpest Note</title>
</svelte:head>

<div class="min-h-screen bg-off-white py-14">
	<div class="mx-auto w-full max-w-lg px-4">
		<p class="text-sm font-semibold tracking-wide text-brand-green uppercase">Teacher tools</p>
		<h1 class="mt-3 text-3xl font-semibold text-slate-900">
			Log in or sign up to The Sharpest Note
		</h1>
		<p class="mt-3 text-slate-700">
			Send a sign-in email that contains both a login link and a 6-digit code. You can click the
			link or type the code below, which works even if your inbox is on another device.
		</p>

		<LoginForm
			{form}
			next={data.next}
			referralStudio={data.referralStudio}
			errorMessage={data.errorMessage}
		/>
	</div>
</div>
