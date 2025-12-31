<script lang="ts">
	interface Props {
		label?: string;
	}

	const { label = 'Back' }: Props = $props();

	function goBack() {
		window.history.back();
	}
</script>

<button onclick={goBack} class="back-button">← {label}</button>

<style>
	.back-button {
		background-color: var(--color-dark-blue);
		color: var(--color-off-white);
		border: none;
		border-radius: 0.5rem;
		padding: 0.25rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s,
			background-color 0.2s;
		display: inline-block;
		text-decoration: none;
	}

	.back-button:hover {
		background-color: var(--color-dark-blue-highlight);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}
</style>
