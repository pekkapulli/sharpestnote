<script lang="ts">
	import { setUnitKeyCode } from '$lib/util/unitStorage.svelte';
	import LinkButton from './LinkButton.svelte';

	interface Props {
		unitCode: string;
		onSuccess: () => void;
		purchaseUrl?: string;
	}

	let { unitCode, onSuccess, purchaseUrl = '/units' }: Props = $props();
	let keyInput = $state('');
	let keyError = $state('');
	let isSubmitting = $state(false);

	async function handleKeySubmit(event: Event) {
		event.preventDefault();
		keyError = '';
		isSubmitting = true;

		const trimmedKey = keyInput.trim().toUpperCase();

		if (trimmedKey.length !== 4) {
			keyError = 'Key code must be 4 characters';
			isSubmitting = false;
			return;
		}

		try {
			const res = await fetch('/api/access', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ unitCode, keyCode: trimmedKey })
			});

			const data = (await res.json()) as { hasAccess?: boolean };

			if (data.hasAccess) {
				setUnitKeyCode(unitCode, trimmedKey);
				keyInput = '';
				onSuccess();
			} else {
				keyError = 'Invalid key code';
			}
		} catch (error) {
			console.error('Key validation failed:', error);
			keyError = 'Network error. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<section class="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6">
	<h3 class="text-sm font-semibold text-slate-800">Already have access?</h3>
	<p class="mt-4 text-sm text-slate-600">Enter your 4-letter key code (below the QR code):</p>
	<form onsubmit={handleKeySubmit} class="mt-3 mb-4 flex flex-col gap-3 sm:flex-row sm:items-start">
		<div class="flex-1">
			<label for="key-code-input" class="sr-only">4-letter key code</label>
			<input
				id="key-code-input"
				type="text"
				bind:value={keyInput}
				placeholder="e.g., ABCD"
				maxlength="4"
				aria-describedby="key-error"
				aria-invalid={keyError ? 'true' : 'false'}
				class="w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-lg font-semibold tracking-widest uppercase focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
			/>
			{#if keyError}
				<p id="key-error" class="mt-1 text-sm text-red-600" role="alert">{keyError}</p>
			{/if}
		</div>
		<button
			type="submit"
			disabled={isSubmitting}
			class="rounded-lg bg-brand-green px-6 py-2 font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{isSubmitting ? 'Checking...' : 'Unlock'}
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
