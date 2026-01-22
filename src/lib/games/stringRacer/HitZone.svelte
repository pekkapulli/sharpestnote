<script lang="ts">
	import { T } from '@threlte/core';
	import { gameState } from './gameState.svelte';
	import { onMount } from 'svelte';

	let { lanes = 6, laneWidth = 0.5, sceneWidth = 3, hitZonePosition = 0.5 } = $props();

	let currentState = $state($gameState);
	let unsubscribe: any;

	const HIT_WINDOW = 1.5; // distance tolerance for hitting obstacles

	// Check for collisions
	onMount(() => {
		// Subscribe to gameState changes
		unsubscribe = gameState.subscribe((newState) => {
			currentState = newState;
		});

		const checkInterval = setInterval(() => {
			if (!currentState.isPlaying) return;

			// Check for hits
			currentState.obstacles.forEach((obstacle) => {
				if (obstacle.hit || obstacle.missed) return;

				const distance = Math.abs(obstacle.position - hitZonePosition);

				// If detected note is in the same lane
				if (currentState.detectedLane === obstacle.lane && distance < HIT_WINDOW) {
					gameState.updateObstacle(obstacle.id, { hit: true });
					gameState.addScore(100);

					// Auto-remove after a delay
					setTimeout(() => {
						gameState.removeObstacle(obstacle.id);
					}, 200);
				}
			});
		}, 1000 / 60); // 60 FPS

		return () => {
			clearInterval(checkInterval);
			if (unsubscribe) unsubscribe();
		};
	});

	function getLanePosition(lane: number): number {
		return -sceneWidth / 2 + (lane + 0.5) * laneWidth;
	}
</script>

<!-- Hit zone visualization -->
<T.Group position={[0, 0, hitZonePosition]}>
	{#each Array.from({ length: lanes }, (_, i) => i) as lane}
		{@const x = getLanePosition(lane)}
		<!-- Perfect zone (tight) -->
		<T.Mesh position={[x, 0.8, 0]}>
			<T.BoxGeometry args={[laneWidth - 0.1, 0.6, 0.15]} />
			<T.MeshBasicMaterial color="#10b981" transparent={true} opacity={0.3} wireframe={true} />
		</T.Mesh>

		<!-- Good zone (wider) -->
		<T.Mesh position={[x, 0.8, 0]}>
			<T.BoxGeometry args={[laneWidth - 0.1, 0.6, 0.6]} />
			<T.MeshBasicMaterial color="#3b82f6" transparent={true} opacity={0.15} wireframe={true} />
		</T.Mesh>
	{/each}

	<!-- Player ball indicator - shows on currently detected lane -->
	{#if currentState.detectedLane !== null}
		{@const playerX = getLanePosition(currentState.detectedLane)}
		<T.Mesh position={[playerX, 0.8, 0]}>
			<T.SphereGeometry args={[0.3, 32, 32]} />
			<T.MeshStandardMaterial
				color="#fbbf24"
				emissive="#f59e0b"
				emissiveIntensity={1.2}
				metalness={0.8}
				roughness={0.2}
			/>
		</T.Mesh>

		<!-- Glow effect around the ball -->
		<T.Mesh position={[playerX, 0.8, 0]}>
			<T.SphereGeometry args={[0.4, 32, 32]} />
			<T.MeshBasicMaterial color="#fbbf24" transparent={true} opacity={0.3} />
		</T.Mesh>
	{/if}
</T.Group>
