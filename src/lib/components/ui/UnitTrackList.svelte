<script lang="ts">
	import { onDestroy } from 'svelte';
	import { requestPlay, clearCurrent } from '$lib/audio/globalAudioController';
	import { fileStore } from '$lib/config/units';
	import type { Speed, UnitMaterial } from '$lib/config/types';

	interface Props {
		unit: UnitMaterial;
	}

	const { unit }: Props = $props();

	type TrackItem = {
		id: string;
		pieceLabel: string;
		speed: Speed;
		tempo: number;
		url: string;
	};

	const trackItems = $derived(
		unit.pieces.flatMap((piece) => {
			if (!piece.tracks) return [];

			const medium = piece.tracks.medium;
			const [fallbackSpeed, fallbackTrack] =
				(Object.entries(piece.tracks) as [Speed, { tempo: number; audioUrl: string }][])[0] ?? [];

			const chosenTrack = medium ?? fallbackTrack;
			if (!chosenTrack) return [];

			const chosenSpeed: Speed = medium ? 'medium' : fallbackSpeed;

			return [
				{
					id: `${piece.code}-${chosenSpeed}`,
					pieceLabel: piece.label,
					speed: chosenSpeed,
					tempo: chosenTrack.tempo,
					url: `${fileStore}/${unit.code}/${chosenTrack.audioUrl}`
				}
			];
		})
	);

	let audioMap: Record<string, HTMLAudioElement | null> = $state({});
	let isPlaying: Record<string, boolean> = $state({});
	let isLoading: Record<string, boolean> = $state({});

	function setupAudio(id: string, url: string) {
		let audio = audioMap[id];
		if (!audio) {
			audio = new Audio();
			audio.preload = 'none';
			audio.crossOrigin = 'anonymous';
			audio.src = url;

			audio.addEventListener('ended', () => {
				isPlaying = { ...isPlaying, [id]: false };
				clearCurrent(audio!);
			});

			audio.addEventListener('pause', () => {
				isPlaying = { ...isPlaying, [id]: false };
				if (!audio) return;
				if (audio.ended || audio.currentTime === 0) {
					clearCurrent(audio);
				}
			});

			audio.addEventListener('play', () => {
				isPlaying = { ...isPlaying, [id]: true };
			});

			audioMap = { ...audioMap, [id]: audio };
		}

		return audio;
	}

	async function toggleTrack(item: TrackItem) {
		const audio = setupAudio(item.id, item.url);

		if (isPlaying[item.id]) {
			audio?.pause();
			return;
		}

		if (audio) {
			requestPlay(audio);
			isLoading = { ...isLoading, [item.id]: true };
			try {
				await audio.play();
			} finally {
				isLoading = { ...isLoading, [item.id]: false };
			}
		}
	}

	onDestroy(() => {
		Object.values(audioMap).forEach((audio) => audio?.pause());
	});
</script>

<div class="track-list" aria-label="Unit preview tracks">
	{#each trackItems as track}
		<button class="track-row" type="button" onclick={() => toggleTrack(track)}>
			<span class="track-row__icon" aria-hidden="true">
				{#if isLoading[track.id]}
					<span class="track-row__spinner"></span>
				{:else if isPlaying[track.id]}
					&#10074;&#10074;
				{:else}
					&#9658;
				{/if}
			</span>
			<div class="track-row__text">
				<span class="track-row__label">{track.pieceLabel}</span>
			</div>
		</button>
	{/each}
</div>

<style>
	.track-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 0rem;
	}

	.track-row {
		display: grid;
		grid-template-columns: auto 1fr auto;
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
	}

	.track-row:hover {
		background: white;
		transform: translateY(-1px);
		border-color: rgb(203 213 225);
	}

	.track-row__icon {
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

	.track-row__text {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.track-row__label {
		font-size: 0.95rem;
		font-weight: 600;
		color: rgb(30 41 59);
	}

	.track-row__spinner {
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
