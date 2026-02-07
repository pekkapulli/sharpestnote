<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import TunerPanel from '$lib/components/tuner/TunerPanel.svelte';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { DEFAULT_A4 } from '$lib/tuner/tune';

	let { data } = $props();

	const tuner = createTuner({ a4: DEFAULT_A4, accidental: 'sharp' });
	let micStarted = $state(false);

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
		<div class={micStarted ? 'mx-auto mb-2 max-w-sm' : 'mb-6'}>
			<MicrophoneSelector
				tunerState={tuner.state}
				onStartListening={startListening}
				onDeviceChange={handleDeviceChange}
				onRefreshDevices={tuner.refreshDevices}
			/>
		</div>

		<TunerPanel
			note={tuner.state.note}
			frequency={tuner.state.frequency}
			cents={tuner.state.cents}
		/>
	</div>
</div>
