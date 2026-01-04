<script lang="ts">
	import type { Piece, Speed } from '$lib/config/units';
	import Staff from '$lib/components/music/Staff.svelte';
	import { getKeySignature } from '$lib/config/keys';

	interface Props {
		piece: Piece;
		progress: number; // 0-1, where 1 is 100% complete
		selectedSpeed: Speed;
	}

	let { piece, progress }: Props = $props();

	// Calculate visible range based on notation start and end percentages
	const notationStart = $derived(piece.notationStartPercent ?? 0);
	const notationEnd = $derived(piece.notationEndPercent ?? 1);

	// Flatten all melodies into a single continuous sequence
	const flattenedMelody = $derived(piece.melody.flat());

	// Total notes in the entire piece
	const totalNotes = $derived(flattenedMelody.length);

	// Calculate progress within notation range
	const progressInNotation = $derived(
		notationEnd > notationStart
			? Math.max(0, Math.min(1, (progress - notationStart) / (notationEnd - notationStart)))
			: 0
	);

	// Calculate minimum width based on total notes - more notes = wider staff
	// Use ~15px per sixteenth note as baseline (15 pixels per sixteenth from Staff component)
	const totalSixteenths = $derived(
		flattenedMelody.reduce((sum, item) => sum + (item.length ?? 4), 0)
	);
	const minStaffWidth = $derived(Math.max(400, totalSixteenths * 15 + 200));

	// Calculate scroll offset: keep current note centered
	// progressInNotation * totalNotes gives us which note we're on
	// We want to scroll so that note is roughly in the center of the viewport
	const currentNoteIndex = $derived(progressInNotation * totalNotes);
	const scrollOffset = $derived(-(currentNoteIndex / totalNotes) * 100);

	const keySignature = $derived(getKeySignature(piece.key, piece.mode));
</script>

<div class="rolling-staff-container">
	<div class="border-light-blue overflow-hidden rounded-lg border bg-white">
		<div class="rolling-staff-wrapper" style="transform: translateX({scrollOffset}%)">
			<Staff
				sequence={flattenedMelody}
				{keySignature}
				mode={piece.mode}
				clef="treble"
				barLength={piece.barLength}
				minWidth={minStaffWidth}
			/>
		</div>
	</div>
</div>

<style>
	.rolling-staff-container {
		width: 100%;
		margin-bottom: 1rem;
	}

	.rolling-staff-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: flex-start;
		min-width: 100%;
		height: 180px;
		background: white;
		transition: transform 0.1s linear;
		will-change: transform;
	}
</style>
