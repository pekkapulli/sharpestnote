<script lang="ts">
	import { goto } from '$app/navigation';
	import { setUnitKeyCode } from '$lib/util/unitStorage.svelte';

	interface Props {
		compact?: boolean;
		onSuccess?: () => void;
	}

	let { compact = false, onSuccess }: Props = $props();

	let keyInput = $state('');
	let error = $state('');
	let isSubmitting = $state(false);
	let showSuccess = $state(false);

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
				keyInput = '';

				// Wait for animation to complete (1.5s) before navigating
				await new Promise((resolve) => setTimeout(resolve, 1500));
				onSuccess?.();
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
		class={compact
			? 'flex flex-col items-center justify-center rounded-md bg-emerald-50 p-3'
			: 'flex min-h-48 flex-col items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 p-6'}
	>
		<svg
			class={compact ? 'checkmark checkmark-compact' : 'checkmark'}
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
		<p
			class={compact
				? 'mt-2 text-center text-sm font-semibold text-slate-700'
				: 'mt-4 text-center text-lg font-semibold text-slate-700'}
		>
			Found it! Taking you to your unit...
		</p>
	</section>
{:else}
	<section class={compact ? 'rounded-mdp-3' : 'rounded-lg border p-6'}>
		{#if !compact}
			<h3 class="text-lg font-semibold text-slate-900">Go straight to your unit</h3>
		{/if}
		<p class={compact ? 'mb-2 text-sm text-slate-700' : 'mt-2 text-sm text-slate-700'}>
			Have a key code (under the QR code on your sheet music)? Enter it here.
		</p>
		<form
			onsubmit={handleSubmit}
			class={compact
				? 'flex items-start gap-2'
				: 'mt-4 flex flex-col gap-3 sm:flex-row sm:items-start'}
		>
			<div class="flex-1">
				<label for="navigator-key-code" class="sr-only">4-letter key code</label>
				<input
					id="navigator-key-code"
					type="text"
					bind:value={keyInput}
					placeholder="ABCD"
					maxlength="4"
					aria-describedby="navigator-key-error"
					aria-invalid={error ? 'true' : 'false'}
					class={compact
						? 'w-full rounded-md border border-emerald-300 px-2 py-1.5 text-center text-sm font-semibold tracking-widest uppercase focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-none'
						: 'w-full rounded-lg border border-emerald-300 px-4 py-3 text-center text-lg font-semibold tracking-widest uppercase focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none'}
				/>
				{#if error}
					<p id="navigator-key-error" class="mt-1 text-xs text-red-600" role="alert">{error}</p>
				{/if}
			</div>
			<button
				type="submit"
				disabled={isSubmitting}
				class={compact
					? 'rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
					: 'rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'}
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

	.checkmark-compact {
		width: 40px;
		height: 40px;
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
