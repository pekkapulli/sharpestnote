<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Staff from '$lib/components/music/Staff.svelte';
	import TheSharpestNoteLogo from '$lib/assets/The Sharpest Note Logo.svg';
	import type { MelodyItem } from '$lib/config/melody';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { createSynth } from '$lib/synth/useSynth.svelte';
	import {
		DEFAULT_A4,
		noteFromPitch,
		frequencyFromNoteNumber,
		centsOff,
		noteNameFromMidiDisplay
	} from '$lib/tuner/tune';
	import {
		keyOptions,
		modeOptions,
		modeIntervals,
		getKeySignature,
		type Mode
	} from '$lib/config/keys';
	import { instrumentConfigs, defaultInstrumentId } from '$lib/config/instruments';
	import type { InstrumentId } from '$lib/config/types';
	import { noteNameToMidi } from '$lib/util/noteNames.js';
	import { resolve } from '$app/paths';

	let { data } = $props();

	const availableInstruments = ['violin', 'viola', 'cello'];

	// Game state
	let gameState = $state<'idle' | 'playing' | 'listening' | 'result'>('idle');
	let targetNote = $state('');
	let score = $state(0);
	let streak = $state(0);
	let bestStreak = $state(0);
	let showInstructionsModal = $state(false);

	// Audio setup
	let selectedInstrument = $state<InstrumentId>(defaultInstrumentId);
	const tuner = createTuner({
		a4: DEFAULT_A4,
		accidental: 'sharp',
		autoGain: true,
		debounceTime: 0
	});
	const synth = createSynth({ waveform: 'sine', volume: 0.5, attack: 0.05, release: 0.3 });
	let micStarted = $state(false);

	// Visualizer
	let canvas: HTMLCanvasElement;
	let animationFrameId: number | null = null;

	let selectedScaleKey = $state('C');
	let selectedScaleMode = $state<Mode>('major');

	// Accuracy thresholds (in cents)
	const SUCCESS_THRESHOLD = 15; // Must get within 15 cents to proceed
	const ACCURACY_THRESHOLDS = {
		perfect: 10, // Within 10 cents
		great: 15 // Within 15 cents
	};
	const LISTEN_COOLDOWN_MS = 350;
	const SUCCESS_FLASH_MS = 700;
	let isListeningGateOpen = $state(true);
	let listeningGateTimeout: ReturnType<typeof setTimeout> | null = null;
	let successFlashActive = $state(false);
	let successFlashTimeout: ReturnType<typeof setTimeout> | null = null;

	// Update tuner instrument when selection changes
	$effect(() => {
		tuner.instrument = selectedInstrument;
	});

	onMount(() => {
		tuner.checkSupport();
		tuner.refreshDevices();
		startVisualizer();

		// Handle window resize
		const handleResize = () => {
			if (canvas) {
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;
			}
		};
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	onDestroy(() => {
		tuner.destroy();
		stopVisualizer();
		if (listeningGateTimeout) {
			clearTimeout(listeningGateTimeout);
			listeningGateTimeout = null;
		}
		if (successFlashTimeout) {
			clearTimeout(successFlashTimeout);
			successFlashTimeout = null;
		}
	});

	// Visualizer functions
	function startVisualizer() {
		if (!canvas) return;

		// Set initial canvas size
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		animateVisualizer();
	}

	function stopVisualizer() {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	function animateVisualizer() {
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const width = canvas.width;
		const height = canvas.height;
		const centerX = width / 2;
		const centerY = height / 2;

		// Clear with a slight fade for trails
		ctx.fillStyle = 'rgba(249, 248, 244, 0.28)';
		ctx.fillRect(0, 0, width, height);

		const amplitude = tuner.state.amplitude;
		const spectrum = tuner.state.spectrum;
		const hasPitch = tuner.state.hasPitch;

		// Calculate base radius that scales with amplitude
		const baseRadius = Math.max(100, Math.min(400, amplitude * 800));
		const pulseSpeed = Date.now() / 1000;

		// Draw outer rings that pulse with amplitude
		for (let i = 0; i < 3; i++) {
			const ringRadius = baseRadius + i * 80 + Math.sin(pulseSpeed * 2 + i) * 20;
			const opacity = amplitude * 0.3 * (1 - i * 0.3);

			// Gradient based on game state
			const gradient = ctx.createRadialGradient(
				centerX,
				centerY,
				ringRadius * 0.5,
				centerX,
				centerY,
				ringRadius
			);
			if (successFlashActive) {
				gradient.addColorStop(0, `rgba(35, 154, 103, ${opacity * 0.85})`);
				gradient.addColorStop(0.55, `rgba(28, 124, 84, ${opacity * 0.75})`);
				gradient.addColorStop(1, `rgba(35, 154, 103, ${opacity * 0.55})`);
			} else if (gameState === 'listening' && hasPitch) {
				gradient.addColorStop(0, `rgba(246, 216, 104, ${opacity * 0.5})`);
				gradient.addColorStop(0.55, `rgba(249, 248, 244, ${opacity * 0.8})`);
				gradient.addColorStop(1, `rgba(246, 216, 104, ${opacity * 0.35})`);
			} else if (gameState === 'result') {
				gradient.addColorStop(0, `rgba(246, 216, 104, ${opacity * 0.48})`);
				gradient.addColorStop(0.55, `rgba(249, 248, 244, ${opacity * 0.75})`);
				gradient.addColorStop(1, `rgba(246, 216, 104, ${opacity * 0.3})`);
			} else {
				gradient.addColorStop(0, `rgba(249, 248, 244, ${opacity * 0.75})`);
				gradient.addColorStop(1, `rgba(246, 216, 104, ${opacity * 0.25})`);
			}

			ctx.strokeStyle = gradient;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
			ctx.stroke();
		}

		// Draw spectrum bars if available
		if (spectrum && spectrum.length > 0) {
			const numBars = Math.min(64, spectrum.length);
			const barSpacing = (Math.PI * 2) / numBars;
			const spectrumRadius = baseRadius + 100;

			for (let i = 0; i < numBars; i++) {
				const angle = i * barSpacing + pulseSpeed * 0.5;
				const value = spectrum[Math.floor((i * spectrum.length) / numBars)] / 255;
				const barLength = value * 100 * (1 + amplitude);

				const x1 = centerX + Math.cos(angle) * spectrumRadius;
				const y1 = centerY + Math.sin(angle) * spectrumRadius;
				const x2 = centerX + Math.cos(angle) * (spectrumRadius + barLength);
				const y2 = centerY + Math.sin(angle) * (spectrumRadius + barLength);

				// Soft yellow/off-white spectrum accents
				const lightness = 82 + (i / numBars) * 10;
				ctx.strokeStyle = successFlashActive
					? `hsla(145, 55%, 48%, ${value * 0.5})`
					: `hsla(48, 70%, ${lightness}%, ${value * 0.35})`;
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(x1, y1);
				ctx.lineTo(x2, y2);
				ctx.stroke();

				// Add glow particles at bar ends
				if (value > 0.3) {
					ctx.fillStyle = successFlashActive
						? `hsla(145, 58%, 58%, ${value * 0.45})`
						: `hsla(48, 75%, 88%, ${value * 0.28})`;
					ctx.beginPath();
					ctx.arc(x2, y2, 2 + value * 3, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		}

		// Draw center circle that pulses with amplitude
		const centerRadius = 30 + amplitude * 50;
		const centerGradient = ctx.createRadialGradient(
			centerX,
			centerY,
			0,
			centerX,
			centerY,
			centerRadius
		);

		if (successFlashActive) {
			centerGradient.addColorStop(0, `rgba(35, 154, 103, ${0.45 + amplitude * 0.35})`);
			centerGradient.addColorStop(1, `rgba(28, 124, 84, ${0.2 + amplitude * 0.25})`);
		} else if (gameState === 'listening' && hasPitch) {
			centerGradient.addColorStop(0, `rgba(246, 216, 104, ${0.3 + amplitude * 0.25})`);
			centerGradient.addColorStop(1, `rgba(249, 248, 244, ${amplitude * 0.28})`);
		} else if (gameState === 'result') {
			centerGradient.addColorStop(0, 'rgba(246, 216, 104, 0.36)');
			centerGradient.addColorStop(1, 'rgba(249, 248, 244, 0.24)');
		} else {
			centerGradient.addColorStop(0, `rgba(249, 248, 244, ${0.26 + amplitude * 0.2})`);
			centerGradient.addColorStop(1, `rgba(246, 216, 104, ${amplitude * 0.2})`);
		}

		ctx.fillStyle = centerGradient;
		ctx.beginPath();
		ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
		ctx.fill();

		// Continue animation
		animationFrameId = requestAnimationFrame(animateVisualizer);
	}

	async function startListening() {
		try {
			if (tuner.state.needsUserGesture) {
				await tuner.resumeAfterGesture();
			} else {
				await tuner.start();
			}
			micStarted = true;
		} catch (err) {
			console.error('[ToneLab] Failed to start listening:', err);
		}
	}

	function handleDeviceChange(deviceId: string) {
		tuner.state.selectedDeviceId = deviceId;
		startListening();
	}

	function midiToNoteName(midi: number): string {
		const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
		const octave = Math.floor(midi / 12) - 1;
		const noteName = noteNames[midi % 12];
		return `${noteName}${octave}`;
	}

	function toVexFlowNote(noteName: string | null): string | null {
		if (!noteName) return null;
		const noteMatch = /^([A-G])([#b]?)(\d)$/.exec(noteName);
		if (!noteMatch) return null;

		const [, letter, accidental, octave] = noteMatch;
		return `${letter.toLowerCase()}${accidental}/${octave}`;
	}

	const NOTE_TO_PITCH_CLASS: Record<string, number> = {
		C: 0,
		'B#': 0,
		'C#': 1,
		'D♭': 1,
		D: 2,
		'D#': 3,
		'E♭': 3,
		E: 4,
		'F♭': 4,
		F: 5,
		'E#': 5,
		'F#': 6,
		'G♭': 6,
		G: 7,
		'G#': 8,
		'A♭': 8,
		A: 9,
		'A#': 10,
		'B♭': 10,
		B: 11,
		'C♭': 11
	};

	function getScalePitchClasses(key: string, mode: Mode): number[] {
		const keySignature = getKeySignature(key, mode);
		const tonicPitchClass = NOTE_TO_PITCH_CLASS[keySignature.note] ?? NOTE_TO_PITCH_CLASS[key] ?? 0;
		const intervals = modeIntervals[mode];
		const scalePitchClasses = [tonicPitchClass];

		let current = tonicPitchClass;
		for (const interval of intervals.slice(0, -1)) {
			current = (current + interval) % 12;
			scalePitchClasses.push(current);
		}

		return scalePitchClasses;
	}

	function generateRandomNote() {
		const keySignature = getKeySignature(selectedScaleKey, selectedScaleMode);
		const tonicPitchClass =
			NOTE_TO_PITCH_CLASS[keySignature.note] ?? NOTE_TO_PITCH_CLASS[selectedScaleKey] ?? 0;
		const twoOctaveMin = 48 + tonicPitchClass;
		const twoOctaveMax = twoOctaveMin + 24;

		const selectedInstrumentConfig = instrumentConfigs.find(
			(instrument) => instrument.id === selectedInstrument
		);
		const instrumentMin = selectedInstrumentConfig?.bottomNote
			? noteNameToMidi(selectedInstrumentConfig.bottomNote)
			: null;
		const instrumentMax = selectedInstrumentConfig?.topNote
			? noteNameToMidi(selectedInstrumentConfig.topNote)
			: null;

		const guidedMin =
			instrumentMin !== null
				? Math.max(twoOctaveMin, Math.min(instrumentMin, twoOctaveMax))
				: twoOctaveMin;
		const guidedMax =
			instrumentMax !== null
				? Math.min(twoOctaveMax, Math.max(instrumentMax, twoOctaveMin))
				: twoOctaveMax;

		const scalePitchClasses = new Set(getScalePitchClasses(selectedScaleKey, selectedScaleMode));
		const availableNotes: number[] = [];
		const instrumentRangeNotes: number[] = [];
		const twoOctaveNotes: number[] = [];

		for (let midi = guidedMin; midi <= guidedMax; midi++) {
			if (scalePitchClasses.has(midi % 12)) {
				availableNotes.push(midi);
			}
		}

		if (instrumentMin !== null && instrumentMax !== null) {
			const low = Math.min(instrumentMin, instrumentMax);
			const high = Math.max(instrumentMin, instrumentMax);
			for (let midi = low; midi <= high; midi++) {
				if (scalePitchClasses.has(midi % 12)) {
					instrumentRangeNotes.push(midi);
				}
			}
		}

		for (let midi = twoOctaveMin; midi <= twoOctaveMax; midi++) {
			if (scalePitchClasses.has(midi % 12)) {
				twoOctaveNotes.push(midi);
			}
		}

		const candidateNotes =
			availableNotes.length > 0
				? availableNotes
				: instrumentRangeNotes.length > 0
					? instrumentRangeNotes
					: twoOctaveNotes;

		const fallbackNote =
			Math.floor(Math.random() * (twoOctaveMax - twoOctaveMin + 1)) + twoOctaveMin;
		const midiNote =
			candidateNotes.length > 0
				? candidateNotes[Math.floor(Math.random() * candidateNotes.length)]
				: fallbackNote;
		targetNote = midiToNoteName(midiNote);
	}

	async function playTargetNote() {
		gameState = 'playing';

		// Play the note
		await synth.playNote({ note: targetNote, length: 8 }, 120); // Half note at 120 BPM
		isListeningGateOpen = false;
		if (listeningGateTimeout) {
			clearTimeout(listeningGateTimeout);
			listeningGateTimeout = null;
		}
		listeningGateTimeout = setTimeout(() => {
			isListeningGateOpen = true;
			listeningGateTimeout = null;
		}, LISTEN_COOLDOWN_MS);

		// After playing, start listening
		startListeningPhase();
	}

	function startListeningPhase() {
		gameState = 'listening';
	}

	// Helper to get current detected note and cents from frequency
	function getDetectedNoteInfo() {
		const frequency = tuner.state.frequency;
		const hasPitch = tuner.state.hasPitch;

		if (!hasPitch || !frequency || frequency <= 0) return null;

		const midi = noteFromPitch(frequency, DEFAULT_A4);
		const target = frequencyFromNoteNumber(midi, DEFAULT_A4);
		const cents = centsOff(frequency, target);
		const noteName = noteNameFromMidiDisplay(midi, 'sharp');

		return { noteName, cents };
	}

	// Reactive current note info for display
	const currentNoteInfo = $derived(getDetectedNoteInfo());
	const selectedKeySignature = $derived(getKeySignature(selectedScaleKey, selectedScaleMode));
	const targetStaffBars = $derived.by((): MelodyItem[][] => {
		const vexNote = toVexFlowNote(targetNote);
		if (!vexNote || gameState === 'idle') return [];
		return [[{ note: vexNote, length: 16 as const }]];
	});
	const detectedGhostNote = $derived.by(() => {
		if (gameState !== 'listening' || !currentNoteInfo) return null;
		return toVexFlowNote(currentNoteInfo.noteName);
	});
	const detectedCents = $derived.by(() => {
		if (gameState !== 'listening' || !currentNoteInfo) return null;
		return currentNoteInfo.cents;
	});
	const selectedClef = $derived(
		instrumentConfigs.find((instrument) => instrument.id === selectedInstrument)?.clef ?? 'treble'
	);

	// Continuously check if player has achieved the target
	$effect(() => {
		if (gameState !== 'listening') return;
		if (!isListeningGateOpen) return;

		const noteInfo = getDetectedNoteInfo();
		if (!noteInfo) return;

		const { noteName: userNote, cents: userCents } = noteInfo;

		console.log(`[ToneLab] Detected note: ${userNote}, Cents off: ${userCents.toFixed(2)}`);

		// Check if the note name matches
		const userNoteName = userNote.split(/\d/)[0];
		const targetNoteName = targetNote.split(/\d/)[0];

		if (userNoteName !== targetNoteName) return;

		// Check if within success threshold
		const centsDiff = Math.abs(userCents);
		if (centsDiff <= SUCCESS_THRESHOLD) {
			// Success! Evaluate and show result
			evaluateAttempt(centsDiff);
		}
	});

	function evaluateAttempt(centsDiff: number) {
		if (successFlashActive) return;

		gameState = 'result';

		// Determine accuracy level
		if (centsDiff <= ACCURACY_THRESHOLDS.perfect) {
			score += 100;
		} else if (centsDiff <= ACCURACY_THRESHOLDS.great) {
			score += 75;
		} else {
			// Within 15 cents but not great
			score += 50;
		}

		streak++;

		if (streak > bestStreak) {
			bestStreak = streak;
		}

		isListeningGateOpen = false;
		successFlashActive = true;
		if (successFlashTimeout) {
			clearTimeout(successFlashTimeout);
			successFlashTimeout = null;
		}
		successFlashTimeout = setTimeout(() => {
			successFlashActive = false;
			successFlashTimeout = null;
			nextRound();
		}, SUCCESS_FLASH_MS);
	}

	function nextRound() {
		generateRandomNote();
		playTargetNote();
		tuner.expectedMidi = noteNameToMidi(targetNote);
	}

	function startGame() {
		if (!micStarted) {
			startListening();
			setTimeout(() => {
				generateRandomNote();
				playTargetNote();
				tuner.expectedMidi = noteNameToMidi(targetNote);
			}, 500);
		} else {
			generateRandomNote();
			playTargetNote();
			tuner.expectedMidi = noteNameToMidi(targetNote);
		}
	}
</script>

<SharePreview data={data.sharePreviewData} />

<!-- Audio Visualizer Background -->
<canvas
	bind:this={canvas}
	class="pointer-events-none fixed inset-0 z-0 h-full w-full"
	style="background: radial-gradient(circle at 20% 20%, rgba(246, 216, 104, 0.2), transparent 46%), radial-gradient(circle at 80% 30%, rgba(249, 248, 244, 0.45), transparent 52%), linear-gradient(to bottom right, #f9f8f4, #f9f8f4, #fbfaf6);"
></canvas>

{#if targetStaffBars.length > 0}
	<div class="pointer-events-none fixed inset-0 z-5 flex items-center justify-center px-4">
		<div
			class={`flex h-80 w-80 items-center justify-center rounded-full bg-off-white shadow-md transition-all duration-200 ${successFlashActive ? 'success-ring ring-8 ring-brand-green' : ''}`}
		>
			<div class="w-45">
				<Staff
					bars={targetStaffBars}
					keySignature={selectedKeySignature}
					clef={selectedClef}
					ghostNote={detectedGhostNote}
					cents={detectedCents}
					currentIndex={0}
					isCurrentNoteHit={successFlashActive}
					showTimeSignature={false}
					showAllBlack={false}
					minWidth={180}
				/>
			</div>
		</div>
	</div>
{/if}

<div class="relative z-10 min-h-screen py-12">
	<div class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4">
		<!-- Header -->
		<header class="text-center">
			<img src={TheSharpestNoteLogo} alt="The Sharpest Note" class="mx-auto mb-4 w-52" />
			<h1
				class="bg-linear-to-r from-dark-blue via-dark-blue-highlight to-brand-green bg-clip-text text-5xl font-extrabold text-transparent"
			>
				Tone Lab
			</h1>
			<p class="mt-2 text-lg text-dark-blue/85">Practice your pitch accuracy!</p>
			<a
				href={resolve('/units')}
				class="mt-1 inline-block text-sm text-dark-blue/55 underline decoration-dark-blue/25 underline-offset-2 transition hover:text-dark-blue/75"
			>
				Explore The Sharpest Note units
			</a>
			<div class="mt-4 flex justify-center">
				<button
					type="button"
					onclick={() => (showInstructionsModal = true)}
					class="flex h-10 w-10 items-center justify-center rounded-full border border-dark-blue/25 bg-off-white/95 text-lg font-bold text-dark-blue shadow-sm backdrop-blur-sm transition hover:bg-white"
					aria-label="Open instructions"
				>
					?
				</button>
			</div>
		</header>

		<!-- Microphone Setup -->
		{#if !micStarted || gameState === 'idle'}
			<div class="mx-auto w-full max-w-md">
				<MicrophoneSelector
					tunerState={tuner.state}
					onStartListening={startListening}
					onDeviceChange={handleDeviceChange}
					onRefreshDevices={tuner.refreshDevices}
				/>
			</div>
		{/if}

		<!-- Instrument Selector -->
		{#if gameState === 'idle'}
			<div class="mx-auto w-full max-w-md">
				<label for="instrument" class="mb-2 block text-sm font-medium text-dark-blue/85"
					>Your instrument</label
				>
				<select
					id="instrument"
					bind:value={selectedInstrument}
					class="block w-full rounded-lg border border-dark-blue/25 bg-off-white/95 px-4 py-2 text-dark-blue shadow-sm backdrop-blur-sm transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/40 focus:outline-none"
				>
					{#each instrumentConfigs.filter( (instrument) => availableInstruments.includes(instrument.id) ) as instrument (instrument.id)}
						<option value={instrument.id}>{instrument.label}</option>
					{/each}
				</select>
			</div>

			<!-- Scale Selector -->
			<div class="mx-auto w-full max-w-md">
				<div class="mb-2 block text-sm font-medium text-dark-blue/85">Scale</div>
				<div class="grid grid-cols-2 gap-2">
					<select
						bind:value={selectedScaleKey}
						class="block w-full rounded-lg border border-dark-blue/25 bg-off-white/95 px-4 py-2 text-dark-blue shadow-sm backdrop-blur-sm transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/40 focus:outline-none"
					>
						{#each keyOptions as keyOption (keyOption.value)}
							<option value={keyOption.value}>{keyOption.label}</option>
						{/each}
					</select>
					<select
						bind:value={selectedScaleMode}
						class="block w-full rounded-lg border border-dark-blue/25 bg-off-white/95 px-4 py-2 text-dark-blue shadow-sm backdrop-blur-sm transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/40 focus:outline-none"
					>
						{#each modeOptions as modeOption (modeOption.mode)}
							<option value={modeOption.mode}>{modeOption.label}</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}

		<!-- Score Display -->
		{#if gameState !== 'idle'}
			<div
				class="mx-auto flex w-full max-w-2xl items-center justify-center gap-6 text-sm font-semibold tracking-wide text-dark-blue/70 uppercase"
			>
				<div>
					Score <span class="ml-1 text-2xl font-bold text-dark-blue normal-case">{score}</span>
				</div>
				<div class="text-dark-blue/30">•</div>
				<div>
					Streak <span class="ml-1 text-2xl font-bold text-brand-green normal-case">{streak}</span>
				</div>
				<div class="text-dark-blue/30">•</div>
				<div>
					Best <span class="ml-1 text-2xl font-bold text-dark-blue-highlight normal-case"
						>{bestStreak}</span
					>
				</div>
			</div>
		{/if}

		<!-- Game Area -->
		<div class="mx-auto w-full max-w-2xl">
			{#if gameState === 'idle'}
				<div class="p-12 text-center">
					<div class="mb-6 text-6xl">🎵</div>
					<h2 class="mb-4 text-2xl font-bold text-dark-blue">Ready to Practice?</h2>
					<p class="mb-8 text-dark-blue/75">
						Listen to the target note, then sing or play it back. Keep trying until you match it -
						no time pressure!
					</p>
					<button
						onclick={startGame}
						disabled={!micStarted}
						class="rounded-full bg-linear-to-r from-brand-green to-dark-blue px-8 py-4 text-lg font-bold text-off-white transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
					>
						Start Practice
					</button>
				</div>
			{:else if gameState === 'playing' || gameState === 'listening'}
				<div class="h-24" aria-hidden="true"></div>
			{:else if gameState === 'result'}
				<div class="h-24" aria-hidden="true"></div>
			{/if}
		</div>
	</div>
</div>

<Modal
	isOpen={showInstructionsModal}
	onClose={() => (showInstructionsModal = false)}
	title="How to Play"
	maxWidth="lg"
>
	<div class="text-dark-blue/85">
		<ol class="space-y-3">
			<li class="flex gap-3">
				<span class="font-bold text-brand-green">1.</span>
				<span>Click "Start Practice" to begin</span>
			</li>
			<li class="flex gap-3">
				<span class="font-bold text-brand-green">2.</span>
				<span>Listen carefully to the target note being played</span>
			</li>
			<li class="flex gap-3">
				<span class="font-bold text-brand-green">3.</span>
				<span>Play the same note - keep trying until you match it</span>
			</li>
			<li class="flex gap-3">
				<span class="font-bold text-brand-green">4.</span>
				<span>The game automatically advances when you nail it!</span>
			</li>
		</ol>

		<div class="mt-6 rounded-lg bg-yellow/20 p-4">
			<div class="font-bold text-dark-blue">How it works:</div>
			<ul class="mt-2 space-y-1 text-sm text-dark-blue/85">
				<li>🎯 Keep playing until you get within <strong>±15 cents</strong></li>
				<li>🎵 <strong>Perfect</strong>: ±10 cents = 100 points</li>
				<li>✨ <strong>Great</strong>: ±15 cents = 75 points</li>
				<li>💪 <strong>Good</strong>: Close enough = 50 points</li>
				<li>⏱️ No time limit - practice until you nail it!</li>
			</ul>
		</div>
	</div>
</Modal>

<style>
	@keyframes successRingPulse {
		0% {
			box-shadow: 0 0 0 0 rgba(35, 154, 103, 0.6);
		}
		100% {
			box-shadow: 0 0 0 18px rgba(35, 154, 103, 0);
		}
	}

	.success-ring {
		animation: successRingPulse 700ms ease-out;
	}
</style>
