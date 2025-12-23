<script lang="ts" generics="T extends string">
	interface Props {
		options: { value: T; label: string }[];
		selected: T;
		onSelect: (value: T) => void;
		ariaLabel?: string;
	}

	let { options, selected, onSelect, ariaLabel }: Props = $props();

	let buttonRefs: (HTMLButtonElement | null)[] = [];
	let indicatorStyle = $state('');

	const selectedIndex = $derived(options.findIndex((opt) => opt.value === selected));

	$effect(() => {
		if (selectedIndex >= 0 && buttonRefs[selectedIndex]) {
			const selectedButton = buttonRefs[selectedIndex];
			const rect = selectedButton.getBoundingClientRect();
			const containerRect = selectedButton.parentElement?.getBoundingClientRect();

			if (containerRect) {
				const left = rect.left - containerRect.left;
				const width = rect.width;
				indicatorStyle = `width: ${width}px; transform: translateX(${left}px)`;
			}
		}
	});

	function handleKeydown(event: KeyboardEvent, index: number) {
		let newIndex = index;

		switch (event.key) {
			case 'ArrowLeft':
			case 'ArrowUp':
				event.preventDefault();
				newIndex = index > 0 ? index - 1 : options.length - 1;
				break;
			case 'ArrowRight':
			case 'ArrowDown':
				event.preventDefault();
				newIndex = index < options.length - 1 ? index + 1 : 0;
				break;
			case 'Home':
				event.preventDefault();
				newIndex = 0;
				break;
			case 'End':
				event.preventDefault();
				newIndex = options.length - 1;
				break;
			default:
				return;
		}

		if (newIndex !== index) {
			onSelect(options[newIndex].value);
			buttonRefs[newIndex]?.focus();
		}
	}
</script>

<div class="pill-group" role="tablist" aria-label={ariaLabel || 'Options selector'}>
	{#each options as option, index}
		<button
			bind:this={buttonRefs[index]}
			role="tab"
			aria-selected={selected === option.value}
			tabindex={selected === option.value ? 0 : -1}
			class="pill-button {index === 0 ? 'pill-button-first' : ''} {index === options.length - 1
				? 'pill-button-last'
				: ''} {selected === option.value ? 'pill-active' : ''}"
			onclick={() => onSelect(option.value)}
			onkeydown={(e) => handleKeydown(e, index)}
		>
			{option.label}
		</button>
	{/each}
	<div class="pill-indicator" style={indicatorStyle}></div>
</div>

<style>
	.pill-group {
		position: relative;
		display: inline-flex;
		background-color: rgb(241 245 249);
		border: 1px solid rgb(226 232 240);
		border-radius: 0.75rem;
		padding: 0.25rem;
		overflow: hidden;
	}

	.pill-button {
		position: relative;
		flex: 1;
		padding: 0.625rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgb(71 85 105);
		background: transparent;
		border: none;
		margin: 0;
		text-align: center;
		transition: color 200ms ease-in-out;
		cursor: pointer;
		z-index: 1;
		white-space: nowrap;
		outline: none;
	}

	.pill-button:focus-visible {
		outline: 2px solid var(--color-dark-blue);
		outline-offset: 2px;
	}

	.pill-button-first {
		border-top-left-radius: 0.5rem;
		border-bottom-left-radius: 0.5rem;
	}

	.pill-button-last {
		border-top-right-radius: 0.5rem;
		border-bottom-right-radius: 0.5rem;
	}

	.pill-button:hover {
		color: var(--color-dark-blue);
	}

	.pill-button.pill-active {
		color: white;
	}

	.pill-indicator {
		position: absolute;
		top: 0.25rem;
		bottom: 0.25rem;
		left: 0;
		background: linear-gradient(135deg, var(--color-dark-blue) 0%, #3d4f6b 100%);
		border-radius: 0.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 0;
	}
</style>
