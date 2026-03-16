<script lang="ts">
	import OpenableButton from './OpenableButton.svelte';

	interface TeacherUser {
		email?: string | null;
		credits?: number | null;
		role?: string | null;
	}

	interface Props {
		user: TeacherUser | null;
	}

	let { user }: Props = $props();
	const teacherEmail = $derived(user?.email ?? '');
	const hasUnlimitedComposerCredits = $derived(
		user?.role === 'institution_teacher' || user?.role === 'admin' || user?.role === 'owner'
	);
	const teacherCredits = $derived.by(() => {
		if (hasUnlimitedComposerCredits) return 'Unlimited credits';
		const credits =
			typeof user?.credits === 'number' && Number.isFinite(user.credits)
				? Math.max(0, Math.trunc(user.credits))
				: 0;
		return `${credits} credits`;
	});
	let isOpen = $state(false);
	let menuRoot = $state<HTMLElement | null>(null);

	function toggleMenu() {
		isOpen = !isOpen;
	}

	function closeMenu() {
		isOpen = false;
	}

	function handleWindowClick(event: MouseEvent) {
		if (!isOpen || !menuRoot) return;
		const target = event.target;
		if (!(target instanceof Node)) return;
		if (!menuRoot.contains(target)) {
			closeMenu();
		}
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeMenu();
		}
	}
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<div class="teacher-nav-shell">
	{#if user}
		<div class="teacher-nav-dropdown" bind:this={menuRoot}>
			<OpenableButton
				type="button"
				opened={isOpen}
				ariaControls="teacher-tools-menu"
				ariaHaspopup="menu"
				className="teacher-nav-trigger"
				onclick={toggleMenu}
			>
				Tools
			</OpenableButton>

			{#if isOpen}
				<div
					id="teacher-tools-menu"
					class="teacher-nav-panel"
					role="menu"
					aria-label="Teacher navigation"
				>
					{#if teacherEmail}
						<p class="teacher-email">{teacherEmail}</p>
					{/if}
					<p class="teacher-credits">{teacherCredits}</p>
					<a href="/teachers/pieces" role="menuitem" onclick={closeMenu}>My pieces</a>
					<a href="/teachers/composer" role="menuitem" onclick={closeMenu}>Composer</a>
					<a href="/teachers/profile" role="menuitem" onclick={closeMenu}>Profile</a>
					<a href="/teachers" role="menuitem" onclick={closeMenu}>Teacher tools</a>
					<form method="POST" action="/teachers/profile?/signout" class="teacher-signout-form">
						<button type="submit" role="menuitem" class="teacher-signout-button"> Sign out </button>
					</form>
				</div>
			{/if}
		</div>
	{:else}
		<a href="/teachers/login" class="teacher-login-button">Log in</a>
	{/if}
</div>

<style>
	.teacher-nav-shell {
		position: fixed;
		top: 0.8rem;
		right: 1rem;
		z-index: 150;
	}

	.teacher-login-button,
	:global(.teacher-nav-trigger) {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.45rem 0.75rem;
		border: 1px solid color-mix(in srgb, var(--color-dark-blue) 28%, transparent);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-off-white) 85%, white);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1;
		backdrop-filter: blur(4px);
	}

	.teacher-nav-dropdown {
		position: relative;
	}

	.teacher-nav-panel {
		position: absolute;
		top: calc(100% + 0.45rem);
		right: 0;
		min-width: 12.5rem;
		padding: 0.5rem;
		border: 1px solid color-mix(in srgb, var(--color-dark-blue) 20%, transparent);
		border-radius: 0.7rem;
		background: color-mix(in srgb, var(--color-off-white) 92%, white);
		box-shadow: 0 10px 24px color-mix(in srgb, var(--color-dark-blue) 16%, transparent);
	}

	.teacher-email {
		margin: 0.15rem 0.35rem 0.45rem;
		font-size: 0.75rem;
		line-height: 1.3;
		color: color-mix(in srgb, var(--color-dark-blue) 75%, white);
	}

	.teacher-credits {
		margin: 0 0.35rem 0.45rem;
		padding: 0.25rem 0.45rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1.2;
		color: #065f46;
		background: #ecfdf5;
	}

	.teacher-nav-panel a {
		display: block;
		border-radius: 0.45rem;
		padding: 0.45rem 0.55rem;
		text-decoration: none;
		font-weight: 500;
	}

	.teacher-signout-form {
		margin: 0;
	}

	.teacher-signout-button {
		display: block;
		width: 100%;
		border: 0;
		border-radius: 0.45rem;
		padding: 0.45rem 0.55rem;
		background: transparent;
		text-align: left;
		font: inherit;
		font-weight: 500;
		color: inherit;
	}

	.teacher-nav-panel a:hover,
	.teacher-signout-button:hover {
		background: color-mix(in srgb, var(--color-yellow) 38%, white);
	}

	@media (max-width: 640px) {
		.teacher-nav-shell {
			top: 0.6rem;
			right: 0.65rem;
		}

		.teacher-login-button,
		:global(.teacher-nav-trigger) {
			font-size: 0.82rem;
			padding: 0.4rem 0.65rem;
		}
	}
</style>
