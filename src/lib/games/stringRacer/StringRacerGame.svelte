<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import GameScene from '$lib/games/stringRacer/GameScene.svelte';
	import { gameState, getLaneForNote } from '$lib/games/stringRacer/gameState.svelte';
	import { createGameLogic } from '$lib/games/stringRacer/gameLogic';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import TitleWithIcon from '$lib/components/ui/TitleWithIcon.svelte';
	import defendIcon from '$lib/assets/defend_icon.png';
	import { noteNameToMidi } from '$lib/synth/noteUtils';

	let { instrument = 'guitar' } = $props();

	const instrumentType = $derived(instrument as 'guitar' | 'violin' | 'viola' | 'cello');
	const tuner = $derived.by(() => createTuner({ instrument: instrumentType }));
	let gameLogic = $derived.by(() =>
		createGameLogic({ difficultyLevel: 1, instrument, gameDuration: 60000 })
	);

	let gameRunning = $state(false);
	let currentState = $derived($gameState);
	let gameStarted = $state(false);
	let showGameOver = $state(false);
	let microphoneSelected = $state(false); // Track if user has selected a microphone

	// Watch tuner state and update game state with detected notes
	$effect(() => {
		if (gameRunning && tuner.state.note) {
			const note = tuner.state.note;
			const midiNote = noteNameToMidi(note);
			const lane = midiNote ? getLaneForNote(midiNote, instrument) : null;

			if (lane !== null) {
				gameState.setDetectedNote(note, lane);
			}
		} else if (gameRunning) {
			// Clear detection when no note is playing
			gameState.setDetectedNote(null, null);
		}
	});

	async function startGame() {
		try {
			if (tuner.state.needsUserGesture) {
				await tuner.resumeAfterGesture();
			} else {
				await tuner.start();
			}
			gameRunning = true;
			gameStarted = true;
			showGameOver = false;
			gameLogic.startGame();
		} catch (err) {
			console.error('Failed to start game:', err);
		}
	}

	function stopGame() {
		gameRunning = false;
		gameLogic.stopGame();
		tuner.stop();
	}

	function endGame() {
		showGameOver = true;
		gameRunning = false;
		gameLogic.endGame();
		tuner.stop();
	}

	function resetGame() {
		showGameOver = false;
		gameStarted = false;
		gameState.reset();
	}

	function handleDeviceChange(deviceId: string) {
		tuner.state.selectedDeviceId = deviceId;
		microphoneSelected = true;
	}

	onMount(() => {
		// Monitor health and end game if it reaches 0
		const unsubscribe = gameState.subscribe((state) => {
			if (gameRunning && state.health <= 0) {
				endGame();
			}
		});

		return () => {
			unsubscribe();
			gameLogic.stopGame();
			tuner.stop();
		};
	});

	onDestroy(() => {
		gameLogic.stopGame();
		tuner.stop();
	});
</script>

<div class="relative h-screen w-screen overflow-hidden bg-black">
	{#if !gameStarted}
		<!-- Microphone selection screen -->
		<div
			class="flex h-screen flex-col items-center justify-center bg-linear-to-b from-slate-900 to-slate-800 px-4"
		>
			<div class="text-center">
				<TitleWithIcon title="String Racer" iconUrl={defendIcon} />
				<p class="mb-8 max-w-md text-slate-300">
					Hit the targets by playing the correct open strings on your instrument!
				</p>

				<div class="mx-auto mb-8 max-w-sm">
					<MicrophoneSelector
						tunerState={tuner.state}
						onStartListening={() => {
							microphoneSelected = true;
						}}
						onDeviceChange={handleDeviceChange}
						onRefreshDevices={tuner.refreshDevices}
					/>
				</div>

				{#if microphoneSelected}
					<button
						onclick={startGame}
						class="mb-8 rounded-lg bg-blue-600 px-12 py-4 text-xl font-bold text-white hover:bg-dark-blue"
					>
						Start Game
					</button>
				{/if}

				<div class="mt-8 rounded-lg bg-slate-800 p-6">
					<h3 class="mb-4 font-bold text-slate-100">How to Play:</h3>
					<ul class="space-y-2 text-left text-sm text-slate-300">
						<li>🎵 Play the open string that matches each obstacle</li>
						<li>⚡ Time your playing to hit obstacles in the hit zone</li>
						<li>🎯 Build combo streaks for bonus points</li>
						<li>❤️ Don't miss too many obstacles or game over!</li>
					</ul>
				</div>
			</div>
		</div>
	{:else if !showGameOver}
		<!-- Game screen -->
		<div class="relative h-screen w-full">
			<!-- Game viewport -->
			<div class="absolute inset-0 w-full">
				<GameScene {instrument} />
			</div>

			<!-- HUD -->
			<div class="pointer-events-none absolute top-0 right-0 left-0 z-10 flex justify-between p-6">
				<div class="text-white">
					<div class="text-2xl font-bold">{currentState.score}</div>
					<div class="text-sm text-slate-300">Score</div>
				</div>
				<div class="text-right text-white">
					<div class="text-2xl font-bold">{currentState.combo}x</div>
					<div class="text-sm text-slate-300">Combo</div>
				</div>
				<div class="text-right text-white">
					<div class="text-2xl font-bold">{currentState.health}/100</div>
					<div class="text-sm text-slate-300">Health</div>
				</div>
			</div>
			<button
				onclick={stopGame}
				class="pointer-events-auto absolute right-6 bottom-6 rounded-lg bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700"
			>
				Quit Game
			</button>
		</div>
	{:else}
		<!-- Game over screen -->
		<div
			class="flex h-screen flex-col items-center justify-center bg-linear-to-b from-slate-900 to-slate-800 px-4"
		>
			<div class="text-center">
				<h1 class="mb-4 text-5xl font-bold text-white">Game Over!</h1>
				<div class="mb-8 rounded-lg bg-slate-800 p-8">
					<div class="mb-6 space-y-4 text-left">
						<div class="flex justify-between border-b border-slate-700 pb-2">
							<span class="text-slate-300">Final Score:</span>
							<span class="text-2xl font-bold text-white">{currentState.score}</span>
						</div>
						<div class="flex justify-between border-b border-slate-700 pb-2">
							<span class="text-slate-300">Max Combo:</span>
							<span class="text-xl font-bold text-amber-400">{currentState.maxCombo}x</span>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-300">Obstacles Hit:</span>
							<span class="text-xl font-bold text-green-400"
								>{Math.floor(currentState.score / 100)}</span
							>
						</div>
					</div>
				</div>

				<button
					onclick={resetGame}
					class="rounded-lg bg-blue-600 px-8 py-3 font-bold text-white hover:bg-blue-700"
				>
					Play Again
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: #0f172a;
	}

	:global(:root) {
		--tw-extend-height: 100%;
	}

	:global(canvas) {
		width: 100% !important;
		height: 100% !important;
		display: block !important;
	}
</style>
