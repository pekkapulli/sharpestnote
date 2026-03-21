<script lang="ts">
	import { onDestroy } from 'svelte';
	import Staff from '$lib/components/music/Staff.svelte';
	import SightGameMini from '$lib/components/sight/SightGameMini.svelte';
	import { createSynth } from '$lib/synth/useSynth.svelte';
	import { fileStore, units } from '$lib/config/units';
	import type { UnitMaterial } from '$lib/config/types';
	import { instrumentMap } from '$lib/config/instruments';
	import type { InstrumentId } from '$lib/config/types';
	import { getTransposedKeySignature } from '$lib/config/keys';
	import type { MelodyItem } from '$lib/config/melody';
	import { lengthToMs } from '$lib/config/melody';
	import { resolve } from '$app/paths';
	import { getRandomCompliment } from './great';

	type DemoPhase = 'locked' | 'preview' | 'play';

	interface Props {
		recordingUrl?: string;
	}

	let { recordingUrl }: Props = $props();

	const unitByInstrument: Record<InstrumentId, string | null> = {
		violin: 'tw-v',
		viola: 'tw-va',
		cello: 'tw-c',
		'double-bass': 'tw-b',
		guitar: null,
		flute: null,
		'french-horn': null,
		recorder: null
	};

	const fallbackMelody: MelodyItem[] = [
		{ note: 'd/4', length: 4, finger: 0 },
		{ note: 'd/4', length: 4, finger: 0 },
		{ note: 'a/4', length: 4, finger: 0 },
		{ note: 'a/4', length: 4, finger: 0 },
		{ note: 'b/4', length: 4, finger: 1 },
		{ note: 'b/4', length: 4, finger: 1 },
		{ note: 'a/4', length: 4, finger: 0 },
		{ note: null, length: 4 }
	];

	const instrumentOptions: { value: InstrumentId; label: string }[] = [
		{ value: 'violin', label: 'Violin' },
		{ value: 'viola', label: 'Viola' },
		{ value: 'cello', label: 'Cello' },
		{ value: 'double-bass', label: 'Bass' }
	];

	let phase = $state<DemoPhase>('locked');
	let selectedInstrument = $state<InstrumentId>('violin');
	let currentIndex = $state(0);
	let hasCompletedPreview = $state(false);
	let showPreviewSuccess = $state(false);
	let previewSuccessMessage = $state('Great listening!');
	let previewStatus = $state<string | undefined>(undefined);

	let playbackToken = 0;
	let playheadPosition = $state<number | null>(null);
	let activeFrame: number | null = null;
	let currentAudio: HTMLAudioElement | null = null;

	const synth = createSynth({
		waveform: 'sine',
		volume: 0.2,
		attack: 0.03,
		decay: 0.1,
		sustain: 0.75,
		release: 0.1,
		reverbMix: 0.08,
		reverbDecay: 1.6
	});

	const activeUnit = $derived.by(() => {
		const code = unitByInstrument[selectedInstrument];
		if (!code) return null;
		return (units[code] ?? null) as UnitMaterial | null;
	});

	const twinklePiece = $derived(
		activeUnit?.pieces?.find((piece) => piece.code === 'twinkle-twinkle-little-star') ?? null
	);

	const demoMelody = $derived(
		twinklePiece?.melody?.[0] ? twinklePiece.melody[0].map((item) => ({ ...item })) : fallbackMelody
	);
	const keyNote = $derived(twinklePiece?.key ?? 'D');
	const mode = $derived(twinklePiece?.mode ?? 'major');
	const barLength = $derived(twinklePiece?.barLength ?? 16);
	const previewTempo = $derived(twinklePiece?.tracks?.slow?.tempo ?? 60);
	const previewKeySignature = $derived(getTransposedKeySignature(keyNote, mode, 0));
	const previewClef = $derived(instrumentMap[selectedInstrument]?.clef ?? 'treble');

	const defaultRecordingUrl = $derived(
		activeUnit && twinklePiece?.tracks?.slow?.audioUrl
			? `${fileStore}/${activeUnit.code}/${twinklePiece.tracks.slow.audioUrl}`
			: null
	);

	const resolvedRecordingUrl = $derived(recordingUrl ?? defaultRecordingUrl);
	const fullDemoUnitHref = $derived(
		activeUnit && twinklePiece
			? resolve(`/unit/${activeUnit.code}/${twinklePiece.code}`)
			: resolve('/units')
	);

	function instrumentLabel(instrumentId: InstrumentId): string {
		return instrumentMap[instrumentId]?.label ?? 'Violin';
	}

	function wait(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function stopPreviewPlayback() {
		playbackToken += 1;
		synth.stopAll();
		if (currentAudio) {
			currentAudio.pause();
			currentAudio.currentTime = 0;
			currentAudio = null;
		}
		if (activeFrame !== null) {
			cancelAnimationFrame(activeFrame);
			activeFrame = null;
		}
		playheadPosition = null;
	}

	function resetPreviewVisuals() {
		currentIndex = 0;
		playheadPosition = null;
		showPreviewSuccess = false;
	}

	async function animatePass(token: number, markSuccesses: boolean) {
		let sixteenthPosition = 0;

		for (let i = 0; i < demoMelody.length; i++) {
			if (token !== playbackToken) return;

			const item = demoMelody[i];
			const durationMs = lengthToMs(item.length, previewTempo);
			const startedAt = performance.now();
			let hasMarkedSuccess = false;

			const stepFrame = () => {
				if (token !== playbackToken) return;
				const elapsed = performance.now() - startedAt;
				const progress = Math.min(elapsed / durationMs, 1);
				if (!markSuccesses) {
					playheadPosition = sixteenthPosition + item.length * progress;
				}

				if (markSuccesses && !hasMarkedSuccess && progress >= 0.2) {
					currentIndex = i + 1;
					hasMarkedSuccess = true;
				}

				if (progress < 1) {
					activeFrame = requestAnimationFrame(stepFrame);
				} else {
					activeFrame = null;
				}
			};

			activeFrame = requestAnimationFrame(stepFrame);
			await wait(durationMs);

			sixteenthPosition += item.length;
			if (!markSuccesses) {
				playheadPosition = sixteenthPosition;
			}

			if (markSuccesses && !hasMarkedSuccess) {
				currentIndex = i + 1;
			}
		}

		await wait(350);
		playheadPosition = null;
	}

	async function playSynthPreview(token: number) {
		for (const item of demoMelody) {
			if (token !== playbackToken) return;
			await synth.playNote(item, previewTempo);
		}
	}

	async function playRecordingPreview(token: number) {
		if (!resolvedRecordingUrl) return;

		currentAudio = new Audio(resolvedRecordingUrl);
		currentAudio.preload = 'auto';

		try {
			await currentAudio.play();
		} catch (error) {
			console.error('[SightGameFrontDemo] Failed to play recording:', error);
			currentAudio = null;
			return;
		}

		await animatePass(token, true);

		if (currentAudio) {
			currentAudio.pause();
			currentAudio.currentTime = 0;
			currentAudio = null;
		}
	}

	async function startPreviewFlow() {
		stopPreviewPlayback();
		const token = playbackToken;

		phase = 'preview';
		resetPreviewVisuals();
		showPreviewSuccess = false;

		previewStatus = 'We play the model melody, encouraging active listening.';
		await Promise.all([playSynthPreview(token), animatePass(token, false)]);
		if (token !== playbackToken) return;

		resetPreviewVisuals();
		previewStatus = resolvedRecordingUrl
			? 'The player plays the passage, with immediate positive feedback.'
			: 'Recording not set yet. You can still try the live mode.';

		if (resolvedRecordingUrl) {
			await playRecordingPreview(token);
			if (token !== playbackToken) return;
			showPreviewSuccess = true;
			previewSuccessMessage = getRandomCompliment('great');
		}

		hasCompletedPreview = true;
		previewStatus = `I have my ${instrumentLabel(selectedInstrument).toLowerCase()} ready!`;
		phase = 'locked';
	}

	function handleTryIt() {
		void startPreviewFlow();
	}

	function handlePlayIt() {
		stopPreviewPlayback();
		showPreviewSuccess = false;
		phase = 'play';
	}

	function handleBackFromPlay() {
		hasCompletedPreview = false;
		previewStatus = undefined;
		phase = 'locked';
	}

	function handleInstrumentChange() {
		stopPreviewPlayback();
		resetPreviewVisuals();
		if (phase === 'preview') {
			phase = 'locked';
		}
		if (hasCompletedPreview || phase === 'play') {
			previewStatus = `I have my ${instrumentLabel(selectedInstrument).toLowerCase()} ready!`;
		}
	}

	onDestroy(() => {
		stopPreviewPlayback();
	});
</script>

<section class="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
	<div class="mb-3 flex items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<label for="front-demo-instrument" class="text-sm font-semibold text-slate-700"
				>Instrument</label
			>
			<select
				id="front-demo-instrument"
				bind:value={selectedInstrument}
				onchange={handleInstrumentChange}
				class="min-w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 sm:min-w-56"
			>
				{#each instrumentOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<div
		class={`relative mb-4 overflow-hidden rounded-xl border border-slate-200 bg-off-white p-2 transition-all duration-300 sm:p-3 ${
			showPreviewSuccess ? 'scale-[1.01] ring-4 ring-green-400' : ''
		}`}
	>
		{#if phase === 'play'}
			{#key selectedInstrument}
				<SightGameMini
					instrument={selectedInstrument}
					{keyNote}
					{mode}
					tempoBPM={previewTempo}
					{barLength}
					melody={demoMelody}
					onBack={handleBackFromPlay}
				/>
			{/key}
		{:else}
			<div class:blur-sm={phase === 'locked'} class:opacity-80={phase === 'locked'}>
				<Staff
					bars={[demoMelody]}
					{currentIndex}
					animatingIndex={null}
					{playheadPosition}
					ghostNote={null}
					cents={null}
					clef={previewClef}
					keySignature={previewKeySignature}
					isCurrentNoteHit={false}
					isSequenceComplete={false}
					{barLength}
					showTimeSignature={false}
					greatIntonationIndices={[]}
				/>
			</div>

			{#if phase === 'locked'}
				<div
					class="absolute inset-0 flex items-center justify-center bg-white/45 backdrop-blur-[1px]"
				>
					{#if hasCompletedPreview}
						<button
							type="button"
							onclick={handlePlayIt}
							class="rounded-full bg-dark-blue px-5 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-px hover:bg-dark-blue-highlight"
						>
							Play it yourself
						</button>
					{:else}
						<button
							type="button"
							onclick={handleTryIt}
							class="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-px hover:bg-emerald-700"
						>
							Try it
						</button>
					{/if}
				</div>
			{/if}
		{/if}
	</div>

	{#if showPreviewSuccess && phase !== 'play'}
		<p
			class="mt-5 mb-1 min-h-8 text-center text-lg text-green-600"
			role="status"
			aria-live="polite"
		>
			✓ {previewSuccessMessage}
		</p>
	{/if}

	{#if phase !== 'play'}
		<p class="mt-3 text-sm text-slate-700">{previewStatus}</p>
	{/if}

	{#if phase === 'locked' && hasCompletedPreview}
		<div class="mt-4 flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={handlePlayIt}
				class="rounded-full bg-dark-blue px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-dark-blue-highlight hover:shadow"
			>
				Play it yourself
			</button>
			<a
				href={resolve('/teachers')}
				class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-px hover:shadow"
			>
				Create a teacher account
			</a>
			<a
				href={fullDemoUnitHref}
				class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-px hover:shadow"
			>
				Show full demo unit
			</a>
		</div>
	{/if}
</section>
