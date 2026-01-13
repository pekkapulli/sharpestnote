<script lang="ts">
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { onMount } from 'svelte';
	import HZForceStaff from '$lib/components/music/HZForceStaff.svelte';
	import { instrumentConfigs, defaultInstrumentId, instrumentMap } from '$lib/config/instruments';
	import { renderNote } from '$lib/components/music/noteRenderer';
	import type { InstrumentId } from '$lib/config/types';

	interface Monster {
		id: number;
		x: number;
		y: number;
		speed: number;
	}

	interface Bullet {
		id: number;
		x: number;
		y: number;
	}

	const tuner = createTuner();
	const STAFF_HEIGHT = 150;
	const lineSpacing = STAFF_HEIGHT / 12;
	const centerY = STAFF_HEIGHT / 2;

	// Instrument selection
	let selectedInstrument = $state<InstrumentId>(defaultInstrumentId);
	const instrument = $derived(instrumentMap[selectedInstrument]);
	const clef = $derived(instrument.clef);

	// Game state
	let gameActive = $state(false);
	let score = $state(0);
	let monsters = $state<Monster[]>([]);
	let bullets = $state<Bullet[]>([]);
	let nextMonsterId = 0;
	let nextBulletId = 0;
	let gameLoop: number | null = null;
	let spawnInterval: number | null = null;

	// Spaceship position controlled by tuner
	let spaceshipY = $state(centerY);
	let lastShootTime = 0;
	const SHOOT_COOLDOWN = 200; // milliseconds between shots

	// Generate note to Y position mapping based on instrument range
	function generateNoteToYMapping(bottomNote: string, topNote: string) {
		const noteToY: Record<string, number> = {};
		const keySignature = {
			note: 'C',
			mode: 'major' as const,
			preferredAccidental: 'sharp' as const,
			sharps: [],
			flats: []
		};

		// Parse bottom and top notes to determine range
		const bottomMatch = /^([A-G])([#b]?)(\d)$/.exec(bottomNote);
		const topMatch = /^([A-G])([#b]?)(\d)$/.exec(topNote);
		if (!bottomMatch || !topMatch) return noteToY;

		const bottomOctave = Number(bottomMatch[3]);
		const topOctave = Number(topMatch[3]);

		// Generate all notes in the range
		const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

		for (let octave = bottomOctave; octave <= topOctave; octave++) {
			for (const noteName of noteNames) {
				const fullNote = `${noteName}${octave}`;
				const rendered = renderNote(fullNote, keySignature, clef);
				if (rendered) {
					noteToY[fullNote] = centerY - rendered.position * lineSpacing;
				}
			}
		}

		return noteToY;
	}

	const noteToY = $derived(generateNoteToYMapping(instrument.bottomNote, instrument.topNote));

	onMount(() => {
		tuner.checkSupport();
		return () => {
			stopGame();
		};
	});

	$effect(() => {
		if (gameActive && tuner.state.note) {
			const targetY = noteToY[tuner.state.note];
			if (targetY !== undefined) {
				spaceshipY = targetY;
			}
		}
	});

	// Auto-shoot when playing pure notes
	$effect(() => {
		if (gameActive && tuner.state.cents !== null && Math.abs(tuner.state.cents) < 10) {
			const now = Date.now();
			if (now - lastShootTime > SHOOT_COOLDOWN) {
				shoot();
				lastShootTime = now;
			}
		}
	});

	function startGame() {
		gameActive = true;
		score = 0;
		monsters = [];
		bullets = [];
		spaceshipY = centerY;
		tuner.start();

		// Spawn monsters every 2 seconds
		spawnInterval = window.setInterval(() => {
			if (gameActive) {
				spawnMonster();
			}
		}, 2000);

		// Game loop
		gameLoop = window.requestAnimationFrame(updateGame);
	}

	function stopGame() {
		gameActive = false;
		tuner.stop();
		if (spawnInterval) clearInterval(spawnInterval);
		if (gameLoop) cancelAnimationFrame(gameLoop);
	}

	function spawnMonster() {
		// Spawn monsters only at Y positions that correspond to notes in instrument range
		const validYPositions = Object.values(noteToY);
		if (validYPositions.length === 0) return;

		const randomY = validYPositions[Math.floor(Math.random() * validYPositions.length)];
		monsters = [
			...monsters,
			{
				id: nextMonsterId++,
				x: 800,
				y: randomY,
				speed: 0.5 + Math.random() * 0.5
			}
		];
	}

	function shoot() {
		if (!gameActive) return;
		bullets = [
			...bullets,
			{
				id: nextBulletId++,
				x: 80,
				y: spaceshipY
			}
		];
	}

	function updateGame() {
		if (!gameActive) return;

		// Move monsters left
		monsters = monsters.map((m) => ({ ...m, x: m.x - m.speed })).filter((m) => m.x > -50);

		// Move bullets right
		bullets = bullets.map((b) => ({ ...b, x: b.x + 5 })).filter((b) => b.x < 850);

		// Check collisions
		bullets.forEach((bullet) => {
			monsters.forEach((monster) => {
				const dx = bullet.x - monster.x;
				const dy = bullet.y - monster.y;
				const distance = Math.sqrt(dx * dx + dy * dy);
				if (distance < 30) {
					// Hit!
					monsters = monsters.filter((m) => m.id !== monster.id);
					bullets = bullets.filter((b) => b.id !== bullet.id);
					score += 10;
				}
			});
		});

		// Game over if monster reaches left side
		const lost = monsters.some((m) => m.x < 0);
		if (lost) {
			stopGame();
			alert(`Game Over! Score: ${score}`);
		}

		gameLoop = window.requestAnimationFrame(updateGame);
	}

	// Keyboard controls
	function handleKeydown(e: KeyboardEvent) {
		if (e.code === 'Space') {
			e.preventDefault();
			shoot();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex min-h-screen flex-col items-center justify-center bg-off-white p-8">
	<div class="w-full max-w-4xl">
		<h1 class="mb-4 text-center">Hz Force</h1>
		<p class="mb-4 text-center text-slate-700">
			Control your spaceship with your instrument. Match notes to move up and down. Press Space to
			shoot!
		</p>

		{#if !gameActive}
			<!-- Instrument selector (only shown before game starts) -->
			<div class="mb-6">
				<label for="instrument" class="mb-3 block text-center text-sm font-medium text-slate-700"
					>Select your instrument</label
				>
				<select
					id="instrument"
					bind:value={selectedInstrument}
					class="mx-auto block w-full max-w-sm rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
				>
					{#each instrumentConfigs as inst}
						<option value={inst.id}>{inst.label}</option>
					{/each}
				</select>
				<p class="mt-2 text-center text-xs text-slate-600">
					Range: {instrument.bottomNote} - {instrument.topNote} ({instrument.clef} clef)
				</p>
			</div>
		{/if}

		{#if gameActive}
			<div class="mb-4 text-center">
				<p class="text-2xl font-bold text-dark-blue">Score: {score}</p>
			</div>
		{/if}

		<!-- Game area with staff background -->
		<HZForceStaff
			{clef}
			keySignature={{
				note: 'C',
				mode: 'major',
				preferredAccidental: 'sharp',
				sharps: [],
				flats: []
			}}
			width={800}
			height={STAFF_HEIGHT}
			{spaceshipY}
			{monsters}
			{bullets}
			{gameActive}
		/>

		{#if tuner.state.error}
			<p class="mb-4 text-center text-sm text-red-600">{tuner.state.error}</p>
		{/if}

		<div class="flex justify-center gap-4">
			{#if !gameActive}
				<button
					onclick={startGame}
					class="rounded-lg bg-dark-blue px-8 py-4 text-lg font-semibold text-white transition hover:-translate-y-px hover:shadow"
				>
					Start Game
				</button>
			{:else}
				<button
					onclick={stopGame}
					class="rounded-lg bg-red-600 px-8 py-4 text-lg font-semibold text-white transition hover:-translate-y-px hover:shadow"
				>
					Stop Game
				</button>
			{/if}
		</div>

		<div class="mt-6 text-center text-sm text-slate-600">
			<p>
				🎵 Play notes {instrument.bottomNote} - {instrument.topNote} to control your spaceship vertically
			</p>
			<p>⌨️ Press Space to shoot</p>
		</div>
	</div>
</div>
