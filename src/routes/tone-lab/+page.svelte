<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
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
	import { keyOptions, modeIntervals, getKeySignature, type Mode } from '$lib/config/keys';
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
		debounceTime: 0,
		maxGain: 500
	});
	const synth = createSynth({
		waveform: 'sine',
		volume: 0.5,
		attack: 0.05,
		release: 0.2,
		reverbDecay: 0.2
	});
	let micStarted = $state(false);

	// Visualizer
	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	let pageRootElement = $state<HTMLDivElement | undefined>(undefined);
	let staffCircleElement = $state<HTMLDivElement | undefined>(undefined);
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
	const SUCCESS_FLASH_MS = 1800;
	let isListeningGateOpen = $state(true);
	let listeningGateTimeout: ReturnType<typeof setTimeout> | null = null;
	let successFlashActive = $state(false);
	let successFlashTimeout: ReturnType<typeof setTimeout> | null = null;
	let successRippleStartMs = $state<number | null>(null);

	// Update the instrument for the tuner when selection changes
	$effect(() => {
		tuner.instrument = selectedInstrument;
	});

	onMount(() => {
		tuner.checkSupport();
		tuner.refreshDevices();

		// Handle window resize
		const handleResize = () => {
			if (canvas) {
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;
			}
			updateCanvasAnchor();
		};
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	// Start visualizer when canvas becomes available
	$effect(() => {
		if (canvas && !animationFrameId) {
			startVisualizer();
		}
	});

	$effect(() => {
		const shouldReposition = gameState !== 'idle' || targetStaffBars.length >= 0;
		if (shouldReposition && canvas && pageRootElement && staffCircleElement) {
			requestAnimationFrame(() => {
				updateCanvasAnchor();
			});
		}
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

		// Set canvas to large size for visualization
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		updateCanvasAnchor();

		animateVisualizer();
	}

	function stopVisualizer() {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	function updateCanvasAnchor() {
		if (!canvas || !pageRootElement || !staffCircleElement) return;

		const rootRect = pageRootElement.getBoundingClientRect();
		const circleRect = staffCircleElement.getBoundingClientRect();
		const centerX = circleRect.left - rootRect.left + circleRect.width / 2;
		const centerY = circleRect.top - rootRect.top + circleRect.height / 2;

		canvas.style.left = `${centerX}px`;
		canvas.style.top = `${centerY}px`;
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
		ctx.fillStyle = 'rgba(249, 248, 244, 0.16)';
		ctx.fillRect(0, 0, width, height);

		const amplitude = tuner.state.amplitude;
		const spectrum = tuner.state.spectrum;
		const hasPitch = tuner.state.hasPitch;
		const now = performance.now();

		// Calculate base radius that scales with amplitude
		const baseRadius = Math.max(100, Math.min(400, amplitude * 800));
		const pulseSpeed = Date.now() / 1000;

		// Draw outer rings that pulse with amplitude
		for (let i = 0; i < 3; i++) {
			const ringRadius = baseRadius + i * 80 + Math.sin(pulseSpeed * 2 + i) * 20;
			const opacity = Math.max(0.14, amplitude * 0.46 * (1 - i * 0.24));

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
				gradient.addColorStop(0, `rgba(35, 154, 103, ${opacity * 0.45})`);
				gradient.addColorStop(0.55, `rgba(28, 124, 84, ${opacity * 0.35})`);
				gradient.addColorStop(1, `rgba(35, 154, 103, ${opacity * 0.2})`);
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
			ctx.lineWidth = 3.5;
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
				const barOpacity = Math.max(0.16, value * 0.62);
				ctx.strokeStyle = successFlashActive
					? `hsla(145, 55%, 48%, ${barOpacity})`
					: `hsla(48, 70%, ${lightness}%, ${barOpacity * 0.92})`;
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(x1, y1);
				ctx.lineTo(x2, y2);
				ctx.stroke();

				// Add glow particles at bar ends
				if (value > 0.3) {
					const particleOpacity = Math.max(0.2, value * 0.58);
					ctx.fillStyle = successFlashActive
						? `hsla(145, 58%, 58%, ${particleOpacity})`
						: `hsla(48, 75%, 88%, ${particleOpacity * 0.82})`;
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
			centerGradient.addColorStop(0, `rgba(35, 154, 103, ${0.28 + amplitude * 0.16})`);
			centerGradient.addColorStop(1, `rgba(28, 124, 84, ${0.14 + amplitude * 0.1})`);
		} else if (gameState === 'listening' && hasPitch) {
			centerGradient.addColorStop(0, `rgba(246, 216, 104, ${0.42 + amplitude * 0.26})`);
			centerGradient.addColorStop(1, `rgba(249, 248, 244, ${0.18 + amplitude * 0.24})`);
		} else if (gameState === 'result') {
			centerGradient.addColorStop(0, 'rgba(246, 216, 104, 0.46)');
			centerGradient.addColorStop(1, 'rgba(249, 248, 244, 0.3)');
		} else {
			centerGradient.addColorStop(0, `rgba(249, 248, 244, ${0.34 + amplitude * 0.2})`);
			centerGradient.addColorStop(1, `rgba(246, 216, 104, ${0.16 + amplitude * 0.2})`);
		}

		ctx.fillStyle = centerGradient;
		ctx.beginPath();
		ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
		ctx.fill();

		// Pitch guidance: rings flow up when pitch is low, down when pitch is high
		const guidanceCents = getTargetGuidanceCents();
		if (
			!successFlashActive &&
			guidanceCents !== null &&
			gameState === 'listening' &&
			isListeningGateOpen
		) {
			const normalized = Math.min(1, Math.abs(guidanceCents) / 100); // max out at ±100 cents
			const direction = guidanceCents < 0 ? -1 : 1; // low -> up, high -> down
			const ringCount = 3;

			for (let i = 0; i < ringCount; i++) {
				const phase = (now / 900 + i / ringCount) % 1;
				const travel = (16 + normalized * 80) * phase;
				const offsetY = direction * travel;
				const ringRadius = centerRadius + 8 + phase * (24 + normalized * 56);
				const alpha = (1 - phase) * (0.06 + normalized * 0.36);

				ctx.strokeStyle = `rgba(246, 216, 104, ${alpha})`;
				ctx.lineWidth = 1 + normalized * 2.2;
				ctx.beginPath();
				ctx.arc(centerX, centerY + offsetY, ringRadius, 0, Math.PI * 2);
				ctx.stroke();
			}
		}

		// Success ripple: water-drop style ring from center, expanding and fading
		if (successRippleStartMs !== null) {
			const rippleDuration = SUCCESS_FLASH_MS;
			const elapsed = now - successRippleStartMs;
			const progress = Math.min(1, elapsed / rippleDuration);

			if (progress >= 1) {
				successRippleStartMs = null;
			} else {
				const eased = 1 - Math.pow(1 - progress, 3);
				const maxRadius = Math.max(width, height) * 0.5;
				const rippleRadius = centerRadius + eased * maxRadius;
				const rippleAlpha = (1 - progress) * 0.2;

				ctx.strokeStyle = `rgba(35, 154, 103, ${rippleAlpha})`;
				ctx.lineWidth = 1 + (1 - progress) * 2.5;
				ctx.beginPath();
				ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
				ctx.stroke();

				ctx.strokeStyle = `rgba(35, 154, 103, ${rippleAlpha * 0.35})`;
				ctx.lineWidth = 0.8 + (1 - progress) * 1.8;
				ctx.beginPath();
				ctx.arc(centerX, centerY, rippleRadius * 0.8, 0, Math.PI * 2);
				ctx.stroke();
			}
		}

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

		const selectedInstrumentConfig = instrumentConfigs.find(
			(instrument) => instrument.id === selectedInstrument
		);
		const instrumentMin = selectedInstrumentConfig?.bottomNote
			? noteNameToMidi(selectedInstrumentConfig.bottomNote)
			: null;
		const instrumentMax = selectedInstrumentConfig?.topNote
			? noteNameToMidi(selectedInstrumentConfig.topNote)
			: null;

		// Start the two-octave window from the first tonic at or above the instrument's bottom note
		const bottomMidi = instrumentMin ?? 48; // default to C3 if no instrument specified
		const bottomPitchClass = bottomMidi % 12;
		const semitonesToTonic = (tonicPitchClass - bottomPitchClass + 12) % 12;
		const twoOctaveMin = bottomMidi + semitonesToTonic;
		const twoOctaveMax = twoOctaveMin + 24;

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

		// Close the listening gate before playing
		isListeningGateOpen = false;
		if (listeningGateTimeout) {
			clearTimeout(listeningGateTimeout);
			listeningGateTimeout = null;
		}

		// Play the note
		await synth.playNote({ note: targetNote, length: 8 }, 120); // Half note at 120 BPM

		// After playing, start listening phase
		startListeningPhase();

		// Open the gate after a cooldown (to avoid detecting synth echo/resonance)
		listeningGateTimeout = setTimeout(() => {
			isListeningGateOpen = true;
			listeningGateTimeout = null;
		}, LISTEN_COOLDOWN_MS);
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

	function getTargetGuidanceCents(): number | null {
		if (gameState !== 'listening') return null;
		if (!targetNote) return null;

		const frequency = tuner.state.frequency;
		const hasPitch = tuner.state.hasPitch;
		if (!hasPitch || !frequency || frequency <= 0) return null;

		const targetMidi = noteNameToMidi(targetNote);
		if (targetMidi === null) return null;
		const targetFrequency = frequencyFromNoteNumber(targetMidi, DEFAULT_A4);
		const centsFromTarget = centsOff(frequency, targetFrequency);

		return Math.max(-100, Math.min(100, centsFromTarget));
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
		successRippleStartMs = performance.now();
		if (successFlashTimeout) {
			clearTimeout(successFlashTimeout);
			successFlashTimeout = null;
		}
		successFlashTimeout = setTimeout(() => {
			successFlashActive = false;
			successRippleStartMs = null;
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

	function refreshTargetForScaleChange() {
		generateRandomNote();
		tuner.expectedMidi = noteNameToMidi(targetNote);

		if (gameState !== 'idle') {
			playTargetNote();
		}
	}

	function handleScaleKeyChange(nextKey: string) {
		if (selectedScaleKey === nextKey) return;
		selectedScaleKey = nextKey;
		refreshTargetForScaleChange();
	}

	function handleScaleModeChange(nextMode: Mode) {
		if (selectedScaleMode === nextMode) return;
		selectedScaleMode = nextMode;
		refreshTargetForScaleChange();
	}
</script>

<SharePreview data={data.sharePreviewData} />

<div bind:this={pageRootElement} class="relative min-h-screen w-full py-12">
	{#if targetStaffBars.length > 0}
		<canvas
			bind:this={canvas}
			class="pointer-events-none absolute top-1/2 left-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
			style="background: radial-gradient(circle at 20% 20%, rgba(246, 216, 104, 0.2), transparent 46%), radial-gradient(circle at 80% 30%, rgba(249, 248, 244, 0.45), transparent 52%), max-width: none;"
		></canvas>
	{/if}

	<div class="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-8 px-4">
		<!-- Header -->
		<header class="z-20 text-center">
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
				Explore The Sharpest Note teaching materials
			</a>
			<div class="mt-4 flex justify-center">
				<button
					type="button"
					onclick={() => (showInstructionsModal = true)}
					class="flex h-10 items-center justify-center rounded-full border border-dark-blue/25 bg-white px-4 text-lg text-dark-blue shadow-sm backdrop-blur-sm transition hover:bg-white"
					aria-label="Open instructions"
				>
					<span class="aria-hidden: display-block mr-2 text-2xl font-bold">?</span>How to play
				</button>
			</div>
		</header>

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
		{/if}

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
		{#if gameState === 'idle'}
			<div class="mx-auto w-full max-w-2xl">
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
						class="rounded-full bg-brand-green px-8 py-4 text-lg font-bold text-off-white transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
					>
						Start
					</button>
				</div>
			</div>
		{/if}

		<!-- Game Arena - Canvas behind staff circle -->
		{#if targetStaffBars.length > 0}
			<div class="relative mx-auto w-full py-4">
				<!-- Staff circle and controls overlay -->
				<div
					class="pointer-events-none relative z-10 flex flex-col items-center justify-center gap-6 py-4"
				>
					<div class="flex flex-col items-center gap-4">
						<!-- Scale instruction -->
						{#if gameState !== 'idle'}
							<p class="pointer-events-none text-sm font-medium text-dark-blue/70">
								Click around the circle to change scale
							</p>
						{/if}

						<div bind:this={staffCircleElement} class="pointer-events-auto relative h-80 w-80">
							<!-- Circular scale key buttons -->
							{#each keyOptions as keyOption, index (keyOption.value)}
								{@const angle = (index / keyOptions.length) * 2 * Math.PI - Math.PI / 2}
								{@const radius = 140}
								{@const x = Math.cos(angle) * radius}
								{@const y = Math.sin(angle) * radius}
								<button
									onclick={() => handleScaleKeyChange(keyOption.value)}
									class="absolute flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-200 {selectedScaleKey ===
									keyOption.value
										? 'scale-110 border-dark-blue bg-dark-blue text-off-white shadow-lg'
										: 'border-dark-blue/30 bg-off-white/95 text-dark-blue backdrop-blur-sm hover:scale-105 hover:border-dark-blue-highlight hover:shadow-md'}"
									style="left: calc(50% + {x}px); top: calc(50% + {y}px); transform: translate(-50%, -50%);"
									aria-label="Select {keyOption.label} scale"
								>
									{keyOption.label}
								</button>
							{/each}

							<!-- Staff display in center -->
							<div
								class={`pointer-events-none absolute top-1/2 left-1/2 flex h-50 w-50 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-off-white shadow-md transition-all duration-200 ${successFlashActive ? 'success-ring ring-2 ring-brand-green/30' : ''}`}
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
					</div>

					<!-- Mode Selector (shown during game) -->
					{#if gameState !== 'idle'}
						<div class="pointer-events-auto">
							<PillSelector
								options={[
									{ value: 'major', label: 'Major' },
									{ value: 'natural_minor', label: 'Minor' }
								]}
								selected={selectedScaleMode}
								onSelect={(mode) => handleScaleModeChange(mode)}
								ariaLabel="Select scale mode"
							/>
						</div>
						<div class="pointer-events-auto p-0 text-center">
							<button
								onclick={() => {
									gameState = 'idle';
									score = 0;
									streak = 0;
								}}
								class="rounded-full bg-white px-8 py-4 text-lg font-bold text-dark-blue transition hover:scale-105"
							>
								Stop
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}
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
			box-shadow: 0 0 0 0 rgba(35, 154, 103, 0.22);
		}
		100% {
			box-shadow: 0 0 0 10px rgba(35, 154, 103, 0);
		}
	}

	.success-ring {
		animation: successRingPulse 1800ms ease-out;
	}
</style>
