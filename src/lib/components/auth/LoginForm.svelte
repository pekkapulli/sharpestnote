<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	interface LoginFormResult {
		errorMessage?: string;
		successMessage?: string;
		email?: string;
		showCodeSection?: boolean;
		sentAt?: number | null;
		referralStudio?: string;
	}

	interface Props {
		// form is the last action response from the parent page
		form?: LoginFormResult | null;
		next: string;
		// pre-fills the referral code input (e.g. from ?ref= query param)
		referralStudio?: string;
		// optional error message passed from URL params or other sources
		errorMessage?: string;
	}

	let {
		form,
		next,
		referralStudio: initialReferralStudio = '',
		errorMessage: externalErrorMessage = ''
	}: Props = $props();

	const resolvedErrorMessage = $derived(form?.errorMessage || externalErrorMessage || '');
	const successMessage = $derived(form?.successMessage || '');
	const emailValue = $derived(form?.email || '');
	const showCodeSection = $derived(Boolean(form?.showCodeSection || form?.successMessage));
	const sentAt = $derived((typeof form?.sentAt === 'number' ? form.sentAt : 0) || 0);

	let emailInput = $state('');
	let lastSyncedEmail = $state('');
	let isEditingEmail = $state(false);
	// On mount, prefer the echoed form value or fall back to the initial prop.
	// The effect re-runs only when `form` changes (i.e., after a form submission),
	// never when the user is typing — so it doesn't interfere with user edits.
	let referralInput = $derived(form?.referralStudio ?? initialReferralStudio);
	$effect(() => {
		if (emailValue !== lastSyncedEmail) {
			emailInput = emailValue;
			lastSyncedEmail = emailValue;
			isEditingEmail = false;
		}
	});

	const showCodeStep = $derived(showCodeSection && !isEditingEmail);

	let now = $state(Date.now());

	$effect(() => {
		if (!showCodeSection || !sentAt) return;

		now = Date.now();
		const timer = setInterval(() => {
			now = Date.now();
		}, 1000);

		return () => clearInterval(timer);
	});

	const resendSecondsLeft = $derived(
		sentAt ? Math.max(0, 60 - Math.floor((now - sentAt) / 1000)) : 0
	);
	const codeStepEmail = $derived((emailValue || emailInput).trim());
	const canResend = $derived(showCodeStep && resendSecondsLeft === 0 && Boolean(codeStepEmail));

	const OTP_LENGTH = 6;
	let otpDigits = $state<string[]>(Array(OTP_LENGTH).fill(''));
	let otpInputs = $state<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));
	let verifyCodeForm = $state<HTMLFormElement | null>(null);
	let verifyEmailHiddenInput = $state<HTMLInputElement | null>(null);
	let verifyTokenHiddenInput = $state<HTMLInputElement | null>(null);
	const otpCode = $derived(otpDigits.join(''));

	function getOtpCodeFromInputs(): string {
		return otpInputs
			.map((input) => input?.value.replace(/\D/g, '') ?? '')
			.join('')
			.slice(0, OTP_LENGTH);
	}

	function syncVerifyFormHiddenFields(): string {
		const token = getOtpCodeFromInputs();
		if (verifyEmailHiddenInput) verifyEmailHiddenInput.value = codeStepEmail;
		if (verifyTokenHiddenInput) verifyTokenHiddenInput.value = token;
		return token;
	}

	function maybeAutoSubmitOtp(previousCode: string): void {
		const token = syncVerifyFormHiddenFields();
		if (token === previousCode) return;
		if (!codeStepEmail) return;
		if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(token)) return;
		verifyCodeForm?.requestSubmit();
	}

	function focusOtpInput(index: number): void {
		if (index < 0 || index >= OTP_LENGTH) return;
		otpInputs[index]?.focus();
		otpInputs[index]?.select();
	}

	function distributeOtpDigits(rawValue: string, startIndex = 0): number {
		const digits = rawValue.replace(/\D/g, '');
		if (!digits.length) return startIndex;

		let nextIndex = startIndex;
		for (const digit of digits) {
			if (nextIndex >= OTP_LENGTH) break;
			otpDigits[nextIndex] = digit;
			nextIndex += 1;
		}

		return Math.min(nextIndex, OTP_LENGTH - 1);
	}

	function handleOtpInput(index: number, event: Event): void {
		const previousCode = otpCode;
		const target = event.currentTarget as HTMLInputElement;
		const digits = target.value.replace(/\D/g, '');

		if (!digits) {
			otpDigits[index] = '';
			return;
		}

		if (digits.length > 1) {
			const nextIndex = distributeOtpDigits(digits, index);
			focusOtpInput(nextIndex);
			maybeAutoSubmitOtp(previousCode);
			return;
		}

		otpDigits[index] = digits;
		focusOtpInput(index + 1);
		maybeAutoSubmitOtp(previousCode);
	}

	function handleOtpKeydown(index: number, event: KeyboardEvent): void {
		if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
			event.preventDefault();
			otpDigits[index - 1] = '';
			focusOtpInput(index - 1);
		}

		if (event.key === 'ArrowLeft' && index > 0) {
			event.preventDefault();
			focusOtpInput(index - 1);
		}

		if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
			event.preventDefault();
			focusOtpInput(index + 1);
		}
	}

	function handleOtpPaste(index: number, event: ClipboardEvent): void {
		const previousCode = otpCode;
		event.preventDefault();
		const pasted = event.clipboardData?.getData('text') ?? '';
		const digits = pasted.replace(/\D/g, '');

		if (!digits) return;

		const startIndex = digits.length >= OTP_LENGTH ? 0 : index;
		const nextIndex = distributeOtpDigits(digits, startIndex);
		focusOtpInput(nextIndex);
		maybeAutoSubmitOtp(previousCode);
	}

	$effect(() => {
		if (!showCodeStep) {
			otpDigits = Array(OTP_LENGTH).fill('');
		}
	});
