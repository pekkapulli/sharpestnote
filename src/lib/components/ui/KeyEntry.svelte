<script lang="ts">
	import { setUnitKeyCode } from '$lib/util/unitStorage.svelte';
	import LinkButton from './LinkButton.svelte';

	interface Props {
		unitCode: string;
		expectedKeyCode: string;
		onSuccess: () => void;
		purchaseUrl?: string;
	}

	let { unitCode, expectedKeyCode, onSuccess, purchaseUrl = '/store' }: Props = $props();
	let keyInput = $state('');
	let keyError = $state('');

	function handleKeySubmit(event: Event) {
		event.preventDefault();
		keyError = '';

		const trimmedKey = keyInput.trim().toUpperCase();

		if (trimmedKey.length !== 4) {
			keyError = 'Key code must be 4 characters';
			return;
		}

		if (trimmedKey === expectedKeyCode.toUpperCase()) {
			setUnitKeyCode(unitCode, trimmedKey);
			keyInput = '';
			onSuccess();
		} else {
			keyError = 'Invalid key code';
		}
	}
</script>

<section class="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6">
	<h3 class="text-sm font-semibold text-slate-800">Already have access?</h3>
	<p class="mt-4 text-sm text-slate-600">Enter your 4-letter key code:</p>
	<form onsubmit={handleKeySubmit} class="mt-3 mb-4 flex flex-col gap-3 sm:flex-row sm:items-start">
		<div class="flex-1">
			<input
				type="text"
				bind:value={keyInput}
				placeholder="e.g., ABCD"
				maxlength="4"
				class="w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-lg font-semibold tracking-widest uppercase focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
			/>
			{#if keyError}
				<p class="mt-1 text-sm text-red-600">{keyError}</p>
			{/if}
		</div>
		<button
			type="submit"
			class="rounded-lg bg-brand-green px-6 py-2 font-semibold text-white transition-colors hover:opacity-90"
		>
			Unlock
		</button>
	</form>
	<p class="mt-8 text-sm text-slate-600">
		Don't have a key yet? You can still play below with limited features or get the full sheet music
		pack.
	</p>
	<div>
		<LinkButton size="medium" href={purchaseUrl} color="green">Get the sheet music pack</LinkButton>
	</div>
</section>
