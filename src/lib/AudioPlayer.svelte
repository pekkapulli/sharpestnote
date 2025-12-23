<script lang="ts">
	import { fileStore, type Speed, type TrackVariant } from '$lib/config/units';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		unit: string;
		tracks: Record<Speed, TrackVariant>;
	}

	let { unit, tracks }: Props = $props();
	let selectedSpeed: Speed = $state('medium');
	let selectedTrack: 'full' | 'backing' = $state('full');
	let isPlaying: boolean = $state(false);
	let isLoading: boolean = $state(false);
	let currentTime: number = $state(0);
	let displayTime: number = $state(0);
	let duration: number = $state(0);
	let volume: number = $state(1);

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
			audioElement.volume = volume;

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

	function handleVolumeChange(vol: number) {
		volume = vol;
		if (audioElement) {
			audioElement.volume = vol;
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
	<div class="space-y-4">
		<!-- Speed Selection -->
		<div>
			<p class="mb-3 text-sm font-semibold text-dark-blue">
				Speed: {currentVariant.tempo} BPM
			</p>
			<div class="flex gap-2 sm:gap-3">
				<button
					class="button-speed {selectedSpeed === 'slow' ? 'button-active' : 'button-inactive'}"
					onclick={() => handleSpeedChange('slow')}
				>
					Slow ({tracks.slow.tempo} BPM)
				</button>
				<button
					class="button-speed {selectedSpeed === 'medium' ? 'button-active' : 'button-inactive'}"
					onclick={() => handleSpeedChange('medium')}
				>
					Medium ({tracks.medium.tempo} BPM)
				</button>
				<button
					class="button-speed {selectedSpeed === 'fast' ? 'button-active' : 'button-inactive'}"
					onclick={() => handleSpeedChange('fast')}
				>
					Fast ({tracks.fast.tempo} BPM)
				</button>
			</div>
		</div>

		<!-- Track Selection -->
		<div>
			<p class="mb-3 text-sm font-semibold text-dark-blue">Select track</p>
			<div class="flex gap-2 sm:gap-3">
				<button
					class="button-track {selectedTrack === 'full' ? 'button-active' : 'button-inactive'}"
					onclick={() => handleTrackChange('full')}
				>
					Full track
				</button>
				<button
					class="button-track {selectedTrack === 'backing' ? 'button-active' : 'button-inactive'}"
					onclick={() => handleTrackChange('backing')}
				>
					Backing track
				</button>
			</div>
		</div>

		<!-- Custom Audio Player -->
		<div>
			<p class="mb-3 text-sm font-semibold text-dark-blue">Player</p>
			<div class="player-box">
				<!-- Play/Pause Button -->
				<div class="mb-3 flex items-center justify-center">
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
			</div>
		</div>

		<!-- Volume Control -->
		<div>
			<div class="mb-3 flex items-end justify-between">
				<p class="text-sm font-semibold text-dark-blue">Volume</p>
				<p class="text-sm font-semibold text-yellow">{Math.round(volume * 100)}%</p>
			</div>
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={volume}
				oninput={(e) => handleVolumeChange(parseFloat(e.currentTarget.value))}
				class="volume-slider"
			/>
		</div>
	</div>
</div>

<style>
	.player-container {
		border-radius: 0.75rem;
		border: 2px solid var(--color-dark-blue);
		background-color: var(--color-off-white);
		padding: 1.5rem;
	}

	.text-dark-blue {
		color: var(--color-dark-blue);
	}

	.text-yellow {
		color: var(--color-yellow);
	}

	.button-speed,
	.button-track {
		flex: 1;
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 150ms ease-in-out;
		cursor: pointer;
	}

	.button-active {
		background-color: var(--color-dark-blue);
		color: var(--color-off-white);
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
		border: 2px solid var(--color-dark-blue);
	}

	.button-inactive {
		background-color: white;
		color: var(--color-dark-blue);
		border: 2px solid var(--color-dark-blue);
	}

	.button-inactive:hover {
		background-color: color-mix(in srgb, var(--color-yellow) 20%, white);
		border-color: var(--color-dark-blue);
	}

	.player-box {
		border-radius: 0.75rem;
		border: 2px solid var(--color-dark-blue);
		background-color: white;
		padding: 1rem;
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

	.progress-bar,
	.volume-slider {
		height: 0.5rem;
		width: 100%;
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		border-radius: 0.5rem;
		outline: none;
	}

	.progress-bar {
		background: linear-gradient(
			to right,
			var(--color-dark-blue) 0%,
			var(--color-dark-blue) var(--progress, 0%),
			#e5e5e5 var(--progress, 0%),
			#e5e5e5 100%
		);
	}

	.volume-slider {
		background: linear-gradient(to right, var(--color-yellow) 0%, var(--color-yellow) 100%);
	}

	.progress-bar::-webkit-slider-thumb,
	.volume-slider::-webkit-slider-thumb {
		appearance: none;
		-webkit-appearance: none;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		background: var(--color-dark-blue);
		cursor: pointer;
		border: 2px solid var(--color-off-white);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.progress-bar::-webkit-slider-thumb:hover,
	.volume-slider::-webkit-slider-thumb:hover {
		background: var(--color-yellow);
		transform: scale(1.1);
	}

	.progress-bar::-moz-range-thumb,
	.volume-slider::-moz-range-thumb {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		background: var(--color-dark-blue);
		cursor: pointer;
		border: 2px solid var(--color-off-white);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.progress-bar::-moz-range-thumb:hover,
	.volume-slider::-moz-range-thumb:hover {
		background: var(--color-yellow);
		transform: scale(1.1);
	}
</style>
