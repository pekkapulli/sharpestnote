<script lang="ts">
	import type { TunerState } from '$lib/tuner/useTuner.svelte';

	interface Props {
		tunerState: TunerState;
		onStartListening: () => void | Promise<void>;
		onDeviceChange: (deviceId: string) => void;
	}

	const { tunerState, onStartListening, onDeviceChange }: Props = $props();
</script>

<div class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center shadow-sm">
	<p class="text-sm font-semibold text-amber-800">
		{tunerState.needsUserGesture ? 'Audio blocked by browser' : 'Microphone is not active.'}
	</p>
	<p class="mt-1 text-sm text-amber-800/90">
		{tunerState.needsUserGesture
			? 'Click the button below to enable audio access.'
			: 'Click listen to start the audio and continue.'}
	</p>
	{#if tunerState.error}
		<p class="mt-2 text-sm text-red-600" role="alert">{tunerState.error}</p>
	{/if}
	{#if tunerState.devices.length > 0}
		<div class="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
			<label for="mic-device-select" class="text-sm font-medium text-amber-800">
				Select input device:
				<select
					id="mic-device-select"
					value={tunerState.selectedDeviceId}
					onchange={(e) => onDeviceChange((e.target as HTMLSelectElement).value)}
					class="ml-2 rounded border border-amber-300 bg-white px-2 py-1 text-sm text-slate-900"
				>
					{#each tunerState.devices as device}
						<option value={device.deviceId}>{device.label || 'Microphone'}</option>
					{/each}
				</select>
			</label>
		</div>
	{/if}
	<button
		type="button"
		onclick={onStartListening}
		class="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-dark-blue px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:shadow"
	>
		<span aria-hidden="true">🎤</span>
		<span>{tunerState.needsUserGesture ? 'Enable Audio' : 'Listen'}</span>
	</button>
</div>
