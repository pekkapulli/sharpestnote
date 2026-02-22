<script lang="ts">
	/**
	 * Main SightGame component - handles rendering and user interaction.
	 * Uses useSightGameLogic for all game state and logic.
	 */
	import { onMount } from 'svelte';
	import { type Mode } from '$lib/config/keys';
	import type { InstrumentId, Speed } from '$lib/config/types';
	import type { MelodyItem } from '$lib/config/melody';
	import { useSightGameLogic } from './useSightGameLogic.svelte';
	import Staff from '$lib/components/music/Staff.svelte';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import AmplitudeBar from '$lib/components/ui/AmplitudeBar.svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import { vexFlowToDisplay } from '$lib/util/noteConverter';
	import Modal from '$lib/components/ui/Modal.svelte';
	import TunerPanel from '$lib/components/tuner/TunerPanel.svelte';
	import tempoSlowIcon from '$lib/assets/tempo-slow.svg';
	import tempoMediumIcon from '$lib/assets/tempo-medium.svg';
	import tempoFastIcon from '$lib/assets/tempo-fast.svg';

	interface Props {
		instrument: InstrumentId;
		keyNote: string;
		mode: Mode;
		tempoBPM?: number;
		barLength?: number;
		melody: MelodyItem[];
		onMelodyComplete?: () => void;
		synthMode?: Speed | 'mute';
		showSynthToggle?: boolean;
		practiceTempi?: { [key in Speed]?: number };
	}

	let {
		instrument,
		keyNote,
		mode,
		tempoBPM = 100,
		barLength = 16,
		melody,
		onMelodyComplete,
		synthMode = 'medium',
		showSynthToggle = true,
		practiceTempi
	}: Props = $props();

	// Create game logic during component initialization (required for $effect)
	const game = useSightGameLogic({
		getInstrument: () => instrument,
		getKeyNote: () => keyNote,
		getMode: () => mode,
		getTempoBPM: () => tempoBPM,
		getMelody: () => melody,
		getOnMelodyComplete: () => onMelodyComplete
	});

	$effect(() => {
		game.setSynthEnabled(synthMode !== 'mute');
	});

	// Initialize tempo from practiceTempi on mount
	$effect(() => {
		if (synthMode !== 'mute' && practiceTempi) {
			const defaultTempi: { [key in Speed]: number } = { slow: 60, medium: 80, fast: 100 };
			const tempo = practiceTempi[synthMode as Speed] ?? defaultTempi[synthMode as Speed];
			game.updateSynthTempo(tempo);
		}
	});

	// Track microphone state
	let micStarted = $state(false);
	let showTunerModal = $state(false);
	// svelte-ignore state_referenced_locally
	let selectedSynthMode = $state<Speed | 'mute'>(synthMode);

	// Responsive sizing state
	let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);
	let staffMinWidth = $state(400);

	// Update minWidth based on viewport width
	$effect(() => {
		if (typeof window !== 'undefined') {
			const handleResize = () => {
				windowWidth = window.innerWidth;
				staffMinWidth = windowWidth < 640 ? Math.max(320, windowWidth - 40) : 400;
			};
			window.addEventListener('resize', handleResize);
			handleResize();
			return () => window.removeEventListener('resize', handleResize);
		}
	});

	// Setup tuner and keyboard shortcuts
	onMount(() => {
		game.tuner.checkSupport();
		game.tuner.refreshDevices();

		// Test helper: Arrow right to advance (for development)
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowRight' && game.melody() && game.currentIndex() < game.melody()!.length) {
				const currentNote = game.melody()![game.currentIndex()].note;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

	// Handle microphone start
	async function startListening() {
		try {
			if (game.tuner.state.needsUserGesture) {
				await game.tuner.resumeAfterGesture();
			} else {
				await game.tuner.start();
			}
			micStarted = true;
		} catch (err) {
			console.error('[SightGame] Failed to start listening:', err);
		}
	}

	function handleDeviceChange(deviceId: string) {
		game.tuner.state.selectedDeviceId = deviceId;
		startListening();
	}

	function handleTunerClose() {
		showTunerModal = false;
	}

	export function openTunerModal() {
		showTunerModal = true;
	}

	function setSynthMode(mode: Speed | 'mute') {
		selectedSynthMode = mode;
		if (mode === 'mute') {
			game.setSynthEnabled(false);
		} else {
			game.setSynthEnabled(true);
			// Get tempo from practiceTempi or use defaults
			const defaultTempi: { [key in Speed]: number } = { slow: 60, medium: 80, fast: 100 };
			const availableTempi = practiceTempi || defaultTempi;
			const tempo = availableTempi[mode] ?? defaultTempi[mode];
			// Update the tempo in game logic
			game.updateSynthTempo(tempo);
			// Stop any currently playing melody and start over with new tempo
			if (game.isPlayingMelody()) {
				game.stopMelody();
				// Wait a moment for the melody to stop before starting the new one
				setTimeout(() => game.playMelodyWithSynth(), 200);
			} else {
				game.playMelodyWithSynth();
			}
		}
	}
</script>

<div class="min-h-screen bg-off-white py-12">
	<div class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-0 sm:px-4">
		<header class="text-center">
			<div class="flex flex-col items-center justify-center gap-2">
				<p class="mx-auto mt-2 max-w-xl text-center text-slate-700">
					Play the notes shown on the {game.selectedInstrument.clef} staff with your {instrument}. A
					star means you hit the note perfectly!
					{#if game.keySignature}
						<span class="mt-1 block text-center text-sm text-slate-600">
							Key: {keyNote}
							{mode === 'natural_minor' ? 'minor' : 'major'}
						</span>
					{/if}
				</p>
			</div>
		</header>

		<div class={micStarted ? 'mx-auto mb-2 max-w-sm' : 'mb-6'}>
			<MicrophoneSelector
				tunerState={game.tuner.state}
				onStartListening={startListening}
				onDeviceChange={handleDeviceChange}
				onRefreshDevices={game.tuner.refreshDevices}
			/>
		</div>

		{#if game.melody() && micStarted}
			<!-- Staff display -->
			<div
				class={`flex flex-col items-center justify-center rounded-2xl bg-white p-0 py-4 shadow-sm transition-all duration-300 ${
					game.showSuccess() ? 'scale-105 ring-4 ring-green-400' : ''
				} sm:p-6 lg:p-8`}
			>
				<Staff
					bars={[game.melody()!]}
					minWidth={staffMinWidth}
					showTimeSignature={false}
					currentIndex={game.currentIndex()}
					animatingIndex={null}
					animationProgress={null}
					playheadPosition={game.playheadPosition()}
					ghostNote={game.ghostNoteDisplay()}
					cents={game.isPlayingMelody() ? null : game.tuner.state.cents}
					clef={game.selectedInstrument.clef}
					keySignature={game.keySignature}
					isCurrentNoteHit={game.isCurrentNoteHit()}
					isSequenceComplete={game.showSuccess()}
					{barLength}
					greatIntonationIndices={game.greatIntonationIndices()}
				/>
			</div>

			<!-- Synth toggle -->
			{#if showSynthToggle}
				<div class="flex flex-col items-center justify-center gap-0">
					<p class="text-sm font-semibold text-dark-blue">Speed</p>
					<PillSelector
						options={[
							{ value: 'slow', label: `Slow`, icon: tempoSlowIcon },
							{ value: 'medium', label: `Medium`, icon: tempoMediumIcon },
							{ value: 'fast', label: `Fast`, icon: tempoFastIcon },
							{ value: 'mute', label: `Mute` }
						]}
						selected={selectedSynthMode}
						onSelect={(speed: Speed | 'mute') => setSynthMode(speed)}
						iconOnly
					/>
				</div>
			{/if}

			<div class="mt-3 flex flex-wrap items-center justify-center gap-3">
				<button
					onclick={() => (showTunerModal = true)}
					class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-px hover:shadow"
					type="button"
				>
					Tune your {instrument}
				</button>
			</div>

			<!-- Note labels -->
			<div class="flex justify-center">
				<details class="rounded-lg bg-dark-blue px-8 py-4 text-center">
					<summary
						class="cursor-pointer text-sm tracking-[0.08em] text-slate-300 uppercase hover:text-white"
					>
						Show note names
					</summary>
					<div class="mt-3">
						<p class="text-sm tracking-[0.08em] text-slate-300 uppercase">Current melody</p>
						<p class="mt-1 text-xl font-bold text-white">
							{#each game.melody()! as item, i}
								<span
									class={i === game.currentIndex()
										? 'text-white'
										: i < game.currentIndex()
											? 'text-emerald-300'
											: 'text-slate-300'}
								>
									{item.note ? vexFlowToDisplay(item.note) : '--'}{i < game.melody()!.length - 1
										? ' '
										: ''}
								</span>
							{/each}
						</p>
						<div class="my-2 border-t border-slate-600"></div>
						<p class="text-sm tracking-[0.08em] text-slate-300 uppercase">Detected</p>
						<div class="mt-2 flex flex-col items-center gap-2">
							<p class="text-2xl font-bold text-slate-300">
								{game.tuner.state.note ? vexFlowToDisplay(game.tuner.state.note) : '--'}
							</p>
							<AmplitudeBar amplitude={game.tuner.state.amplitude} width={180} height={16} />
						</div>
					</div>
				</details>
			</div>

			<!-- Tuner status -->
			<div class="rounded-2xl bg-white p-4 text-center shadow-sm">
				<p class={`text-sm ${game.tuner.state.isListening ? 'text-green-700' : 'text-slate-600'}`}>
					{game.tuner.state.isListening
						? 'Listening... Play the note shown above.'
						: 'Microphone not active.'}
				</p>
				{#if game.showSuccess()}
					<p class="mt-2 text-lg font-bold text-green-600" role="status" aria-live="polite">
						✓ Correct!
					</p>
				{/if}

				<div class="mt-4 flex justify-center gap-2">
					<button
						type="button"
						onclick={() => {
							if (onMelodyComplete) onMelodyComplete();
						}}
						class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-px hover:bg-slate-200 hover:shadow"
					>
						Skip
					</button>
					<button
						type="button"
						onclick={() => game.playMelodyWithSynth()}
						disabled={game.isPlayingMelody()}
						class="rounded-lg bg-dark-blue px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-dark-blue-highlight hover:shadow disabled:cursor-not-allowed disabled:bg-slate-300"
					>
						{game.isPlayingMelody() ? 'Playing...' : 'Play Melody'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<Modal isOpen={showTunerModal} onClose={handleTunerClose} title="Tuner" maxWidth="lg">
	{#snippet children()}
		<TunerPanel
			fullPage={false}
			compact={true}
			showHeader={false}
			eyebrow={null}
			description={null}
			note={game.tuner.state.note}
			frequency={game.tuner.state.frequency}
			cents={game.tuner.state.cents}
			{instrument}
		/>
	{/snippet}
</Modal>
