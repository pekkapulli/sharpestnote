<script lang="ts">
	import { onDestroy } from 'svelte';
	import { requestPlay, clearCurrent } from '$lib/audio/globalAudioController';

	interface Props {
		id: string;
		label: string;
		url: string;
		class?: string;
	}

	const { id, label, url, class: className }: Props = $props();

	let audio: HTMLAudioElement | null = $state(null);
	let isPlaying = $state(false);
	let isLoading = $state(false);

	function setupAudio() {
		if (!audio) {
			audio = new Audio();
			audio.preload = 'none';
			audio.crossOrigin = 'anonymous';
			audio.src = url;

			audio.addEventListener('ended', () => {
				isPlaying = false;
				clearCurrent(audio!);
			});

			audio.addEventListener('pause', () => {
				isPlaying = false;
				if (!audio) return;
				if (audio.ended || audio.currentTime === 0) {
					clearCurrent(audio);
				}
			});

			audio.addEventListener('play', () => {
				isPlaying = true;
			});
		}

		return audio;
	}

	async function toggle() {
		const audioElement = setupAudio();

		if (isPlaying) {
			audioElement?.pause();
			return;
		}

		if (audioElement) {
			requestPlay(audioElement);
			isLoading = true;
			try {
				await audioElement.play();
			} finally {
				isLoading = false;
			}
		}
	}

	onDestroy(() => {
		audio?.pause();
	});
</script>

<button class="track-player {className || ''}" type="button" onclick={toggle}>
	<span class="track-player__icon" aria-hidden="true">
		{#if isLoading}
			<span class="track-player__spinner"></span>
		{:else if isPlaying}
			&#10074;&#10074;
		{:else}
			&#9658;
		{/if}
	</span>
	<div class="track-player__text">
		<span class="track-player__label">{label}</span>
	</div>
</button>

<style>
	.track-player {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.5rem;
		border: 1px solid rgb(226 232 240);
		border-radius: 0.6rem;
		background: rgb(248 250 252);
		transition:
			border-color 120ms ease,
			transform 120ms ease,
			background 120ms ease;
		text-align: left;
		cursor: pointer;
		width: 100%;
	}

	.track-player:hover {
		background: white;
		transform: translateY(-1px);
		border-color: rgb(203 213 225);
	}

	.track-player__icon {
		width: 1.5rem;
		height: 1.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		background: rgb(16 185 129 / 0.1);
		color: rgb(16 122 98);
		font-weight: 700;
		font-size: 0.9rem;
	}

	.track-player__text {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.track-player__label {
		font-size: 0.95rem;
		font-weight: 600;
		color: rgb(30 41 59);
	}

	.track-player__spinner {
		width: 0.85rem;
		height: 0.85rem;
		border: 2px solid rgb(226 232 240);
		border-top-color: rgb(16 185 129);
		border-radius: 999px;
		animation: spin 600ms linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
