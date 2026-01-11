<script lang="ts">
	import { goto } from '$app/navigation';
	import { setUnitKeyCode } from '$lib/util/unitStorage.svelte';
	import LinkButton from './LinkButton.svelte';

	let keyInput = $state('');
	let error = $state('');
	let isSubmitting = $state(false);
	let showSuccess = $state(false);
	let successUnitCode = $state('');
	let successKeyCode = $state('');

	async function handleSubmit(event: Event) {
		event.preventDefault();
		error = '';
		isSubmitting = true;

		const trimmedKey = keyInput.trim().toUpperCase();

		if (trimmedKey.length !== 4) {
			error = 'Key code must be 4 characters';
			isSubmitting = false;
			return;
		}

		try {
			const res = await fetch('/api/access/lookup', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ keyCode: trimmedKey })
			});

			const data = (await res.json()) as { unitCode?: string; error?: string };

			if (data.unitCode) {
				setUnitKeyCode(data.unitCode, trimmedKey);
				showSuccess = true;
				successUnitCode = data.unitCode;
				successKeyCode = trimmedKey;
				keyInput = '';

				// Wait for animation to complete (1.5s) before navigating
				await new Promise((resolve) => setTimeout(resolve, 1500));
				await goto(`/unit/${data.unitCode}?key=${trimmedKey}`);
			} else {
				error = data.error || 'Key code not found';
				isSubmitting = false;
			}
		} catch (err) {
			console.error('Lookup failed:', err);
			error = 'Network error. Please try again.';
			isSubmitting = false;
		}
	}
</script>

{#if showSuccess}
	<section
		class="flex min-h-48 flex-col items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 p-6"
	>
		<svg
			class="checkmark"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
		<p class="mt-4 text-center text-lg font-semibold text-slate-700">
			Found it! Taking you to your unit...
		</p>
	</section>
{:else}
	<section class="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
		<h3 class="text-lg font-semibold text-slate-900">Go straight to your unit</h3>
		<p class="mt-2 text-sm text-slate-700">
			Have a key code (under the QR code on your sheet music)? Enter it here to access your sheet
			music and games right away.
		</p>
		<form onsubmit={handleSubmit} class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
			<div class="flex-1">
				<label for="navigator-key-code" class="sr-only">4-letter key code</label>
				<input
					id="navigator-key-code"
					type="text"
					bind:value={keyInput}
					placeholder="e.g., ABCD"
					maxlength="4"
					aria-describedby="navigator-key-error"
					aria-invalid={error ? 'true' : 'false'}
					class="w-full rounded-lg border border-emerald-300 px-4 py-3 text-center text-lg font-semibold tracking-widest uppercase focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
				/>
				{#if error}
					<p id="navigator-key-error" class="mt-2 text-sm text-red-600" role="alert">{error}</p>
				{/if}
			</div>
			<button
				type="submit"
				disabled={isSubmitting}
				class="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isSubmitting ? 'Looking up...' : 'Go to unit'}
			</button>
		</form>
	</section>
{/if}

<style>
	.checkmark {
		width: 80px;
		height: 80px;
		color: rgb(16 185 129);
		animation: checkmark-draw 1.5s ease-out forwards;
	}

	@keyframes checkmark-draw {
		0% {
			stroke-dasharray: 50;
			stroke-dashoffset: 50;
			opacity: 0;
		}
		50% {
			opacity: 1;
		}
		100% {
			stroke-dasharray: 50;
			stroke-dashoffset: 0;
			opacity: 1;
			transform: scale(1.1);
		}
	}
</style>
