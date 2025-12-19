<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		autoCorrelate,
		centsOff,
		frequencyFromNoteNumber,
		noteFromPitch,
		noteNameFromMidi,
		DEFAULT_A4,
		type Accidental
	} from '$lib';

	const FFT_SIZE = 2048;
	const ACCIDENTAL: Accidental = 'sharp';
	const a4Options = [440, 442];

	let isListening = $state(false);
	let frequency = $state<number | null>(null);
	let cents = $state<number | null>(null);
	let note = $state<string | null>(null);
	let error = $state<string | null>(null);
	let devices = $state<MediaDeviceInfo[]>([]);
	let selectedDeviceId = $state<string | null>(null);
	let a4 = $state<number>(DEFAULT_A4);

	let audioContext: AudioContext | null = null;
	let analyser: AnalyserNode | null = null;
	let mediaStream: MediaStream | null = null;
	let mediaSource: MediaStreamAudioSourceNode | null = null;
	let rafId: number | null = null;
	let buffer: Float32Array<ArrayBuffer> | null = null;

	function handleA4Change(event: Event) {
		const target = event.target as HTMLSelectElement;
		a4 = Number(target.value);
	}

	const formatHz = (value: number | null) => (value ? value.toFixed(1) : '--');
	const formatCents = (value: number | null) => {
		if (value === null) return '--';
		const sign = value > 0 ? '+' : value < 0 ? '-' : '';
		return `${sign}${Math.abs(value)} cents`;
	};

	onMount(() => {
		if (!navigator.mediaDevices?.getUserMedia) {
			error = 'Microphone access is not available in this browser.';
			return;
		}

		refreshDevices();
	});

	onDestroy(stopListening);

	async function refreshDevices() {
		try {
			const list = await navigator.mediaDevices.enumerateDevices();
			devices = list.filter((d) => d.kind === 'audioinput');
			if (!selectedDeviceId && devices.length) {
				selectedDeviceId = devices[0].deviceId;
			}
		} catch (err) {
			console.error(err);
			error = 'Could not list audio devices.';
		}
	}

	async function startListening() {
		try {
			error = null;
			stopListening();

			audioContext = audioContext ?? new AudioContext();
			await audioContext.resume();

			analyser = audioContext.createAnalyser();
			analyser.fftSize = FFT_SIZE;
			buffer = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));

			const constraints: MediaStreamConstraints = {
				audio: selectedDeviceId
					? {
							deviceId: { exact: selectedDeviceId },
							echoCancellation: false,
							noiseSuppression: false
						}
					: { echoCancellation: false, noiseSuppression: false },
				video: false
			};

			mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
			mediaSource = audioContext.createMediaStreamSource(mediaStream);
			mediaSource.connect(analyser);

			isListening = true;
			refreshDevices();
			tick();
		} catch (err) {
			console.error(err);
			error = 'Unable to start microphone. Please check permissions.';
			stopListening();
		}
	}

	function stopListening() {
		if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}

		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
			mediaStream = null;
		}

		if (mediaSource) {
			mediaSource.disconnect();
			mediaSource = null;
		}

		if (analyser) {
			analyser.disconnect();
			analyser = null;
		}

		buffer = null;
		isListening = false;
	}

	function tick() {
		const data = buffer;
		if (!analyser || !audioContext || !data) return;

		analyser.getFloatTimeDomainData(data);
		const freq = autoCorrelate(data, audioContext.sampleRate);

		if (freq > 0) {
			const midi = noteFromPitch(freq, a4);
			const target = frequencyFromNoteNumber(midi, a4);
			frequency = freq;
			cents = centsOff(freq, target);
			note = noteNameFromMidi(midi, ACCIDENTAL);
		} else {
			frequency = null;
			cents = null;
			note = null;
		}

		rafId = requestAnimationFrame(tick);
	}
</script>

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
					onclick={refreshDevices}
					type="button"
				>
					Refresh devices
				</button>
				<button
					class={`rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:shadow ${isListening ? 'bg-slate-600' : 'bg-dark-blue'}`}
					onclick={isListening ? stopListening : startListening}
					type="button"
				>
					{isListening ? 'Stop listening' : 'Start listening'}
				</button>
			</div>
		</header>

		<div class="grid gap-4 sm:grid-cols-3">
			<div class="rounded-2xl bg-white p-6 shadow-sm">
				<p class="text-xs tracking-[0.08em] text-slate-500 uppercase">Note</p>
				<p class="mt-2 text-4xl leading-tight font-semibold">{note ?? '--'}</p>
			</div>
			<div class="rounded-2xl bg-white p-6 shadow-sm">
				<p class="text-xs tracking-[0.08em] text-slate-500 uppercase">Frequency</p>
				<p class="mt-2 text-4xl leading-tight font-semibold">
					{formatHz(frequency)}<span class="ml-2 text-base font-normal text-slate-600">Hz</span>
				</p>
			</div>
			<div class="rounded-2xl bg-white p-6 shadow-sm">
				<p class="text-xs tracking-[0.08em] text-slate-500 uppercase">Detune</p>
				<p class="mt-2 text-4xl leading-tight font-semibold">{formatCents(cents)}</p>
			</div>
		</div>

		<div class="rounded-2xl bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<label class="flex flex-col text-sm font-medium text-slate-700">
					A4 Frequency
					<select
						class="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-dark-blue focus:ring-1 focus:ring-dark-blue focus:outline-none"
						onchange={handleA4Change}
						value={a4}
					>
						{#each a4Options as ref}
							<option value={ref}>A = {ref} Hz</option>
						{/each}
					</select>
				</label>

				<label class="flex flex-col text-sm font-medium text-slate-700">
					Input device
					<select
						class="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-dark-blue focus:ring-1 focus:ring-dark-blue focus:outline-none"
						bind:value={selectedDeviceId}
						disabled={!devices.length}
					>
						{#if !devices.length}
							<option value="" disabled>Searching for microphones...</option>
						{:else}
							{#each devices as device}
								<option value={device.deviceId}>{device.label || 'Microphone'}</option>
							{/each}
						{/if}
					</select>
				</label>

				<p class={`text-sm ${isListening ? 'text-green-700' : 'text-slate-600'}`}>
					{isListening ? 'Listening... try playing a note.' : 'Press Start to grant mic access.'}
				</p>
			</div>
			{#if error}
				<p class="mt-3 text-sm text-red-600">{error}</p>
			{/if}
		</div>
	</div>
</div>
