<script lang="ts">
	import { browser } from '$app/environment';
	import melodyIcon from '$lib/assets/melody_icon.png';
	import Button from '$lib/components/ui/Button.svelte';
	import type { ActionData, PageData } from './$types';

	interface Props {
		data: PageData;
		form?: ActionData;
	}

	let { data, form }: Props = $props();
	let displayName = $state('');
	let studioName = $state('');
	let referralLinkCopied = $state(false);
	let referralLinkCopyTimer: ReturnType<typeof setTimeout> | null = null;

	const referralLink = $derived(
		data.teacherStudioName
			? `${data.origin ?? 'https://sharpestnote.com'}/teachers/join?ref=${encodeURIComponent(data.teacherStudioName)}`
			: null
	);

	function copyReferralLink(): void {
		if (!referralLink || !browser) return;
		void navigator.clipboard.writeText(referralLink).then(() => {
			referralLinkCopied = true;
			if (referralLinkCopyTimer) clearTimeout(referralLinkCopyTimer);
			referralLinkCopyTimer = setTimeout(() => {
				referralLinkCopied = false;
			}, 2000);
		});
	}
	let profileSummaryDisplayName = $state('');
	let profileSummaryStudioName = $state('');
	let showEditPanel = $state(false);
	let hasInitializedEditPanel = $state(false);

	const isOwner = $derived(Boolean(data.isOwner));
	const errorMessage = $derived(form?.errorMessage ?? '');
	const successMessage = $derived(form?.successMessage ?? '');
	const hasProfileSelections = $derived(
		Boolean(profileSummaryDisplayName.trim()) && Boolean(profileSummaryStudioName.trim())
	);

	type StudioStatus = 'idle' | 'checking' | 'ok' | 'error';

	let studioStatus = $state<StudioStatus>('idle');
	let studioFeedback = $state('');
	let canSubmit = $state(true);
	let lastCheckedValue = $state('');
	let checkTimer: ReturnType<typeof setTimeout> | null = null;
	let activeController: AbortController | null = null;

	$effect(() => {
		displayName = form?.displayName ?? data.teacherDisplayName ?? '';
		studioName = form?.studioName ?? data.teacherStudioName ?? '';

		if (form?.successMessage) {
			profileSummaryDisplayName = form?.displayName ?? '';
			profileSummaryStudioName = form?.studioName ?? '';
			return;
		}

		profileSummaryDisplayName = data.teacherDisplayName ?? '';
		profileSummaryStudioName = data.teacherStudioName ?? '';
	});

	$effect(() => {
		if (hasInitializedEditPanel) return;
		showEditPanel = !hasProfileSelections || Boolean(form?.errorMessage);
		hasInitializedEditPanel = true;
	});

	$effect(() => {
		if (form?.errorMessage) {
			showEditPanel = true;
		}

		if (form?.successMessage) {
			showEditPanel = false;
		}
	});

	function validateStudioNameFormat(value: string): string | null {
		if (!value) return null;
		if (value.length > 30) return 'Must be 30 characters or less.';
		if (!/^[A-Za-z0-9_-]+$/.test(value)) {
			return 'Use only letters, numbers, hyphens (-), and underscores (_).';
		}
		return null;
	}

	async function checkStudioNameUniqueness(value: string): Promise<void> {
		if (!browser) return;
		if (isOwner) {
			studioStatus = 'ok';
			studioFeedback = 'Owner studio name is fixed to TheSharpestNote.';
			canSubmit = true;
			return;
		}

		const formatError = validateStudioNameFormat(value);
		if (formatError) {
			studioStatus = 'error';
			studioFeedback = formatError;
			canSubmit = false;
			return;
		}

		if (!value) {
			studioStatus = 'idle';
			studioFeedback = 'Studio name is optional, but required for recommendation credits.';
			canSubmit = true;
			return;
		}

		if (value === lastCheckedValue && studioStatus === 'ok') {
			canSubmit = true;
			return;
		}

		activeController?.abort();
		activeController = new AbortController();
		studioStatus = 'checking';
		studioFeedback = 'Checking availability...';
		canSubmit = false;

		try {
			const response = await fetch(
				`/teachers/profile/studio-name-check?value=${encodeURIComponent(value)}`,
				{
					signal: activeController.signal
				}
			);
			const payload = (await response.json()) as {
				ok: boolean;
				valid: boolean;
				available: boolean;
				message: string;
			};

			if (!response.ok || !payload.ok) {
				studioStatus = 'error';
				studioFeedback = payload.message || 'Could not validate studio name right now.';
				canSubmit = false;
				return;
			}

			if (!payload.valid || !payload.available) {
				studioStatus = 'error';
				studioFeedback = payload.message;
				canSubmit = false;
				return;
			}

			studioStatus = 'ok';
			studioFeedback = payload.message;
			canSubmit = true;
			lastCheckedValue = value;
		} catch (err) {
			if ((err as Error)?.name === 'AbortError') return;
			studioStatus = 'error';
			studioFeedback = 'Could not validate studio name right now.';
			canSubmit = false;
		}
	}

	function onStudioNameInput(event: Event): void {
		if (isOwner) return;
		const target = event.currentTarget as HTMLInputElement;
		const nextValue = target.value.trim();

		if (checkTimer) clearTimeout(checkTimer);

		const formatError = validateStudioNameFormat(nextValue);
		if (formatError) {
			studioStatus = 'error';
			studioFeedback = formatError;
			canSubmit = false;
			return;
		}

		studioStatus = nextValue ? 'checking' : 'idle';
		studioFeedback = nextValue
			? 'Checking availability...'
			: 'Studio name is optional, but required for recommendation credits.';
		canSubmit = !nextValue;

		checkTimer = setTimeout(() => {
			void checkStudioNameUniqueness(nextValue);
		}, 350);
	}

	$effect(() => {
		if (!isOwner) return;
		studioStatus = 'ok';
		studioFeedback = 'Owner studio name is fixed to TheSharpestNote.';
		canSubmit = true;
	});
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

		<div class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
			<p class="text-sm font-semibold tracking-wide text-emerald-800 uppercase">Composer access</p>
			<p class="mt-2 text-lg font-semibold text-slate-900">{data.composerAccessPlan.name}</p>
			<p class="mt-2 text-sm text-slate-700">{data.composerAccessPlan.headline}</p>
			<p class="mt-1 text-sm text-slate-600">{data.composerAccessPlan.details}</p>
			<div class="mt-4 rounded-xl border border-emerald-300 bg-white/75 p-4">
				<p class="text-xs font-semibold tracking-wide text-emerald-900 uppercase">
					Current balance
				</p>
				{#if data.composerCredits === null}
					<p class="mt-2 text-3xl leading-none font-bold text-emerald-800">Unlimited</p>
				{:else}
					<p class="mt-2 text-3xl leading-none font-bold text-emerald-800">
						{data.composerCredits}
					</p>
					<p class="mt-1 text-sm font-medium text-emerald-900">composer credits</p>
				{/if}
			</div>
		</div>

		<div class="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between gap-3">
				<h2 class="text-xl font-semibold text-slate-900">Profile selections</h2>
				{#if hasProfileSelections && !showEditPanel}
					<Button
						type="button"
						onclick={() => {
							showEditPanel = true;
						}}
						variant="secondary"
					>
						Edit
					</Button>
				{/if}
			</div>

			{#if hasProfileSelections && !showEditPanel}
				<div class="space-y-4">
					<div>
						<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Display name</p>
						<p class="mt-1 text-sm text-slate-900">{profileSummaryDisplayName}</p>
					</div>
					<div>
						<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Studio code</p>
						<p class="mt-1 text-sm text-slate-900">{profileSummaryStudioName}</p>
					</div>
				</div>
			{:else}
				<form method="POST" action="?/updateProfile" class="space-y-4">
					<div>
						<label for="studioName" class="block text-sm font-medium text-slate-700"
							>Studio code</label
						>
						<input
							id="studioName"
							name="studioName"
							type="text"
							maxlength="30"
							oninput={onStudioNameInput}
							disabled={isOwner}
							bind:value={studioName}
							class="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-green focus:ring-2 focus:ring-brand-green/30 focus:outline-none"
							class:cursor-not-allowed={isOwner}
							class:opacity-70={isOwner}
							placeholder="For example HarmonyStudio"
						/>
						<p class="mt-2 text-sm text-slate-500">
							Used in recommendation links and custom piece sharing. Optional for normal use, but
							required to earn recommendation credits. Up to 30 characters: letters, numbers,
							hyphens (-), underscores (_).
						</p>
						{#if studioFeedback}
							<p
								class="mt-2 text-sm"
								class:text-emerald-700={studioStatus === 'ok'}
								class:text-amber-700={studioStatus === 'checking' || studioStatus === 'idle'}
								class:text-rose-700={studioStatus === 'error'}
							>
								{studioFeedback}
							</p>
						{/if}
					</div>

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

					<div class="flex flex-wrap gap-2">
						<button
							type="submit"
							disabled={!canSubmit}
							class="inline-flex items-center rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
							class:cursor-not-allowed={!canSubmit}
							class:opacity-60={!canSubmit}
						>
							Save profile
						</button>

						{#if hasProfileSelections}
							<button
								type="button"
								onclick={() => {
									showEditPanel = false;
								}}
								class="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
							>
								Cancel
							</button>
						{/if}
					</div>
				</form>
			{/if}
		</div>

		<section class="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="text-xl font-semibold text-slate-900">Recommend a teacher</h2>
			<p class="mt-2 text-sm text-slate-600">
				Share your personal link with another music teacher. When they publish their first piece,
				you'll both receive 3 bonus credits.
			</p>

			{#if referralLink}
				<div class="mt-4 space-y-3">
					<div
						class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
					>
						<span class="min-w-0 flex-1 truncate font-mono text-sm text-slate-700"
							>{referralLink}</span
						>
						<button
							type="button"
							onclick={copyReferralLink}
							class="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
						>
							{referralLinkCopied ? 'Copied!' : 'Copy'}
						</button>
					</div>
				</div>
			{:else}
				<p class="mt-3 text-sm text-amber-700">
					<a href="#studioName" class="underline underline-offset-2">Set your studio code</a> to unlock
					your personal recommendation link.
				</p>
			{/if}
		</section>

		<section class="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="text-xl font-semibold text-slate-900">Teacher tools</h2>
			<p class="mt-2 text-sm text-slate-600">Open your composing workspace from here.</p>

			<div class="tool-grid">
				<a class="tool-card" href="/teachers/composer" aria-label="Open My pieces page">
					<div class="tool-card__content">
						<img src={melodyIcon} alt="" class="tool-card__icon" />
						<span class="tool-card__title">My pieces</span>
						<span class="tool-card__description">Browse your saved and shared pieces</span>
					</div>
				</a>
			</div>
		</section>
	</div>
</div>

<style>
	.tool-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.tool-card {
		position: relative;
		display: block;
		border-radius: 0.75rem;
		background: white;
		border: 1px solid rgb(226 232 240);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
		overflow: hidden;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			background-color 150ms ease;
	}

	.tool-card::before {
		content: '';
		display: block;
		padding-bottom: 100%;
	}

	.tool-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
		background: rgb(248 250 252);
	}

	.tool-card__content {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.75rem;
		text-align: center;
	}

	.tool-card__icon {
		height: 4rem;
		width: 4rem;
		object-fit: contain;
	}

	.tool-card__title {
		margin-top: 0.75rem;
		font-weight: 600;
		color: rgb(15 23 42);
	}

	.tool-card__description {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		color: rgb(71 85 105);
	}

	@media (min-width: 640px) {
		.tool-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 1rem;
		}

		.tool-card__icon {
			height: 5rem;
			width: 5rem;
		}
	}
</style>
