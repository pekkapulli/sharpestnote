<script lang="ts">
	import type { Piece, Speed } from '$lib/config/units';
	import type { InstrumentId } from '$lib/config/types';
	import Staff from '$lib/components/music/Staff.svelte';
	import { getKeySignature } from '$lib/config/keys';
	import { instrumentConfigs } from '$lib/config/instruments';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		piece: Piece;
		progress: number; // 0-1, where 1 is 100% complete
		selectedSpeed: Speed;
		instrumentId: InstrumentId;
	}

	let { piece, progress, selectedSpeed, instrumentId }: Props = $props();

	// Dispatch seeks to parent when user scrubs/flings
	const dispatch = createEventDispatcher();

	// Get instrument config for clef
	const instrumentConfig = $derived(instrumentConfigs.find((config) => config.id === instrumentId));
	const clef = $derived(instrumentConfig?.clef ?? 'treble');

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

	// Inverse function: convert notation progress (0-1) back to track progress
	function progressInNotationToProgressInTrack(notationProgress: number): number {
		return notationStart + notationProgress * (notationEnd - notationStart);
	}

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

	// Reset userOffset when progress changes externally (e.g., from parent after seek or regular playback)
	// This prevents double-offset issues when parent updates progress
	$effect(() => {
		if (!isScrubbing && inertiaId === null) {
			// Progress changed externally, ensure userOffset doesn't interfere
			userOffset = 0;
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

	// --- Kinetic scrubbing state ---
	let isScrubbing = $state(false);
	let userOffset = $state(0); // additional offset from user drag/inertia
	let lastPointerX = $state(0);
	let lastPointerTime = $state(0);
	let velocityX = $state(0); // px/ms
	let inertiaId: number | null = $state(null);

	// Calculate the X positions for the full track (0% to 100%)
	// even if notation only covers a portion of it
	const trackStartX = $derived(
		firstNoteX - (notationStart / (notationEnd - notationStart)) * (lastNoteX - firstNoteX)
	);
	const trackEndX = $derived(
		lastNoteX + ((1 - notationEnd) / (notationEnd - notationStart)) * (lastNoteX - firstNoteX)
	);

	// Clamp userOffset so total offset stays within full track range [trackStartX, trackEndX]
	function clampUserOffset(): boolean {
		const minTotal = targetPosition - trackEndX; // far right (100%) under playhead
		const maxTotal = targetPosition - trackStartX; // far left (0%) under playhead
		const currentTotal = scrollOffset + userOffset;
		let clamped = false;
		if (currentTotal < minTotal) {
			userOffset = minTotal - scrollOffset;
			clamped = true;
		} else if (currentTotal > maxTotal) {
			userOffset = maxTotal - scrollOffset;
			clamped = true;
		}
		return clamped;
	}

	function stopInertia() {
		if (inertiaId !== null) {
			cancelAnimationFrame(inertiaId);
			inertiaId = null;
		}
	}

	function onPointerDown(e: PointerEvent) {
		// Prevent native scroll on touch
		(e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
		e.preventDefault();
		stopInertia();
		velocityX = 0; // Clear any residual velocity immediately
		isScrubbing = true;
		shouldAnimate = false; // disable tempo-driven transition while user scrubs
		lastPointerX = e.clientX;
		lastPointerTime = performance.now();
	}

	function onPointerMove(e: PointerEvent) {
		if (!isScrubbing) return;
		const now = performance.now();
		const dx = e.clientX - lastPointerX;
		const dt = Math.max(1, now - lastPointerTime);
		userOffset += dx;
		clampUserOffset();
		// Reset velocity if there's no actual movement (pointer held still)
		if (Math.abs(dx) < 0.5) {
			velocityX = 0;
		} else {
			// simple low-pass filter for velocity only when there's actual movement
			const instVelocity = dx / dt; // px/ms
			velocityX = 0.85 * velocityX + 0.15 * instVelocity;
		}
		lastPointerX = e.clientX;
		lastPointerTime = now;
	}

	function onPointerUp(_e: PointerEvent) {
		if (!isScrubbing) return;
		isScrubbing = false;
		startInertia(velocityX);
	}

	function startInertia(initialVelocity: number) {
		// If velocity is negligible, finalize immediately
		const THRESHOLD = 0.02; // px/ms
		if (Math.abs(initialVelocity) < THRESHOLD) {
			finalizeSeek();
			shouldAnimate = true;
			return;
		}

		let v = initialVelocity;
		const FRICTION = 0.002; // per ms (exponential decay)
		let prev = performance.now();

		const step = (now: number) => {
			const dt = Math.min(32, now - prev); // cap dt to avoid big jumps
			prev = now;
			userOffset += v * dt;
			const clamped = clampUserOffset();
			// exponential decay of velocity
			const decay = Math.max(0, 1 - FRICTION * dt);
			v *= decay;

			if (Math.abs(v) < THRESHOLD || clamped) {
				inertiaId = null;
				finalizeSeek();
				shouldAnimate = true;
			} else {
				inertiaId = requestAnimationFrame(step);
			}
		};

		inertiaId = requestAnimationFrame(step);
	}

	function finalizeSeek() {
		// Compute new progress from current visual position using full track range
		const totalOffset = scrollOffset + userOffset;
		const currentNotePos = targetPosition - totalOffset;
		// Calculate fraction across the entire track (0% to 100%)
		const fractionInTrack = (currentNotePos - trackStartX) / (trackEndX - trackStartX);
		const clampedFractionInTrack = Math.min(1, Math.max(0, fractionInTrack));
		// notify parent with the track progress
		dispatch('seek', { progress: clampedFractionInTrack });
		// Reset userOffset and velocity after dispatching
		userOffset = 0;
		velocityX = 0;
	}

	// total transform including user interaction
	const totalOffset = $derived(scrollOffset + userOffset);
	const shouldTransition = $derived(shouldAnimate && !isScrubbing && inertiaId === null);

	const keySignature = $derived(getKeySignature(piece.key, piece.mode));
</script>

<div class="rolling-staff-container" bind:clientWidth={containerWidth}>
	<div class="border-light-blue overflow-hidden rounded-lg border bg-white">
		<div
			class="staff-viewport"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
		>
			<div class="fade-overlay"></div>
			<!-- Playhead line at 40% -->
			<div class="playhead" style="left: {containerWidth * 0.4}px;"></div>
			<div
				class="rolling-staff-wrapper"
				style="transform: translateX({totalOffset}px); transition: {shouldTransition
					? `transform ${transitionDuration}s linear, `
					: ''}opacity 0.3s ease-in; opacity: {isReady ? 1 : 0}; cursor: {isScrubbing
					? 'grabbing'
					: 'grab'};"
			>
				<Staff
					sequence={flattenedMelody}
					{keySignature}
					mode={piece.mode}
					{clef}
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
		touch-action: none;
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
