<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { DEFAULT_A4 } from '$lib/tuner/tune';
	import SharePreview from '$lib/components/SharePreview.svelte';

	let { data } = $props();

	const a4Options = [440, 442];
	const tuner = createTuner({ a4: DEFAULT_A4, accidental: 'sharp' });

	const formatHz = (value: number | null) => (value ? value.toFixed(1) : '--');
	const formatCents = (value: number | null) => {
		if (value === null) return '--';
		const sign = value > 0 ? '+' : value < 0 ? '-' : '';
		return `${sign}${Math.abs(value)} cents`;
	};

	onMount(() => {
		tuner.checkSupport();
		tuner.refreshDevices();
	});

	onDestroy(() => {
		tuner.destroy();
	});

	function handleA4Change(event: Event) {
		const target = event.target as HTMLSelectElement;
		tuner.a4 = Number(target.value);
	}
</script>

<SharePreview data={data.sharePreviewData} />

<div class="min-h-screen bg-off-white py-12">
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4">
		<header class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<p class="text-sm tracking-[0.08em] text-slate-500 uppercase">Ear game</p>
				<h1 class="mt-1">Live tuner</h1>
				<p class="max-w-xl text-sm text-slate-700">
					Use your microphone to see the incoming pitch and the closest equal-tempered note.
				</p>
			</div>

			<div class="flex items-center gap-3">
				<button
					class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-px hover:shadow"
					onclick={tuner.refreshDevices}
					type="button"
				>
					Refresh devices
				</button>
				<button
					class={`rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:shadow ${tuner.state.isListening ? 'bg-slate-600' : 'bg-dark-blue'}`}
					onclick={tuner.state.isListening ? tuner.stop : tuner.start}
					type="button"
				>
					{tuner.state.isListening ? 'Stop listening' : 'Start listening'}
				</button>
			</div>
		</header>

		<div class="grid gap-4 sm:grid-cols-3">
			<div class="rounded-2xl bg-white p-6 shadow-sm">
				<p class="text-xs tracking-[0.08em] text-slate-500 uppercase">Note</p>
				<p class="mt-2 text-4xl leading-tight font-semibold">{tuner.state.note ?? '--'}</p>
			</div>
			<div class="rounded-2xl bg-white p-6 shadow-sm">
				<p class="text-xs tracking-[0.08em] text-slate-500 uppercase">Frequency</p>
				<p class="mt-2 text-4xl leading-tight font-semibold">
					{formatHz(tuner.state.frequency)}<span class="ml-2 text-base font-normal text-slate-600"
						>Hz</span
					>
				</p>
			</div>
			<div class="rounded-2xl bg-white p-6 shadow-sm">
				<p class="text-xs tracking-[0.08em] text-slate-500 uppercase">Detune</p>
				<p class="mt-2 text-4xl leading-tight font-semibold">{formatCents(tuner.state.cents)}</p>
			</div>
		</div>

		<div class="rounded-2xl bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<label for="a4-frequency" class="flex flex-col text-sm font-medium text-slate-700">
					A4 Frequency
					<select
						id="a4-frequency"
						class="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-dark-blue focus:ring-1 focus:ring-dark-blue focus:outline-none"
						onchange={handleA4Change}
						value={tuner.a4}
					>
						{#each a4Options as ref}
							<option value={ref}>A = {ref} Hz</option>
						{/each}
					</select>
				</label>

				<label for="input-device" class="flex flex-col text-sm font-medium text-slate-700">
					Input device
					<select
						id="input-device"
						class="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-dark-blue focus:ring-1 focus:ring-dark-blue focus:outline-none"
						bind:value={tuner.state.selectedDeviceId}
						disabled={!tuner.state.devices.length}
					>
						{#if !tuner.state.devices.length}
							<option value="" disabled>Searching for microphones...</option>
						{:else}
							{#each tuner.state.devices as device}
								<option value={device.deviceId}>{device.label || 'Microphone'}</option>
							{/each}
						{/if}
					</select>
				</label>

				<p class={`text-sm ${tuner.state.isListening ? 'text-green-700' : 'text-slate-600'}`}>
					{tuner.state.isListening
						? 'Listening... try playing a note.'
						: 'Press Start to grant mic access.'}
				</p>
			</div>
			{#if tuner.state.error}
				<p class="mt-3 text-sm text-red-600">{tuner.state.error}</p>
			{/if}
		</div>
	</div>
</div>
