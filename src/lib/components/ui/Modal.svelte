<script lang="ts">
	interface Props {
		isOpen: boolean;
		onClose: () => void;
		title?: string;
		icon?: string;
		children?: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
		maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
	}

	let {
		isOpen = false,
		onClose,
		title,
		icon,
		children,
		actions,
		maxWidth = 'lg'
	}: Props = $props();

	let dialogElement: HTMLDivElement | undefined = $state();
	let previousActiveElement: HTMLElement | null = null;

	// Map maxWidth to Tailwind classes
	const maxWidthClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl'
	};

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			e.preventDefault();
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	// Focus trap: keep focus within modal
	function handleFocusTrap(e: FocusEvent) {
		if (!dialogElement || !isOpen) return;

		const focusableElements = dialogElement.querySelectorAll(
			'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
		);

		if (focusableElements.length === 0) return;

		const firstElement = focusableElements[0] as HTMLElement;

		if (e.relatedTarget === null || !dialogElement.contains(e.relatedTarget as Node)) {
			firstElement.focus();
		}
	}

	// Focus management
	$effect(() => {
		if (isOpen) {
			// Store currently focused element
			previousActiveElement = document.activeElement as HTMLElement;

			// Focus the first focusable element in the modal
			requestAnimationFrame(() => {
				if (dialogElement) {
					const focusableElements = dialogElement.querySelectorAll(
						'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
					);
					const firstFocusable = focusableElements[0] as HTMLElement;
					if (firstFocusable) {
						firstFocusable.focus();
					}
				}
			});

			// Prevent body scroll
			document.body.style.overflow = 'hidden';
		} else {
			// Restore focus and scroll
			document.body.style.overflow = '';
			if (previousActiveElement) {
				previousActiveElement.focus();
			}
		}

		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 overflow-y-auto bg-white/60 px-4 py-4 backdrop-blur-sm transition-opacity sm:px-6 sm:py-8"
		onclick={handleBackdropClick}
		role="presentation"
	>
		<div class="flex min-h-full items-start justify-center sm:items-center">
			<!-- Modal Dialog -->
			<div
				bind:this={dialogElement}
				role="dialog"
				aria-modal="true"
				aria-labelledby={title ? 'modal-title' : undefined}
				class="{maxWidthClasses[
					maxWidth
				]} relative my-auto max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-2xl bg-off-white p-6 shadow-2xl transition-transform sm:max-h-[calc(100vh-4rem)]"
				onfocusout={handleFocusTrap}
			>
				<!-- Close Button -->
				<button
					onclick={onClose}
					aria-label="Close modal"
					class="absolute top-4 right-4 border-none text-slate-400 transition-colors hover:text-slate-600"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
				{#if icon}
					<div class="mb-4 flex justify-center">
						<img src={icon} alt="" class="h-12 w-12" />
					</div>
				{/if}

				{#if title}
					<h2 id="modal-title" class="mb-4 text-center text-xl font-bold text-slate-900">
						{title}
					</h2>
				{/if}

				{#if children}
					<div class="modal-content">
						{@render children()}
					</div>
				{/if}

				{#if actions}
					<div class="mt-6 flex justify-end gap-3">
						{@render actions()}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Smooth transitions */
	:global(body.modal-open) {
		overflow: hidden;
	}
</style>
