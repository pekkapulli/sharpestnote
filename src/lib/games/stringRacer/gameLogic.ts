import { writable } from 'svelte/store';
import { gameState, getLaneForNote, getNoteNameForLane } from './gameState.svelte';

interface GameConfig {
	difficultyLevel: number; // 1-5
	instrument: string;
	gameDuration: number; // ms
}

export function createGameLogic(config: GameConfig) {
	const gameRuntime = writable(0);
	const isGameOver = writable(false);

	let frameCount = 0;
	let spawnInterval = 120; // Start at 120 frames (~2 seconds at 60 FPS) between spawns
	let lastSpawnTime = 0; // Track actual time of last spawn in ms
	let difficultyMultiplier = 1;
	let gameStartTime = 0;
	let animationFrameId: number | null = null;

	function updateDifficulty() {
		const elapsedSeconds = (Date.now() - gameStartTime) / 1000;
		const scoreIncrease = Math.floor(elapsedSeconds / 20); // increase every 20 seconds
		difficultyMultiplier = 1 + scoreIncrease * 0.1;

		// Decrease spawn interval more gradually (spawn more frequently)
		const baseSpawnInterval = 120;
		spawnInterval = Math.max(60, baseSpawnInterval - scoreIncrease * 5);

		// Increase speed gradually
		if (scoreIncrease > 0) {
			// Speed increases are handled via gameState.increaseSpeed()
		}
	}

	function spawnObstacle() {
		const now = Date.now();
		// Only spawn if at least 1000ms has passed since last spawn
		if (now - lastSpawnTime < 1000) {
			return;
		}
		lastSpawnTime = now;
		const randomLane = Math.floor(Math.random() * (config.instrument === 'guitar' ? 6 : 4));
		gameState.addObstacle(randomLane, -50); // Start far away from camera
	}

	function updateGameLogic() {
		frameCount++;

		if (frameCount % spawnInterval === 0) {
			spawnObstacle();
		}

		// Update difficulty every 10 frames
		if (frameCount % 10 === 0) {
			updateDifficulty();
		}

		// Check game over conditions
		const currentState = gameState;
		if (currentState) {
			// Game over if health drops to 0
			// This would be checked by the consuming component
		}
	}

	return {
		subscribe: gameRuntime.subscribe,
		startGame: () => {
			gameStartTime = Date.now();
			gameState.reset();
			gameState.start();
			isGameOver.set(false);
			frameCount = 0;
			difficultyMultiplier = 1;

			// Start game loop
			const gameLoop = () => {
				updateGameLogic();
				gameRuntime.set(Date.now() - gameStartTime);

				// Continue loop unless game is ended
				let shouldContinue = false;
				const unsubscribe = isGameOver.subscribe((value) => {
					shouldContinue = !value;
				});
				unsubscribe();

				if (shouldContinue) {
					animationFrameId = requestAnimationFrame(gameLoop);
				}
			};

			animationFrameId = requestAnimationFrame(gameLoop);
		},
		stopGame: () => {
			gameState.stop();
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
		},
		endGame: () => {
			isGameOver.set(true);
			gameState.stop();
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
		},
		onNoteDetected: (noteNumber: number) => {
			const lane = getLaneForNote(noteNumber, config.instrument);
			if (lane !== null) {
				const noteName = getNoteNameForLane(lane, config.instrument);
				gameState.setDetectedNote(noteName, lane);

				// Clear detection after 100ms to prevent repeated hits
				setTimeout(() => {
					gameState.setDetectedNote(null, null);
				}, 100);
			}
		},
		getDifficultyMultiplier: () => difficultyMultiplier
	};
}