</script>

{#if resolvedErrorMessage}
	<p class="mt-5 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
		{resolvedErrorMessage}
	</p>
{/if}

{#if successMessage}
	<p
		class="mt-5 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
	>
		{successMessage}
	</p>
{/if}

<div class="mt-8 space-y-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
	<section class="space-y-4">
		<h2 class="text-lg font-semibold text-slate-900">Send sign-in email</h2>
		<form
			method="POST"
			action="?/magic"
			class="space-y-3"
			onsubmit={() => {
				isEditingEmail = false;
			}}
		>
			<input type="hidden" name="next" value={next} />

			<div>
				<label class="block text-sm font-medium text-slate-700" for="magic-email">Email</label>
				<input
					id="magic-email"
					type="email"
					name="email"
					required
					autocomplete="email"
					bind:value={emailInput}
					disabled={showCodeStep}
					class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-green focus:ring-2 focus:ring-brand-green/30 focus:outline-none disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="referral-code">
					Referral code <span class="font-normal text-slate-500">(optional)</span>
				</label>
				<input
					id="referral-code"
					type="text"
					name="referralStudio"
					maxlength="30"
					autocomplete="off"
					bind:value={referralInput}
					disabled={showCodeStep}
					placeholder="e.g. HarmonyStudio"
					class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-green focus:ring-2 focus:ring-brand-green/30 focus:outline-none disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
				/>
				<p class="mt-1 text-xs text-slate-500">
					Have a referral code from a colleague? Enter it here — when you publish your first piece,
					you'll both receive 3 bonus credits.
				</p>
			</div>

			<button
				type="submit"
				disabled={showCodeStep}
				class="inline-flex items-center rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-100"
			>
				Send code
			</button>
		</form>

		{#if showCodeStep}
			<p class="text-sm text-slate-600">
				Sign-in email sent to <span class="font-semibold text-slate-800">{codeStepEmail}</span>.
			</p>
			<Button
				type="button"
				variant="secondary"
				onclick={() => {
					isEditingEmail = true;
				}}
			>
				Change email
			</Button>
		{/if}
	</section>

	{#if showCodeStep}
		<section class="space-y-4 border-t border-slate-200 pt-6">
			<form
				method="POST"
				action="?/verifyCode"
				class="space-y-3"
				bind:this={verifyCodeForm}
				onsubmit={() => {
					syncVerifyFormHiddenFields();
				}}
			>
				<input type="hidden" name="next" value={next} />
				<input
					type="hidden"
					name="email"
					value={codeStepEmail}
					bind:this={verifyEmailHiddenInput}
				/>
				<input type="hidden" name="sentAt" value={sentAt} />
				<input type="hidden" name="referralStudio" value={referralInput} />

				<label class="block text-sm font-medium text-slate-700" for="otp-digit-0"
					>6-digit code</label
				>
				<div class="flex items-center gap-2" role="group" aria-label="6-digit verification code">
					{#each otpDigits as digit, index (index)}
						<input
							id={`otp-digit-${index}`}
							type="text"
							inputmode="numeric"
							autocomplete={index === 0 ? 'one-time-code' : 'off'}
							maxlength="1"
							value={digit}
							oninput={(event) => handleOtpInput(index, event)}
							onkeydown={(event) => handleOtpKeydown(index, event)}
							onpaste={(event) => handleOtpPaste(index, event)}
							bind:this={otpInputs[index]}
							class="h-12 w-10 rounded-md border border-slate-300 text-center text-lg font-semibold text-slate-900 focus:border-brand-green focus:ring-2 focus:ring-brand-green/30 focus:outline-none"
						/>
					{/each}
				</div>
				<input type="hidden" name="token" value={otpCode} bind:this={verifyTokenHiddenInput} />
				<button
					type="submit"
					class="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
				>
					Verify code and sign in
				</button>
			</form>

			<form method="POST" action="?/resend" class="pt-2">
				<input type="hidden" name="next" value={next} />
				<input type="hidden" name="email" value={codeStepEmail} />
				<input type="hidden" name="referralStudio" value={referralInput} />
				<button
					type="submit"
					disabled={!canResend}
					class="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
				>
					Resend email
				</button>
				{#if resendSecondsLeft > 0}
					<p class="mt-2 text-sm text-slate-600">
						You can resend in {resendSecondsLeft}s.
					</p>
				{/if}
			</form>
		</section>
	{/if}
</div>
