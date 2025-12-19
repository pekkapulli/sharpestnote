<script lang="ts">
	import type { Accidental } from '$lib';

	interface Props {
		note?: string | null;
		ghostNote?: string | null;
		accidental?: Accidental;
		height?: number;
	}

	const { note = null, ghostNote = null, accidental = 'sharp', height = 150 }: Props = $props();

	// Base positions for natural notes in octave 4 (E4 is 0)
	const basePositions: Record<string, number> = {
		C: -1,
		D: -0.5,
		E: 0,
		F: 0.5,
		G: 1,
		A: 1.5,
		B: 2
	};

	// Calculate Y position on staff (handles accidentals and octaves)
	function getNotePosition(noteName: string): number | null {
		const match = /^([A-G])([#b]?)(\d)$/.exec(noteName);
		if (!match) return null;

		const [, letter, accidentalSign, octaveStr] = match;
		const base = basePositions[letter];
		const octave = Number(octaveStr);
		const accidentalOffset = accidentalSign === '#' ? 0.5 : accidentalSign === 'b' ? -0.5 : 0;
		const octaveOffset = (octave - 4) * 3.5; // each octave shifts 7 staff steps (3.5 lines)

		return base + octaveOffset + accidentalOffset;
	}

	const staffLines = [
		{ position: 4, label: 'F5' },
		{ position: 3, label: 'D5' },
		{ position: 2, label: 'B4' },
		{ position: 1, label: 'G4' },
		{ position: 0, label: 'E4' }
	];

	// Calculate scaling based on height
	// Total vertical span: 6 units above + 6 units below = 12 units
	// With some padding, we fit everything in height
	const lineSpacing = $derived(height / 12);
	const centerY = $derived(height / 2);
	const notePosition = $derived(note ? getNotePosition(note) : null);
	const ghostNotePosition = $derived(ghostNote ? getNotePosition(ghostNote) : null);
	const isHit = $derived(
		notePosition !== null && ghostNotePosition !== null && notePosition === ghostNotePosition
	);
	const displayNote = $derived(note || 'Rest');
</script>

<div class="flex flex-col items-center gap-4">
	<div class="relative w-full max-w-md" style="height: {height}px; aspect-ratio: 16/6">
		<!-- Staff lines -->
		<svg class="absolute inset-0 h-full w-full" viewBox="0 0 400 {height}">
			<!-- Treble clef staff lines -->
			{#each staffLines as line (line.position)}
				<line
					x1="30"
					y1={centerY - line.position * lineSpacing}
					x2="370"
					y2={centerY - line.position * lineSpacing}
					stroke="#333"
					stroke-width="1.5"
				/>
			{/each}

			<!-- Ledger lines above (C6, etc.) -->
			{#each [5, 6] as pos}
				<line
					x1="80"
					y1={centerY - pos * lineSpacing}
					x2="320"
					y2={centerY - pos * lineSpacing}
					stroke="#999"
					stroke-width="1"
					opacity="0.5"
				/>
			{/each}

			<!-- Ledger lines below (C4, etc.) -->
			{#each [-1, -2, -3] as pos}
				<line
					x1="80"
					y1={centerY - pos * lineSpacing}
					x2="320"
					y2={centerY - pos * lineSpacing}
					stroke="#999"
					stroke-width="1"
					opacity="0.5"
				/>
			{/each}

			<!-- Ghost note (detected note) -->
			{#if ghostNotePosition !== null && ghostNotePosition !== notePosition}
				<circle
					cx="200"
					cy={centerY - ghostNotePosition * lineSpacing}
					r="8"
					fill="#6b7280"
					opacity="0.4"
				/>
			{/if}

			<!-- Target note head -->
			{#if notePosition !== null}
				<circle
					cx="200"
					cy={centerY - notePosition * lineSpacing}
					r="8"
					fill={isHit ? '#16a34a' : 'black'}
					stroke={isHit ? '#22c55e' : 'none'}
					stroke-width={isHit ? '2' : '0'}
				/>
			{/if}
		</svg>
	</div>

	<!-- Note label -->
	{#if note}
		<div class="rounded-lg bg-dark-blue px-6 py-3 text-center">
			<p class="text-sm tracking-[0.08em] text-slate-300 uppercase">Current note</p>
			<p class="mt-1 text-3xl font-bold text-white">{note}</p>
		</div>
	{:else}
		<div class="rounded-lg bg-slate-200 px-6 py-3 text-center">
			<p class="text-sm tracking-[0.08em] text-slate-600 uppercase">Waiting for note...</p>
		</div>
	{/if}
</div>

<style>
	:global(svg) {
		overflow: visible;
	}
</style>
