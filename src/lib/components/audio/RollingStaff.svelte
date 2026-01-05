<script lang="ts">
	import type { Piece, Speed } from '$lib/config/units';
	import Staff from '$lib/components/music/Staff.svelte';
	import { getKeySignature } from '$lib/config/keys';

	interface Props {
		piece: Piece;
		progress: number; // 0-1, where 1 is 100% complete
		selectedSpeed: Speed;
	}

	let { piece, progress, selectedSpeed }: Props = $props();

	// Get the current track's tempo
	const currentTempo = $derived(piece.tracks[selectedSpeed].tempo);

	// Calculate transition duration based on tempo
	// One sixteenth note = (60 / BPM) / 4 seconds
	const transitionDuration = $derived((60 / currentTempo / 2).toFixed(3));

	// Calculate visible range based on notation start and end percentages
	const notationStart = $derived(piece.notationStartPercent ?? 0);
	const notationEnd = $derived(piece.notationEndPercent ?? 1);

	// Flatten all melodies into a single continuous sequence
	const flattenedMelody = $derived(piece.melody.flat());

	// Calculate progress within notation range
	const progressInNotation = $derived((progress - notationStart) / (notationEnd - notationStart));

	// Calculate minimum width based on total notes - more notes = wider staff
	// Use ~15px per sixteenth note as baseline (15 pixels per sixteenth from Staff component)
	const totalSixteenths = $derived(flattenedMelody.reduce((sum, item) => sum + item.length, 0));
	const minStaffWidth = $derived(Math.max(400, totalSixteenths * 15 + 200));

	// Get container width
	let containerWidth = $state(400);

	// Bind to the actual first and last note X positions from Staff
	let firstNoteX = $state(0);
	let lastNoteX = $state(10000);

	// Track when staff is ready to be shown (after positions are calculated)
	let isReady = $state(false);
	let shouldAnimate = $state(false);
	$effect(() => {
		// Once we have real values from Staff (not initial state values), mark as ready
		if (firstNoteX !== 0) {
			isReady = true;
			// Enable animation after a short delay to allow initial positioning
			setTimeout(() => {
				shouldAnimate = true;
			}, 50);
		}
	});

	// Calculate scroll offset to position current note at 40% of container width
	// Total playable width is from first note to last note start position
	const currentSixteenths = $derived(progressInNotation * totalSixteenths);
	const notePositionInStaff = $derived(
		firstNoteX + (currentSixteenths / totalSixteenths) * (lastNoteX - firstNoteX)
	);

	const targetPosition = $derived(containerWidth * 0.4);
	const scrollOffset = $derived(targetPosition - notePositionInStaff);

	const keySignature = $derived(getKeySignature(piece.key, piece.mode));
</script>

<div class="rolling-staff-container" bind:clientWidth={containerWidth}>
	<div class="border-light-blue overflow-hidden rounded-lg border bg-white">
		<div class="staff-viewport">
			<div class="fade-overlay"></div>
			<!-- Playhead line at 40% -->
			<div class="playhead" style="left: {containerWidth * 0.4}px;"></div>
			<div
				class="rolling-staff-wrapper"
				style="transform: translateX({scrollOffset}px); transition: {shouldAnimate
					? `transform ${transitionDuration}s linear, `
					: ''}opacity 0.3s ease-in; opacity: {isReady ? 1 : 0};"
			>
				<Staff
					sequence={flattenedMelody}
					{keySignature}
					mode={piece.mode}
					clef="treble"
					barLength={piece.barLength}
					minWidth={minStaffWidth}
					bind:firstNoteX
					bind:lastNoteX
					showAllBlack={true}
				/>
			</div>
		</div>
	</div>
</div>

<style>
	.rolling-staff-container {
		width: 100%;
		margin-bottom: 1rem;
	}

	.staff-viewport {
		position: relative;
		width: 100%;
		height: 180px;
		overflow: hidden;
	}

	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--color-brand-green);
		opacity: 0.3;
		z-index: 10;
		pointer-events: none;
	}

	.rolling-staff-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: flex-start;
		min-width: 100%;
		height: 180px;
		background: white;
		will-change: transform;
	}

	.fade-overlay {
		pointer-events: none;
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(
			to right,
			rgba(255, 255, 255, 1) 0%,
			rgba(255, 255, 255, 0) 40%,
			rgba(255, 255, 255, 0) 90%,
			rgba(255, 255, 255, 1) 100%
		);
		z-index: 5;
	}
</style>
