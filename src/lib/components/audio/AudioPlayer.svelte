<script lang="ts">
	import { fileStore, type Speed, type TrackVariant } from '$lib/config/units';
	import { onMount, onDestroy } from 'svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';

	interface Props {
		unit: string;
		tracks: Record<Speed, TrackVariant>;
	}

	let { unit, tracks }: Props = $props();
	let selectedSpeed: Speed = $state('medium');
	let selectedTrack: 'full' | 'backing' = $state('full');
	let isPlaying: boolean = $state(false);
	let isLoading: boolean = $state(false);
	let isRepeat: boolean = $state(false);
	let currentTime: number = $state(0);
	let displayTime: number = $state(0);
	let duration: number = $state(0);

	let audioElement: HTMLAudioElement | null = null;

	const currentVariant = $derived(tracks[selectedSpeed]);
	const currentUrl = $derived(
		`${fileStore}/${unit}/${selectedTrack === 'full' ? currentVariant.audioUrl : currentVariant.backingTrackUrl}`
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
			await audioElement?.play();
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

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	onMount(() => {
		setupAudioElement();
	});

	onDestroy(() => {
		if (audioElement) {
			audioElement.pause();
			audioElement.src = '';
		}
	});
</script>

<div class="player-container">
	<div class="space-y-6">
		<!-- Custom Audio Player -->
		<div>
			<p class="mb-3 text-sm font-semibold text-dark-blue">Player</p>
			<div class="player-box">
				<!-- Play/Pause and Repeat Buttons -->
				<div class="mb-3 flex items-center justify-center gap-4">
					<button
						onclick={togglePlay}
						class="play-button"
						aria-label={isPlaying ? 'Pause' : 'Play'}
					>
						{#if isPlaying}
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
								{ value: 'full', label: 'Full track' },
								{ value: 'backing', label: 'Backing track' }
							]}
							selected={selectedTrack}
							onSelect={(track) => handleTrackChange(track)}
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.player-container {
		border-radius: 1rem;
		background-color: white;
		padding: 2rem;
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
	}

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
		background-color: var(--color-yellow);
		color: var(--color-dark-blue);
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
	}

	.play-button:active {
		transform: scale(0.95);
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
