<script lang="ts">
	import { fileStore, type Piece, type Speed, type UnitMaterial } from '$lib/config/units';
	import { onMount, onDestroy } from 'svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import RollingStaff from './RollingStaff.svelte';
	import { initUnitKeyAccess } from '$lib/util/initUnitKeyAccess';

	interface Props {
		unit: UnitMaterial;
		piece: Piece;
	}

	let { unit, piece }: Props = $props();
	let selectedSpeed: Speed = $state('medium');
	let selectedTrack: 'full' | 'backing' = $state('backing');
	let isPlaying: boolean = $state(false);
	let isLoading: boolean = $state(false);
	let isRepeat: boolean = $state(false);
	let currentTime: number = $state(0);
	let displayTime: number = $state(0);
	let duration: number = $state(0);
	let hasKeyAccess = $state(false);

	$effect(() => {
		// Initialize key access from URL or localStorage
		hasKeyAccess = initUnitKeyAccess(unit.code, unit.keyCode);
	});

	let audioElement: HTMLAudioElement | null = null;

	const currentVariant = $derived(piece.tracks[selectedSpeed]);

	const currentUrl = $derived(
		`${fileStore}/${unit.code}/${selectedTrack === 'backing' ? currentVariant.backingTrackUrl : currentVariant.audioUrl}`
	);

	function setupAudioElement() {
		if (!audioElement) {
			audioElement = new Audio();
			audioElement.crossOrigin = 'anonymous';
			audioElement.preload = 'metadata';
			audioElement.volume = 1;
			audioElement.loop = isRepeat;

			audioElement.addEventListener('loadedmetadata', () => {
				duration = audioElement!.duration;
			});

			audioElement.addEventListener('timeupdate', () => {
				currentTime = audioElement!.currentTime;
				if (!isLoading) {
					displayTime = currentTime;
				}
			});

			audioElement.addEventListener('ended', () => {
				isPlaying = false;
			});

			audioElement.addEventListener('play', () => {
				isPlaying = true;
			});

			audioElement.addEventListener('pause', () => {
				isPlaying = false;
			});
		}

		audioElement.src = currentUrl;
		audioElement.load();
	}

	async function togglePlay() {
		if (!audioElement) {
			setupAudioElement();
		}

		if (isPlaying) {
			audioElement?.pause();
		} else {
			isLoading = true;
			await audioElement?.play();
			isLoading = false;
		}
	}

	function seek(time: number) {
		if (audioElement) {
			audioElement.currentTime = time;
			currentTime = time;
			displayTime = time;
		}
	}

	async function handleSpeedChange(speed: Speed) {
		const wasPlaying = isPlaying;
		const progressPercent = duration > 0 ? currentTime / duration : 0;
		isLoading = true;

		if (audioElement) {
			audioElement.pause();
		}

		selectedSpeed = speed;

		if (audioElement) {
			audioElement.src = currentUrl;
			audioElement.load();

			// Wait for metadata to load, then restore position
			audioElement.addEventListener(
				'loadedmetadata',
				() => {
					if (audioElement) {
						audioElement.currentTime = audioElement.duration * progressPercent;
						displayTime = audioElement.currentTime;
						isLoading = false;
						if (wasPlaying) {
							audioElement.play();
						}
					}
				},
				{ once: true }
			);
		} else {
			setupAudioElement();
			isLoading = false;
		}
	}

	async function handleTrackChange(track: 'full' | 'backing') {
		const wasPlaying = isPlaying;
		const progressPercent = duration > 0 ? currentTime / duration : 0;
		isLoading = true;

		if (audioElement) {
			audioElement.pause();
		}

		selectedTrack = track;

		if (audioElement) {
			audioElement.src = currentUrl;
			audioElement.load();

			// Wait for metadata to load, then restore position
			audioElement.addEventListener(
				'loadedmetadata',
				() => {
					if (audioElement) {
						audioElement.currentTime = audioElement.duration * progressPercent;
						displayTime = audioElement.currentTime;
						isLoading = false;
						if (wasPlaying) {
							audioElement.play();
						}
					}
				},
				{ once: true }
			);
		} else {
			setupAudioElement();
			isLoading = false;
		}
	}

	function toggleRepeat() {
		isRepeat = !isRepeat;
		if (audioElement) {
			audioElement.loop = isRepeat;
		}
	}

	function playFromStart() {
		if (audioElement) {
			audioElement.currentTime = 0;
			currentTime = 0;
			displayTime = 0;
			audioElement.play();
		}
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	onMount(() => {
		setupAudioElement();
	});

	// Update audio when piece changes
	$effect(() => {
		// Track the currentUrl to trigger when piece or speed/track changes
		const url = currentUrl;
		if (audioElement) {
			const wasPlaying = isPlaying;
			audioElement.pause();
			audioElement.src = url;
			audioElement.load();

			if (wasPlaying) {
				audioElement.play();
			}
		}
	});

	onDestroy(() => {
		if (audioElement) {
			audioElement.pause();
			audioElement.src = '';
		}
	});
</script>

<div class="space-y-6">
	<!-- Custom Audio Player -->
	<div>
		<h3 class="mb-3 text-sm font-semibold text-dark-blue">Listen and practice</h3>
		<div class="player-box">
			{#if hasKeyAccess}
				<RollingStaff {piece} progress={currentTime / duration} {selectedSpeed} />
			{:else}
				<p class="mb-4 text-center text-sm text-slate-600">
					Unlock rolling sheet music by purchasing the unit.
				</p>
			{/if}

			<!-- Progress Bar -->
			<div class="mb-2">
				<input
					type="range"
					min="0"
					max={duration || 100}
					step="0.1"
					value={displayTime}
					oninput={(e) => seek(parseFloat(e.currentTarget.value))}
					class="progress-bar"
					style="--progress: {(displayTime / duration) * 100}%"
				/>
			</div>

			<!-- Time Display -->
			<div class="flex justify-between text-xs text-slate-600">
				<span>{formatTime(displayTime)}</span>
				<span>{formatTime(duration)}</span>
			</div>
			<!-- Play/Pause and Repeat Buttons -->
			<div class="mb-3 flex items-center justify-center gap-4">
				<button onclick={playFromStart} class="control-button" aria-label="Play from start">
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
						<rect x="6" y="5" width="2" height="14" />
						<path d="M10 5v14l10-7z" />
					</svg>
				</button>
				<button
					onclick={togglePlay}
					class="play-button"
					aria-label={isPlaying ? 'Pause' : 'Play'}
					disabled={isLoading}
				>
					{#if isLoading}
						<svg class="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					{:else if isPlaying}
						<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
							<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
						</svg>
					{:else}
						<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
					{/if}
				</button>
				<button
					onclick={toggleRepeat}
					class="repeat-button {isRepeat ? 'active' : ''}"
					aria-label="Toggle repeat"
				>
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
					</svg>
				</button>
			</div>

			<!-- Speed + Track Selection -->
			<div class="selectors">
				<div class="selector-item">
					<p class="mb-3 text-sm font-semibold text-dark-blue">Speed</p>
					<PillSelector
						options={[
							{ value: 'slow', label: `Slow` },
							{ value: 'medium', label: `Medium` },
							{ value: 'fast', label: `Fast` }
						]}
						selected={selectedSpeed}
						onSelect={(speed) => handleSpeedChange(speed)}
					/>
				</div>

				<div class="selector-item">
					<p class="mb-3 text-sm font-semibold text-dark-blue">Select track</p>
					<PillSelector
						options={[
							{ value: 'backing', label: 'Backing track' },
							{ value: 'full', label: 'Full track' }
						]}
						selected={selectedTrack}
						onSelect={(track) => handleTrackChange(track)}
					/>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.text-dark-blue {
		color: var(--color-dark-blue);
	}

	.player-box {
		border-radius: 0.75rem;
		border: 1px solid rgb(226 232 240);
		background-color: rgb(248 250 252);
		padding: 1rem;
	}

	.selectors {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.selector-item {
		padding: 0;
	}

	@media (min-width: 640px) {
		.selectors {
			flex-direction: row;
			align-items: stretch;
			gap: 1rem;
		}

		.selector-item {
			flex: 1;
		}
	}

	.play-button {
		display: flex;
		height: 3.5rem;
		width: 3.5rem;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background-color: var(--color-dark-blue);
		color: var(--color-off-white);
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
		transition: all 150ms ease-in-out;
		cursor: pointer;
		border: none;
	}

	.play-button:hover {
		background-color: var(--color-dark-blue-highlight);
		color: var(--color-off-white);
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
	}

	.play-button:active {
		transform: scale(0.95);
	}

	.play-button:disabled {
		cursor: not-allowed;
	}

	.control-button {
		display: flex;
		height: 2.5rem;
		width: 2.5rem;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		background-color: rgb(241 245 249);
		color: rgb(100 116 139);
		border: 1px solid rgb(226 232 240);
		transition: all 150ms ease-in-out;
		cursor: pointer;
	}

	.control-button:hover {
		background-color: rgb(226 232 240);
		color: var(--color-dark-blue);
	}

	.control-button:active {
		transform: scale(0.95);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	.repeat-button {
		display: flex;
		height: 2.5rem;
		width: 2.5rem;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		background-color: rgb(241 245 249);
		color: rgb(100 116 139);
		border: 1px solid rgb(226 232 240);
		transition: all 150ms ease-in-out;
		cursor: pointer;
	}

	.repeat-button:hover {
		background-color: rgb(226 232 240);
		color: var(--color-dark-blue);
	}

	.repeat-button.active {
		background-color: var(--color-dark-blue);
		color: white;
		border-color: var(--color-dark-blue);
	}

	.repeat-button:active {
		transform: scale(0.95);
	}

	.progress-bar {
		height: 0.5rem;
		width: 100%;
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		border-radius: 0.5rem;
		outline: none;
		background: linear-gradient(
			to right,
			var(--color-dark-blue) 0%,
			var(--color-dark-blue) var(--progress, 0%),
			rgb(226 232 240) var(--progress, 0%),
			rgb(226 232 240) 100%
		);
	}

	.progress-bar::-webkit-slider-thumb {
		appearance: none;
		-webkit-appearance: none;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		background: var(--color-dark-blue);
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
	}

	.progress-bar::-webkit-slider-thumb:hover {
		background: var(--color-yellow);
		transform: scale(1.1);
	}

	.progress-bar::-moz-range-thumb {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		background: var(--color-dark-blue);
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
	}

	.progress-bar::-moz-range-thumb:hover {
		background: var(--color-yellow);
		transform: scale(1.1);
	}
</style>
