<script lang="ts">
	const { title, children } = $props<{ title: string; children: () => unknown }>();
</script>

<section class="qa-card">
	<h2>{title}</h2>
	{@render children()}
</section>

<style>
	.qa-card {
		background: linear-gradient(135deg, #ffffff 0%, #fdfdf8 100%);
		border: 1px solid #e5e5e5;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
		border-radius: 16px;
		padding: 1.5rem 2rem;
		margin-bottom: 1.25rem;
	}

	h2 {
		font-size: 1.5rem;
		margin-top: 0;
		margin-bottom: 1rem;
		color: #333;
		border-bottom: 1px solid var(--color-light-gray);
	}
</style>
