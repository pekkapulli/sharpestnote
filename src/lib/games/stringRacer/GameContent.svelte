<script lang="ts">
	import { T, useThrelte } from '@threlte/core';
	import StringLanes from './StringLanes.svelte';
	import ObstacleRenderer from './ObstacleRenderer.svelte';
	import HitZone from './HitZone.svelte';

	let { instrument = 'guitar', numLanes = 6 } = $props();

	// Get viewport size from Threlte context (only works inside Canvas)
	const { size } = useThrelte();

	// Calculate scene width based on viewport aspect ratio
	const SCENE_WIDTH = $derived.by(() => {
		const aspectRatio = $size.width / $size.height;
		// Reduced base width for narrower lanes, scales with aspect ratio
		return Math.max(8, Math.min(18, numLanes * 1.8 * (aspectRatio / 1.5)));
	});

	const LANE_WIDTH = $derived(SCENE_WIDTH / numLanes);
	const HIT_ZONE_Z = 0.5;
</script>

<!-- Camera positioned to see the lanes moving down the Z axis -->
<T.PerspectiveCamera
	makeDefault
	position={[0, 3, 8]}
	fov={50}
	oncreate={(ref) => ref.lookAt(0, 0, -25)}
></T.PerspectiveCamera>

<!-- Lighting -->
<T.AmbientLight intensity={0.8}></T.AmbientLight>
<T.DirectionalLight position={[10, 20, 10]} intensity={1} castShadow></T.DirectionalLight>
<T.PointLight position={[0, 5, 5]} intensity={0.6}></T.PointLight>

<!-- Game environment -->
<T.Group>
	<!-- Lane system -->
	<StringLanes lanes={numLanes} laneWidth={LANE_WIDTH} sceneWidth={SCENE_WIDTH} />

	<!-- Obstacles that scroll down -->
	<ObstacleRenderer lanes={numLanes} laneWidth={LANE_WIDTH} sceneWidth={SCENE_WIDTH} />

	<!-- Hit zone indicator -->
	<HitZone
		lanes={numLanes}
		laneWidth={LANE_WIDTH}
		sceneWidth={SCENE_WIDTH}
		hitZonePosition={HIT_ZONE_Z}
	/>
</T.Group>
