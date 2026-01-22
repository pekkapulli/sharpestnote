<script lang="ts">
	import { T } from '@threlte/core';
	import { gameState } from './gameState.svelte';
	import { onMount } from 'svelte';

	let { lanes = 6, laneWidth = 0.5, sceneWidth = 3 } = $props();

	let currentState = $state($gameState);
	let unsubscribe: any;

	// Game loop - update obstacle positions
	onMount(() => {
		// Subscribe to gameState changes
		unsubscribe = gameState.subscribe((newState) => {
			currentState = newState;
		});

		const updateInterval = setInterval(() => {
			if (!currentState.isPlaying) return;

			currentState.obstacles.forEach((obstacle) => {
				// Move obstacle toward the hit zone (increasing Z position toward camera)
				const newPosition = obstacle.position + currentState.speed;

				if (newPosition > 5) {
					// Obstacle passed the hit zone without being hit
					if (!obstacle.hit && !obstacle.missed) {
						gameState.missNote();
						gameState.updateObstacle(obstacle.id, { missed: true });
					}
					gameState.removeObstacle(obstacle.id);
				} else {
					gameState.updateObstacle(obstacle.id, { position: newPosition });
				}
			});
		}, 1000 / 60); // 60 FPS

		return () => {
			clearInterval(updateInterval);
			if (unsubscribe) unsubscribe();
		};
	});

	function getLanePosition(lane: number): number {
		return -sceneWidth / 2 + (lane + 0.5) * laneWidth;
	}
</script>

<T.Group>
	{#each currentState.obstacles as obstacle (obstacle.id)}
		{@const x = getLanePosition(obstacle.lane)}
		<T.Mesh position={[x, 1, obstacle.position]}>
			<!-- Obstacle box -->
			<T.BoxGeometry args={[laneWidth - 0.1, 0.4, 0.3]} />
			<T.MeshStandardMaterial
				color={obstacle.hit ? '#10b981' : obstacle.missed ? '#ef4444' : '#f59e0b'}
				emissive={obstacle.hit ? '#059669' : '#d97706'}
				emissiveIntensity={0.5}
			/>
		</T.Mesh>

		<!-- Glow effect for active obstacles -->
		{#if !obstacle.hit && !obstacle.missed}
			<T.Mesh position={[x, 1, obstacle.position]}>
				<T.BoxGeometry args={[laneWidth - 0.05, 0.5, 0.4]} />
				<T.MeshStandardMaterial
					color="#f59e0b"
					transparent={true}
					opacity={0.2}
					emissiveIntensity={0.3}
				/>
			</T.Mesh>
		{/if}
	{/each}
</T.Group>
