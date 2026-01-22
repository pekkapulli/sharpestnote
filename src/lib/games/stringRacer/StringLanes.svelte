<script lang="ts">
	import { T } from '@threlte/core';
	import { Vector3, BufferGeometry, Float32BufferAttribute } from 'three';

	let { lanes = 6, laneWidth = 0.5, sceneWidth = 3 } = $props();

	// Create string positions
	const lanes_array = $derived.by(() =>
		Array.from({ length: lanes }, (_, i) => {
			const x = -sceneWidth / 2 + (i + 0.5) * (sceneWidth / lanes);
			return {
				index: i,
				x,
				color: i % 2 === 0 ? '#60a5fa' : '#3b82f6'
			};
		})
	);

	// Helper to create line geometry for a string
	function createStringGeometry(x: number) {
		const geometry = new BufferGeometry();
		const points = [new Vector3(x, 0, 0), new Vector3(x, 0, -50)];
		const positions = new Float32BufferAttribute(
			points.flatMap((p) => [p.x, p.y, p.z]),
			3
		);
		geometry.setAttribute('position', positions);
		return geometry;
	}
</script>

<T.Group>
	{#each lanes_array as lane (lane.index)}
		<!-- String line -->
		<T.Line geometry={createStringGeometry(lane.x)}>
			<T.LineBasicMaterial color={lane.color} linewidth={2} />
		</T.Line>

		<!-- Grid markers for depth perception -->
		{#each Array.from({ length: 50 }, (_, i) => i) as gridLine}
			<T.Mesh position={[lane.x, 0, -gridLine * 1.0]}>
				<T.CircleGeometry args={[0.08, 8]} rotation={[Math.PI / 2, 0, 0]} />
				<T.MeshBasicMaterial
					color={gridLine % 5 === 0 ? '#60a5fa' : '#1e40af'}
					transparent={true}
					opacity={gridLine % 5 === 0 ? 0.6 : 0.3}
				/>
			</T.Mesh>
		{/each}
	{/each}
</T.Group>
