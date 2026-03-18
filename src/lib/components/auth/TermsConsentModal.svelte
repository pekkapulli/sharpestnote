<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		isOpen: boolean;
		errorMessage?: string;
	}

	let { isOpen, errorMessage }: Props = $props();
	let termsAgreed = $state(false);
	let emailOptIn = $state(false);
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm" role="presentation">
		<div class="flex min-h-full items-center justify-center p-4">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="terms-modal-title"
				class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
			>
				<h2 id="terms-modal-title" class="text-xl font-bold text-slate-900">
					Welcome to The Sharpest Note
				</h2>
				<p class="mt-2 text-sm text-slate-600">
					Before you continue, please review and agree to our terms.
				</p>
				<form method="POST" action="?/acceptTerms" class="mt-5 space-y-4">
					<label class="flex cursor-pointer items-start gap-3">
						<input
							type="checkbox"
							name="termsAgreed"
							bind:checked={termsAgreed}
							class="mt-0.5 h-4 w-4 rounded border-slate-300"
						/>
						<span class="text-sm text-slate-700">
							I have read and agree to the
							<a
								href="/terms-of-service"
								target="_blank"
								rel="noopener noreferrer"
								class="underline underline-offset-2">Terms of Service</a
							>
							and
							<a
								href="/privacy"
								target="_blank"
								rel="noopener noreferrer"
								class="underline underline-offset-2">Privacy Policy</a
							>.
						</span>
					</label>
					<label class="flex cursor-pointer items-start gap-3">
						<input
							type="checkbox"
							name="emailOptIn"
							bind:checked={emailOptIn}
							class="mt-0.5 h-4 w-4 rounded border-slate-300"
						/>
						<span class="text-sm text-slate-700">
							I'd like to receive occasional updates by email.
						</span>
					</label>
					{#if errorMessage}
						<p class="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
							{errorMessage}
						</p>
					{/if}
					<button
						type="submit"
						disabled={!termsAgreed}
						class="mt-2 w-full rounded-md bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
					>
						Continue
					</button>
				</form>
				<form method="POST" action="?/signout" class="mt-3">
					<Button type="submit" variant="secondary" color="secondary" size="medium" fullWidth>
						Log out
					</Button>
				</form>
			</div>
		</div>
	</div>
{/if}
