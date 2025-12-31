<script lang="ts">
	interface Props {
		icon: string;
		text: string;
	}

	const { icon, text }: Props = $props();
</script>

<div class="card">
	<div class="icon-container">
		<img src={icon} alt="" />
	</div>
	<p>{text}</p>
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 1.5rem;
		background: #f8f9fa;
		border-radius: 0.75rem;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		border: 1px solid #e0e0e0;
	}

	.card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.icon-container {
		width: 64px;
		height: 64px;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-container img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	p {
		margin: 0;
		color: #333;
		line-height: 1.4;
		font-weight: 600;
	}
</style>
