<script lang="ts">
	interface Props {
		amplitude: number; // 0.0 to 1.0
		width?: number;
		height?: number;
		color?: string;
	}

	const { amplitude = 0, width = 200, height = 20, color = '#22c55e' }: Props = $props();

	const clampedAmplitude = $derived(Math.max(0, Math.min(1, amplitude)));
	const fillWidth = $derived(clampedAmplitude * 100);
</script>

<div
	class="amplitude-bar"
	aria-hidden="true"
	style="width: {width}px; height: {height}px; background: #e5e7eb; border-radius: 4px; overflow: hidden;"
>
	<div
		class="amplitude-fill"
		style="width: {fillWidth}%; height: 100%; background: {color}; transition: width 0.05s ease-out;"
	></div>
</div>

<style>
	.amplitude-bar {
		position: relative;
	}
	.amplitude-fill {
		border-radius: 4px;
	}
</style>
