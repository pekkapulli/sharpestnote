<script lang="ts">
	import AudioTrackPlayer from './AudioTrackPlayer.svelte';
	import { fileStore } from '$lib/config/units';
	import type { Speed, UnitMaterial } from '$lib/config/types';

	interface Props {
		unit: UnitMaterial;
	}

	const { unit }: Props = $props();

	const trackItems = $derived(
		unit.pieces.flatMap((piece) => {
			if (!piece.tracks) return [];

			const fast = piece.tracks.fast;
			const [fallbackSpeed, fallbackTrack] =
				(Object.entries(piece.tracks) as [Speed, { tempo: number; audioUrl: string }][])[0] ?? [];

			const chosenTrack = fast ?? fallbackTrack;
			if (!chosenTrack) return [];

			const chosenSpeed: Speed = fast ? 'fast' : fallbackSpeed;

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
</script>

<div class="track-list" aria-label="Unit preview tracks">
	{#each trackItems as track}
		<AudioTrackPlayer id={track.id} label={track.pieceLabel} url={track.url} />
	{/each}
</div>

<style>
	.track-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 0rem;
	}
</style>
