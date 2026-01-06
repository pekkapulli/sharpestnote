<script lang="ts">
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { onMount } from 'svelte';
	import HZForceStaff from '$lib/components/music/HZForceStaff.svelte';
	import { instrumentMap } from '$lib/config/instruments';
	import { renderNote } from '$lib/components/music/noteRenderer';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import type { MelodyItem } from '$lib/config/melody';
	import { getUnitStorage, setUnitStorage } from '$lib/util/unitStorage.svelte';

	interface Monster {
		id: number;
		x: number;
		y: number;
		speed: number;
		note: string; // The note this monster spawned at
	}

	interface Bullet {
		id: number;
		x: number;
		y: number;
		note: string; // The note that was playing when shot
	}

	const { data } = $props();
	const { unit, piece, code, pieceCode } = $derived(data);

	const tuner = createTuner({
		// svelte-ignore state_referenced_locally
		instrument: unit.instrument
	});
	const STAFF_HEIGHT = 150;
	const lineSpacing = STAFF_HEIGHT / 12;
	const centerY = STAFF_HEIGHT / 2;

	// Responsive width
	let containerWidth = $state(800);
	let containerElement: HTMLDivElement | undefined;

	// Instrument info
	const instrument = $derived(instrumentMap[unit.instrument]);
	const clef = $derived(instrument.clef);

	// Game state
	let gameActive = $state(false);
	let gameOver = $state(false);
	let isNewHighScore = $state(false);
	let score = $state(0);
	let highScore = $state(0);
	let monsters = $state<Monster[]>([]);
	let bullets = $state<Bullet[]>([]);
	let nextMonsterId = 0;
	let nextBulletId = 0;
	let monsterSpawnCount = 0;
	let gameLoop: number | null = null;
	let spawnInterval: number | null = null;

	// Spaceship position controlled by tuner
	let spaceshipY = $state(centerY);
	let lastShootTime = 0;
	const SHOOT_COOLDOWN = 150; // milliseconds between shots (auto-fire rate)

	// Game progression
	let gameStartTime = 0;
	const BASE_SPAWN_INTERVAL = 3000; // milliseconds

	// Generate note to Y position mapping based on piece scale
	function generateNoteToYMapping(scaleNotes: MelodyItem[]) {
		const noteToY: Record<string, number> = {};
		const keySignature = {
			note: piece.key,
			mode: piece.mode,
			preferredAccidental: 'sharp' as const,
			sharps: [],
			flats: []
		};

		// Map each note from the scale to a Y position
		for (const item of scaleNotes) {
			if (item.note) {
				const rendered = renderNote(item.note, keySignature, clef);
				if (rendered) {
					noteToY[item.note] = centerY - rendered.position * lineSpacing;
				}
			}
		}

		return noteToY;
	}

	const scaleNotes = $derived(piece.scale.filter((s) => s.note != null));
	const noteToY = $derived(generateNoteToYMapping(scaleNotes));

	onMount(() => {
		tuner.checkSupport();

		// Load high score from localStorage
		const storage = getUnitStorage(code);
		const gameKey = `${pieceCode}_defend_highScore`;
		highScore = (storage as any)[gameKey] || 0;

		// Set initial container width
		if (containerElement) {
			containerWidth = containerElement.offsetWidth;
		}

		// Update width on window resize
		const handleResize = () => {
			if (containerElement) {
				containerWidth = containerElement.offsetWidth;
			}
		};

		window.addEventListener('resize', handleResize);

		return () => {
			stopGame();
			window.removeEventListener('resize', handleResize);
		};
	});

	$effect(() => {
		if (gameActive && tuner.state.note) {
			const targetY = noteToY[tuner.state.note];
			if (targetY !== undefined) {
				spaceshipY = targetY;
				// Auto-shoot when a note is being played
				const now = Date.now();
				if (now - lastShootTime > SHOOT_COOLDOWN) {
					shoot();
					lastShootTime = now;
				}
			}
		}
	});

	function startGame() {
		gameActive = true;
		gameOver = false;
		isNewHighScore = false;
		score = 0;
		monsterSpawnCount = 0;
		monsters = [];
		bullets = [];
		spaceshipY = centerY;
		gameStartTime = Date.now();
		tuner.start();

		// Spawn monsters with increasing frequency
		const spawnNextMonster = () => {
			if (!gameActive) return;
			spawnMonster();

			// Calculate elapsed time in seconds
			const elapsedSeconds = (Date.now() - gameStartTime) / 1000;
			// Reduce spawn interval over time: starts at 3s, reduces to 0.8s after 40s
			const currentInterval = Math.max(800, BASE_SPAWN_INTERVAL - elapsedSeconds * 55);

			spawnInterval = window.setTimeout(spawnNextMonster, currentInterval);
		};

		spawnInterval = window.setTimeout(spawnNextMonster, BASE_SPAWN_INTERVAL);

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
		// Spawn monsters only at Y positions that correspond to notes in the piece scale
		const validNotes = Object.keys(noteToY);
		if (validNotes.length === 0) return;

		// For the first set of monsters, spawn them in scale order to teach the scale
		let note: string;
		if (monsterSpawnCount < scaleNotes.length) {
			note = scaleNotes[monsterSpawnCount].note!;
		} else {
			// After teaching the scale, spawn randomly
			note = validNotes[Math.floor(Math.random() * validNotes.length)];
		}
		monsterSpawnCount++;

		const randomY = noteToY[note];
		// Speed as percentage of container width per frame (capped at 60fps)
		// 0.05% to 0.11% per frame means crossing screen in ~15-33 seconds
		const speedPercentage = 0.0005 + Math.random() * 0.0001;
		const speed = containerWidth * speedPercentage;

		monsters = [
			...monsters,
			{
				id: nextMonsterId++,
				x: containerWidth,
				y: randomY,
				speed,
				note
			}
		];
	}

	function shoot() {
		if (!gameActive || !tuner.state.note) return;
		bullets = [
			...bullets,
			{
				id: nextBulletId++,
				x: 80,
				y: spaceshipY,
				note: tuner.state.note
			}
		];
	}

	function updateGame() {
		if (!gameActive) return;

		// Move monsters left
		monsters = monsters.map((m) => ({ ...m, x: m.x - m.speed })).filter((m) => m.x > -50);

		// Move bullets right
		bullets = bullets.map((b) => ({ ...b, x: b.x + 5 })).filter((b) => b.x < containerWidth + 50);

		// Check collisions
		bullets.forEach((bullet) => {
			monsters.forEach((monster) => {
				// Only collide if bullet was shot at the same note the monster spawned at
				if (bullet.note !== monster.note) return;

				const dx = bullet.x - monster.x;
				const dy = bullet.y - monster.y;
				const distance = Math.sqrt(dx * dx + dy * dy);
				// Smaller collision radius for smaller monsters
				if (distance < 15) {
					// Hit!
					monsters = monsters.filter((m) => m.id !== monster.id);
					bullets = bullets.filter((b) => b.id !== bullet.id);
					score += 10;
				}
			});
		});

		// Game over if monster reaches the rocket (x position 80)
		const lost = monsters.some((m) => m.x < 80);
		if (lost) {
			stopGame();
			// Update high score if needed
			isNewHighScore = score > highScore;
			if (isNewHighScore) {
				highScore = score;
				const gameKey = `${pieceCode}_defend_highScore`;
				setUnitStorage(code, { [gameKey]: highScore } as any);
			}
			gameOver = true;
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

<div class="min-h-screen bg-off-white py-8">
	<div class="mx-auto w-full max-w-5xl px-0 sm:px-4">
		<nav class="mb-4">
			<LinkButton href={`/unit/${code}/${pieceCode}`}>← Back to piece</LinkButton>
		</nav>

		<div class="flex flex-col items-center">
			<h1 class="mb-4 text-center">Defend</h1>
			<p class="mb-6 text-center text-slate-700">
				Control your spaceship with your instrument. Match scale notes to move up and down and
				auto-shoot!
			</p>

			{#if gameActive}
				<div class="mb-4 text-center">
					<p class="text-2xl font-bold text-dark-blue">Score: {score}</p>
					<p class="text-sm text-slate-600">
						Current note: {tuner.state.note ?? '—'} ({tuner.state.frequency?.toFixed(1) ?? '—'}
						Hz)
					</p>
				</div>
			{:else if highScore > 0}
				<div class="mb-4 text-center">
					<p class="text-lg text-slate-600">
						High Score: <span class="font-bold text-dark-blue">{highScore}</span>
					</p>
				</div>
			{/if}

			<!-- Game area with staff background -->
			<div bind:this={containerElement} class="w-full">
				<HZForceStaff
					{clef}
					keySignature={{
						note: piece.key,
						mode: piece.mode,
						preferredAccidental: 'sharp',
						sharps: [],
						flats: []
					}}
					width={containerWidth}
					height={STAFF_HEIGHT}
					{spaceshipY}
					{monsters}
					{bullets}
					{gameActive}
				/>
			</div>

			{#if tuner.state.error}
				<p class="mb-4 text-center text-sm text-red-600">{tuner.state.error}</p>
			{/if}

			<!-- Game Over Screen -->
			{#if gameOver}
				<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
					<div class="mx-4 max-w-lg rounded-2xl bg-off-white p-6 shadow-2xl">
						<div class="flex items-center justify-between gap-6">
							<div class="flex-1">
								<h2 class="mb-2 text-xl font-bold text-slate-900">Game Over!</h2>

								{#if isNewHighScore}
									<p class="mb-3 text-sm font-semibold text-amber-600">🏆 New High Score!</p>
								{/if}

								<div class="flex items-center gap-4">
									<div class="rounded-lg bg-white p-3 shadow-sm">
										<p class="text-xs text-slate-600">Your Score</p>
										<p class="text-2xl font-bold text-dark-blue">{score}</p>
									</div>

									{#if highScore > 0}
										<div class="rounded-lg bg-white p-3 shadow-sm">
											<p class="text-xs text-slate-600">High Score</p>
											<p class="text-2xl font-bold text-amber-700">{highScore}</p>
										</div>
									{/if}
								</div>
							</div>

							<button
								onclick={() => (gameOver = false)}
								class="rounded-lg bg-dark-blue px-6 py-3 font-semibold text-white transition hover:-translate-y-px hover:shadow-lg"
							>
								OK
							</button>
						</div>
					</div>
				</div>
			{/if}

			<div class="mt-6 flex justify-center gap-4">
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
				<p>🎵 Play scale notes to control your spaceship and auto-shoot</p>
			</div>
		</div>
	</div>
</div>
