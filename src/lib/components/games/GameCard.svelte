<script lang="ts">
	interface Props {
		href: string;
		icon: string;
		title: string;
		description: string;
		badgeText?: string | null;
		ariaLabel?: string;
	}

	const {
		href,
		icon,
		title,
		description,
		badgeText = null,
		ariaLabel = `${title} - ${description}`
	}: Props = $props();
</script>

<a class="game-card" {href} aria-label={ariaLabel}>
	{#if badgeText}
		<span class="game-card__badge">{badgeText}</span>
	{/if}
	<div class="game-card__content">
		<img src={icon} alt="" class="game-card__icon" />
		<span class="game-card__title">{title}</span>
		<span class="game-card__description">{description}</span>
	</div>
</a>

<style>
	.game-card {
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

	.game-card::before {
		content: '';
		display: block;
		padding-bottom: 100%;
	}

	.game-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
		background: rgb(248 250 252);
	}

	.game-card__content {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.75rem;
		text-align: center;
	}

	.game-card__icon {
		height: 4rem;
		width: 4rem;
		object-fit: contain;
	}

	@media (min-width: 640px) {
		.game-card__icon {
			height: 5rem;
			width: 5rem;
		}
	}

	.game-card__title {
		margin-top: 0.75rem;
		font-weight: 600;
		color: rgb(15 23 42);
	}

	.game-card__description {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		color: rgb(71 85 105);
	}

	.game-card__badge {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: rgb(22 163 74);
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
		/* box-shadow: 0 4px 10px rgb(22 163 74 / 0.25); */
	}
</style>
