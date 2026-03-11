<script lang="ts">
	import { fileStore } from '$lib/config/units';
	import { onMount, onDestroy } from 'svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import RollingStaff from './RollingStaff.svelte';
	import { initUnitKeyAccess } from '$lib/util/initUnitKeyAccess';
	import tempoSlowIcon from '$lib/assets/tempo-slow.svg';
	import tempoMediumIcon from '$lib/assets/tempo-medium.svg';
	import tempoFastIcon from '$lib/assets/tempo-fast.svg';
	import trackBackingIcon from '$lib/assets/track-backing.svg';
	import trackBackingNegativeIcon from '$lib/assets/track-backing-negative.svg';
	import trackFullIcon from '$lib/assets/track-full.svg';
	import trackFullNegativeIcon from '$lib/assets/track-full-negative.svg';
	import type { Piece, Speed, UnitMaterial } from '$lib/config/types';

	interface Props {
		unit: UnitMaterial;
		piece: Piece;
		hasKeyAccess?: boolean;
		teachComplete?: boolean;
		onTrackComplete?: (event: { track: SelectedTrack; speed: Speed }) => void;
	}

	type SelectedTrack = 'full' | 'backing';

	let {
		unit,
		piece,
		hasKeyAccess: hasKeyAccessProp,
		teachComplete = false,
		onTrackComplete
	}: Props = $props();
	let selectedSpeed: Speed = $state('medium');
	let selectedTrack = $state<SelectedTrack>('full');
	let isPlaying: boolean = $state(false);
	let isLoading: boolean = $state(false);
	let isRepeat: boolean = $state(false);
	let currentTime: number = $state(0);
	let displayTime: number = $state(0);
	let duration: number = $state(0);
	let hasReportedTrackCompletion: boolean = $state(false);
	let lastPlaybackTime: number = $state(0);
	let localKeyAccess = $state(false);

	// Use provided prop if available, otherwise derive from async check
	const hasKeyAccess = $derived(hasKeyAccessProp !== undefined ? hasKeyAccessProp : localKeyAccess);

	// Only do async check if prop not provided
	$effect(() => {
		if (hasKeyAccessProp === undefined) {
			void initUnitKeyAccess(unit).then((access) => {
				localKeyAccess = access;
			});
		}
	});

	let audioElement: HTMLAudioElement | null = null;

	const currentVariant = $derived(piece.tracks?.[selectedSpeed]);

	const currentUrl = $derived(
		currentVariant
			? `${fileStore}/${unit.code}/${selectedTrack === 'backing' ? currentVariant.backingTrackUrl : currentVariant.audioUrl}`
			: ''
	);

	function getNotationEndTimeSeconds(): number {
		if (!duration || !Number.isFinite(duration)) return Number.POSITIVE_INFINITY;
		const endPercent = Math.min(1, Math.max(0, piece.notationEndPercent ?? 1));
		return duration * endPercent;
	}

	function maybeReportTrackCompletion(playbackTime: number) {
		if (hasReportedTrackCompletion) return;
		const notationEndTime = getNotationEndTimeSeconds();
		if (!Number.isFinite(notationEndTime)) return;
		if (playbackTime >= notationEndTime) {
			hasReportedTrackCompletion = true;
			onTrackComplete?.({ track: selectedTrack, speed: selectedSpeed });
		}
	}

	function setupAudioElement() {
		if (!audioElement) {
			audioElement = new Audio();
			audioElement.crossOrigin = 'anonymous';
			audioElement.preload = 'metadata';
			audioElement.volume = 1;
			audioElement.loop = isRepeat;

			audioElement.addEventListener('loadedmetadata', () => {
				duration = audioElement!.duration;
				hasReportedTrackCompletion = false;
				lastPlaybackTime = 0;
			});

			audioElement.addEventListener('timeupdate', () => {
				const playbackTime = audioElement!.currentTime;
				if (playbackTime + 0.25 < lastPlaybackTime) {
					hasReportedTrackCompletion = false;
				}
				lastPlaybackTime = playbackTime;
				currentTime = playbackTime;
				if (!isLoading) {
					displayTime = currentTime;
				}
				if (!audioElement!.paused) {
					maybeReportTrackCompletion(playbackTime);
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

			audioElement.src = currentUrl;
			audioElement.load();
		} else if (audioElement.src !== currentUrl) {
			// Only reload if the URL has actually changed
			audioElement.src = currentUrl;
			audioElement.load();
		}
	}

	async function togglePlay() {
		if (!audioElement) {
			setupAudioElement();
			// Wait for metadata to load before playing
			if (audioElement!.readyState < 2) {
				await new Promise((resolve) => {
					audioElement!.addEventListener('loadedmetadata', resolve, { once: true });
				});
			}
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
		if (!audioElement) {
			setupAudioElement();
		}

		if (audioElement) {
			// Ensure audio is loaded before seeking
			if (audioElement.readyState >= 2) {
				// HAVE_CURRENT_DATA or better
				audioElement.currentTime = time;
			} else {
				// If not ready yet, wait for metadata then seek
				const handleSeek = () => {
					audioElement!.currentTime = time;
					audioElement!.removeEventListener('loadedmetadata', handleSeek);
				};
				audioElement.addEventListener('loadedmetadata', handleSeek, { once: true });
			}
			currentTime = time;
			displayTime = time;
			if (time < getNotationEndTimeSeconds()) {
				hasReportedTrackCompletion = false;
			}
			lastPlaybackTime = time;
		}
	}

	async function handleSpeedChange(speed: Speed) {
		const wasPlaying = isPlaying;
		const progressPercent = duration > 0 ? currentTime / duration : 0;
		isLoading = true;

		if (audioElement) {
			audioElement.pause();
		}
		hasReportedTrackCompletion = false;
		lastPlaybackTime = 0;

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

	async function handleTrackChange(track: SelectedTrack) {
		const wasPlaying = isPlaying;
		const progressPercent = duration > 0 ? currentTime / duration : 0;
		isLoading = true;

		if (audioElement) {
			audioElement.pause();
		}
		hasReportedTrackCompletion = false;
		lastPlaybackTime = 0;

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
			hasReportedTrackCompletion = false;
			lastPlaybackTime = 0;
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
	// Store the previous URL to detect actual changes
	let previousUrl = $state('');
	$effect(() => {
		// Track the currentUrl to trigger when piece or speed/track changes
		const url = currentUrl;

		// Only reload if URL actually changed
		if (audioElement && url !== previousUrl) {
			const wasPlaying = isPlaying;
			audioElement.pause();
			audioElement.src = url;
			audioElement.load();
			hasReportedTrackCompletion = false;
			lastPlaybackTime = 0;

			if (wasPlaying) {
				audioElement.play();
			}
			previousUrl = url;
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
		<h3 class="text-sm font-semibold text-dark-blue">Listen and play along</h3>
		{#if teachComplete}
			<p class="mb-4 text-sm text-slate-600">
				Great job learning the piece! Now you can practice playing along.
			</p>
		{:else}
			<p class="mb-4 text-sm text-slate-600">(But practice with the games and sheet music first)</p>
		{/if}
		<div class="player-box">
			{#if hasKeyAccess}
				<RollingStaff
					{piece}
					progress={currentTime / duration}
					{selectedSpeed}
					instrumentId={unit.instrument}
					onSeek={(progress) => seek(progress * (duration || 0))}
				/>
			{:else}
				<p class="mb-4 text-center text-sm text-slate-600">
					Unlock rolling sheet music by purchasing the unit.
				</p>
			{/if}

			<!-- Progress Bar -->
			<div class="mb-2">
				<label for="audio-progress" class="sr-only">Audio playback progress</label>
				<input
					id="audio-progress"
					type="range"
					min="0"
					max={duration || 100}
					step="0.1"
					value={displayTime}
					oninput={(e) => seek(parseFloat(e.currentTarget.value))}
					aria-valuetext="{formatTime(displayTime)} of {formatTime(duration)}"
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
				<button
					onclick={playFromStart}
					class="control-button"
					aria-label="Play from start"
					type="button"
				>
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
					type="button"
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
					aria-pressed={isRepeat}
					type="button"
				>
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
					</svg>
				</button>
			</div>

			<!-- Speed + Track Selection -->
			<div class="selectors">
				<div class="selector-item">
					<p class="text-sm font-semibold text-dark-blue">Speed</p>
					<PillSelector
						options={[
							{ value: 'slow', label: `Slow`, icon: tempoSlowIcon },
							{ value: 'medium', label: `Medium`, icon: tempoMediumIcon },
							{ value: 'fast', label: `Fast`, icon: tempoFastIcon }
						]}
						selected={selectedSpeed}
						onSelect={(speed) => handleSpeedChange(speed)}
						iconOnly
					/>
				</div>

				<div class="selector-item">
					<p class="text-sm font-semibold text-dark-blue">Accompaniment</p>
					<PillSelector
						options={[
							{
								value: 'full',
								label: 'Full track',
								icon: trackFullIcon,
								iconNegative: trackFullNegativeIcon
							},
							{
								value: 'backing',
								label: 'Backing track',
								icon: trackBackingIcon,
								iconNegative: trackBackingNegativeIcon
							}
						]}
						selected={selectedTrack}
						onSelect={(track) => handleTrackChange(track)}
						iconOnly
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
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.selector-item {
		padding: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
	}

	@media (min-width: 520px) {
		.selectors {
			flex-direction: row;
			gap: 1rem;
			width: 100%;
		}

		.selector-item {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: flex-start;
			gap: 0;
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
