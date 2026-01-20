<script lang="ts">
	import type { TunerState } from '$lib/tuner/useTuner.svelte';

	interface Props {
		tunerState: TunerState;
		onStartListening: () => void | Promise<void>;
		onDeviceChange: (deviceId: string) => void;
		onRefreshDevices?: () => void | Promise<void>;
	}

	const { tunerState, onStartListening, onDeviceChange, onRefreshDevices }: Props = $props();

	let isOpen = $state(true);

	$effect(() => {
		// Auto-collapse panel when listening starts
		if (tunerState.isListening) {
			isOpen = false;
		}
	});

	async function handleStartClick() {
		await onStartListening();
		if (onRefreshDevices) {
			try {
				await onRefreshDevices();
			} catch (err) {
				console.error('[MicrophoneSelector] Failed to refresh devices:', err);
			}
		}
	}

	function formatDeviceName(label: string | null | undefined): string {
		if (!label) return 'Microphone';

		// Remove duplicate parenthetical content (e.g., "Built-in Microphone (Built-in Audio Stereo)")
		const cleaned = label.replace(/\s*\([^)]*\)(?=\s*\(|$)/, '');

		// Remove trailing parenthetical content or duplication
		const match = cleaned.match(/^([^(]+?)(?:\s*\(\1\))?$/);
		if (match) {
			return match[1].trim();
		}

		return cleaned.trim() || 'Microphone';
	}
</script>

<details
	open={isOpen}
	onchange={(e) => (isOpen = (e.target as HTMLDetailsElement).open)}
	class="rounded-2xl border border-amber-300 bg-amber-50 shadow-sm"
>
	<summary
		class="cursor-pointer list-none p-4 text-center transition select-none hover:bg-amber-100"
	>
		<div class="flex items-center justify-center gap-2">
			<span aria-hidden="true">🎤</span>
			<span class="text-sm font-semibold text-amber-800">
				{tunerState.isListening ? 'Microphone (click to change)' : 'Select Microphone'}
			</span>
		</div>
	</summary>

	<div class="space-y-3 border-t border-amber-300 p-4 text-center">
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
			<div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
				<label for="mic-device-select" class="max-w-xs text-sm font-medium text-amber-800">
					Select input device:
					<select
						id="mic-device-select"
						value={tunerState.selectedDeviceId}
						onchange={(e) => onDeviceChange((e.target as HTMLSelectElement).value)}
						class="mx-4 max-w-50 rounded border border-amber-300 bg-white px-4 py-1 text-sm text-slate-900"
					>
						{#each tunerState.devices as device}
							<option value={device.deviceId}>{formatDeviceName(device.label)}</option>
						{/each}
					</select>
				</label>
			</div>
		{/if}
		<button
			type="button"
			onclick={handleStartClick}
			class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-dark-blue px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:shadow"
		>
			<span aria-hidden="true">🎤</span>
			<span>{tunerState.needsUserGesture ? 'Enable Audio' : 'Listen'}</span>
		</button>
	</div>
</details>
