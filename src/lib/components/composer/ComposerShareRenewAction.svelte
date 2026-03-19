<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		shareCreditCost: number;
		isPreparingShareUrl: boolean;
		isRenewingShareUrl: boolean;
		isShareBlocked: boolean;
		onRenewShareUrl: () => Promise<void> | void;
	}

	let {
		shareCreditCost,
		isPreparingShareUrl,
		isRenewingShareUrl,
		isShareBlocked,
		onRenewShareUrl
	}: Props = $props();

	async function handleRenewShareUrl() {
		if (isPreparingShareUrl || isRenewingShareUrl || isShareBlocked) return;
		await onRenewShareUrl();
	}
</script>

<div class="mt-3 flex flex-wrap items-center gap-2">
	<Button
		type="button"
		size="medium"
		color="secondary"
		onclick={handleRenewShareUrl}
		disabled={isPreparingShareUrl || isRenewingShareUrl || isShareBlocked}
	>
		{isRenewingShareUrl ? 'Renewing link...' : `Renew link (${shareCreditCost} credit)`}
	</Button>
</div>
