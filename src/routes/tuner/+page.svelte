<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import TunerPanel from '$lib/components/tuner/TunerPanel.svelte';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { DEFAULT_A4 } from '$lib/tuner/tune';
	import { instrumentConfigs, defaultInstrumentId } from '$lib/config/instruments';
	import type { InstrumentId } from '$lib/config/types';

	let { data } = $props();

	let selectedInstrument = $state<InstrumentId>(defaultInstrumentId);
	const tuner = createTuner({ a4: DEFAULT_A4, accidental: 'sharp' });
	let micStarted = $state(false);

	// Update tuner instrument when selection changes
	$effect(() => {
		tuner.instrument = selectedInstrument;
	});

	onMount(() => {
		tuner.checkSupport();
		tuner.refreshDevices();
	});

	onDestroy(() => {
		tuner.destroy();
	});

	async function startListening() {
		try {
			if (tuner.state.needsUserGesture) {
				await tuner.resumeAfterGesture();
			} else {
				await tuner.start();
			}
			micStarted = true;
		} catch (err) {
			console.error('[Tuner] Failed to start listening:', err);
		}
	}

	function handleDeviceChange(deviceId: string) {
		tuner.state.selectedDeviceId = deviceId;
		startListening();
	}
</script>

<SharePreview data={data.sharePreviewData} />

<div class="min-h-screen bg-off-white py-12">
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4">
		<header class={`${'mb-4'}`}>
			<div>
				<h1 class={'mt-1'}>Live Tuner</h1>
				<p class={`max-w-xl text-sm text-slate-700`}>Use the needle to tune your instrument.</p>
			</div>
		</header>
		<div class={micStarted ? 'mx-auto mb-2 max-w-sm' : 'mb-6'}>
			<MicrophoneSelector
				tunerState={tuner.state}
				onStartListening={startListening}
				onDeviceChange={handleDeviceChange}
				onRefreshDevices={tuner.refreshDevices}
			/>
		</div>

		<!-- Instrument selector -->
		<div class="mx-auto w-full max-w-sm">
			<label for="instrument" class="mb-2 block text-sm font-medium text-slate-700"
				>Select your instrument</label
			>
			<select
				id="instrument"
				bind:value={selectedInstrument}
				class="block w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
			>
				{#each instrumentConfigs as instrument}
					<option value={instrument.id}>{instrument.label}</option>
				{/each}
			</select>
		</div>

		<TunerPanel
			note={tuner.state.note}
			frequency={tuner.state.frequency}
			cents={tuner.state.cents}
			instrument={selectedInstrument}
			showHeader={false}
		/>
	</div>
</div>
