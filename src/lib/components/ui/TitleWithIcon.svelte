<script lang="ts">
	interface Props {
		title: string;
		iconUrl?: string;
	}

	let { title, iconUrl }: Props = $props();
</script>

<h1 class="mt-1 flex items-center justify-center gap-2">
	{#if iconUrl}
		<img src={iconUrl} alt="" class="mb-[0.3rem] h-12 w-12" />
	{/if}
	{title}
</h1>
