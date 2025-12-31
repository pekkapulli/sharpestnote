<script lang="ts">
	import Card from './Card.svelte';

	interface CardItem {
		icon: string;
		text: string;
	}

	interface Props {
		items: CardItem[];
	}

	const { items }: Props = $props();
</script>

<div class="card-grid">
	{#each items as item}
		<Card icon={item.icon} text={item.text} />
	{/each}
</div>

<style>
	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 300px));
		gap: 1.25rem;
		margin: 1.5rem 0 2rem 0;
		padding: 0 10vw;
		width: 100vw;
		position: relative;
		left: 50%;
		transform: translateX(-50%);
		justify-content: center;
	}

	@media (min-width: 768px) {
		.card-grid {
			grid-template-columns: repeat(auto-fit, minmax(200px, 300px));
		}
	}

	@media (max-width: 640px) {
		.card-grid {
			grid-template-columns: 1fr;
			margin: 1rem -1rem 2rem -1rem;
			padding: 0 1rem;
		}
	}
</style>
