<script lang="ts">
	const { children } = $props();
</script>

<div class="game-grid">
	{@render children?.()}
</div>

<style>
	.game-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	@media (min-width: 640px) {
		.game-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 1rem;
		}
	}
</style>
