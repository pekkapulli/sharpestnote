<script lang="ts">
	/**
	 * Minimal sight-reading game for the front-page demo.
	 * No tempo controls, tuner modal, note labels, or skip buttons.
	 * Compact mic selector is shown inline before the game starts.
	 */
	import { onMount } from 'svelte';
	import type { Mode } from '$lib/config/keys';
	import type { InstrumentId } from '$lib/config/types';
	import type { MelodyItem } from '$lib/config/melody';
	import { useSightGameLogic } from './useSightGameLogic.svelte';
	import Staff from '$lib/components/music/Staff.svelte';
	import { getRandomCompliment } from './great';

	interface Props {
		instrument: InstrumentId;
		keyNote: string;
		mode: Mode;
		tempoBPM?: number;
		barLength?: number;
		melody: MelodyItem[];
		onBack?: () => void;
	}

	let {
		instrument,
		keyNote,
		mode,
		tempoBPM = 100,
		barLength = 16,
		melody,
		onBack
	}: Props = $props();

	const game = useSightGameLogic({
		getInstrument: () => instrument,
		getKeyNote: () => keyNote,
		getMode: () => mode,
		getTempoBPM: () => tempoBPM,
		getMelody: () => melody
	});

	let micStarted = $state(false);

	onMount(() => {
		game.tuner.checkSupport();
		game.tuner.refreshDevices();
	});

	async function startListening() {
		try {
			if (game.tuner.state.needsUserGesture) {
				await game.tuner.resumeAfterGesture();
			} else {
				await game.tuner.start();
			}
			micStarted = true;
			game.playMelodyWithSynth();
		} catch (err) {
			console.error('[SightGameMini] Failed to start listening:', err);
		}
	}

	function handleDeviceChange(deviceId: string) {
		game.tuner.state.selectedDeviceId = deviceId;
		startListening();
	}

	function formatDeviceName(label: string | null | undefined): string {
		if (!label) return 'Microphone';
		const cleaned = label.replace(/\s*\([^)]*\)(?=\s*\(|$)/, '');
		const match = cleaned.match(/^([^(]+?)(?:\s*\(\1\))?$/);
		return match ? match[1].trim() : cleaned.trim() || 'Microphone';
	}

	let successMessage = $state('Correct!');
	let wasShowingSuccess = $state(false);

	$effect(() => {
		const isShowingSuccess = game.showSuccess();
		if (isShowingSuccess && !wasShowingSuccess) {
			const currentMelody = game.melody() ?? [];
			const playableNotes = currentMelody.filter((item) => item.note !== null).length;
			const greatIntonationCount = game.greatIntonationIndices().length;
			const usePreciseCompliment = playableNotes > 0 && greatIntonationCount / playableNotes >= 0.5;
			successMessage = getRandomCompliment(usePreciseCompliment ? 'precise' : 'great');
		}
		if (!isShowingSuccess) {
			successMessage = 'Correct!';
		}
		wasShowingSuccess = isShowingSuccess;
	});
</script>

{#if !micStarted}
	<!-- Compact inline mic selector -->
	<div class="flex flex-col items-center gap-3 py-4">
		<p class="text-sm font-semibold text-slate-700">Select your microphone to start playing</p>
		{#if game.tuner.state.error}
			<p class="text-sm text-red-600" role="alert">{game.tuner.state.error}</p>
		{/if}
		{#if game.tuner.state.devices.length > 0}
			<select
				value={game.tuner.state.selectedDeviceId}
				onchange={(e) => handleDeviceChange((e.target as HTMLSelectElement).value)}
				class="max-w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
			>
				{#each game.tuner.state.devices as device (device.deviceId)}
					<option value={device.deviceId}>{formatDeviceName(device.label)}</option>
				{/each}
			</select>
		{/if}
		<button
			type="button"
			onclick={startListening}
			class="inline-flex items-center gap-2 rounded-full bg-dark-blue px-5 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-px hover:bg-dark-blue-highlight hover:shadow-md"
		>
			<span aria-hidden="true">🎤</span>
			<span>{game.tuner.state.needsUserGesture ? 'Enable Audio' : 'Start listening'}</span>
		</button>
		{#if onBack}
			<button
				type="button"
				onclick={onBack}
				class="text-sm text-slate-500 underline transition hover:text-slate-700"
			>
				Back to start
			</button>
		{/if}
	</div>
{:else if game.melody()}
	<!-- Minimal staff game -->
	<div
		class={`transition-all duration-300 ${game.showSuccess() ? 'scale-[1.01] ring-4 ring-green-400' : ''}`}
	>
		<Staff
			bars={[game.melody()!]}
			showTimeSignature={false}
			currentIndex={game.currentIndex()}
			animatingIndex={null}
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

	<div class="flex items-center justify-between px-1 pt-2">
		{#if game.showSuccess()}
			<p class="min-h-6 text-sm text-green-600" role="status" aria-live="polite">
				✓ {successMessage}
			</p>
		{/if}
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => game.playMelodyWithSynth()}
				disabled={game.isPlayingMelody()}
				class="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:-translate-y-px hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
			>
				{game.isPlayingMelody() ? 'Playing...' : 'Replay'}
			</button>
			{#if onBack}
				<button
					type="button"
					onclick={onBack}
					class="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:-translate-y-px hover:shadow"
				>
					Back to start
				</button>
			{/if}
		</div>
	</div>
{/if}
