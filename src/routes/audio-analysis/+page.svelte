<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { DEFAULT_A4 } from '$lib/tuner/tune';
	import {
		calculatePhaseDeviation,
		calculateSpectralFluxWeighted
	} from '$lib/tuner/spectralAnalysis';
	import { calculateDynamicThreshold, getDetectionConfig } from '$lib/tuner/analysis';
	import { instrumentMap, genericDetectionConfig } from '$lib/config/instruments';
	import { onsetDetectionConfig } from '$lib/config/onset';
	import type { InstrumentKind } from '$lib/tuner/types';

	const HISTORY_MS = 10_000;
	const SAMPLE_INTERVAL_MS = 33; // ~30fps sampling for the history buffer

	const tuner = createTuner({ a4: DEFAULT_A4, accidental: 'sharp' });

	let canvasEl: HTMLCanvasElement | null = null;
	let phaseCanvasEl: HTMLCanvasElement | null = null;
	let ctx: CanvasRenderingContext2D | null = null;
	let phaseCtx: CanvasRenderingContext2D | null = null;
	let animationId: number | null = null;
	let sampleTimer: number | null = null;
	let resizeObserver: ResizeObserver | null = null;

	let history: {
		t: number;
		amp: number;
		spectrum: Uint8Array | null;
		phases: Float32Array | null;
		onset: boolean;
		active: boolean;
		frequency?: number | null;
		phaseDeviation: number;
		spectralFlux: number;
		onsetStrength: number; // Combined flux + phase deviation
	}[] = [];
	let prevNoteActive = false;
	let prevPhases: Float32Array | null = null;
	let prevSpectrum: Float32Array | null = null;
	let fluxHistory: number[] = [];
	let firstNoteTime: number | null = null;
	let testLogTimer: number | null = null;

	function startSampling() {
		stopSampling();
		sampleTimer = window.setInterval(() => {
			const now = performance.now();
			const isActive = tuner.state.isNoteActive;
			const onset = isActive && !prevNoteActive;
			prevNoteActive = isActive;

			// Calculate spectral flux and phase deviation using same logic as useTuner
			let spectralFlux = 0;
			let phaseDeviation = 0;

			if (tuner.state.spectrum && tuner.state.phases && prevSpectrum && prevPhases) {
				const currentFFT = {
					phases: tuner.state.phases,
					magnitudes: tuner.state.spectrum
				} as any;
				const previousFFT = {
					phases: prevPhases,
					magnitudes: prevSpectrum
				} as any;
				spectralFlux = calculateSpectralFluxWeighted(currentFFT, previousFFT);
				phaseDeviation = calculatePhaseDeviation(currentFFT, previousFFT, 2048 / 4); // hopSize ~= fftSize/4
			}

			// Update previous frame data
			if (tuner.state.phases) {
				prevPhases = new Float32Array(tuner.state.phases);
			}
			if (tuner.state.spectrum) {
				prevSpectrum = new Float32Array(tuner.state.spectrum);
			}

			// Track flux history for dynamic threshold (keep last 30 like useTuner)
			fluxHistory.push(spectralFlux);
			if (fluxHistory.length > 30) fluxHistory.shift();

			// Combine flux and phase deviation with same weights as useTuner
			const tuning = getDetectionConfig(
				'generic' as InstrumentKind,
				instrumentMap,
				genericDetectionConfig
			);
			const normalizedPhase = phaseDeviation / Math.PI; // 0-1 range
			const onsetStrength = tuning.usePhaseDeviation
				? (1 - tuning.phaseWeight) * spectralFlux + tuning.phaseWeight * normalizedPhase
				: spectralFlux;

			history.push({
				t: now,
				amp: tuner.state.amplitude,
				spectrum: tuner.state.spectrum ? new Uint8Array(tuner.state.spectrum) : null,
				phases: tuner.state.phases ? new Float32Array(tuner.state.phases) : null,
				onset,
				active: isActive,
				frequency: tuner.state.frequency ?? null,
				phaseDeviation,
				spectralFlux,
				onsetStrength
			});
			history = history.filter((h) => h.t >= now - HISTORY_MS);

			// Test logging: capture data 5 seconds after first note
			if (onset && firstNoteTime === null) {
				firstNoteTime = now;
				testLogTimer = window.setTimeout(() => {
					const startTime = firstNoteTime!;
					const relevantHistory = history.filter(
						(h) => h.t >= startTime && h.t <= startTime + 5000
					);
					console.log('=== TEST DATA: 5 seconds after first note ===');
					console.log('First note at:', 0, 'ms');
					console.log('\nOnset events:');
					relevantHistory.forEach((h) => {
						if (h.onset) {
							const dynamicThreshold = calculateDynamicThreshold(
								relevantHistory
									.slice(
										Math.max(0, relevantHistory.indexOf(h) - 29),
										relevantHistory.indexOf(h) + 1
									)
									.map((s) => s.spectralFlux),
								10,
								3.0
							);
							console.log(
								`  ${Math.round(h.t - startTime)}ms: amp=${h.amp.toFixed(3)} flux=${h.spectralFlux.toFixed(4)} phase=${h.phaseDeviation.toFixed(4)} strength=${h.onsetStrength.toFixed(4)} thresh=${dynamicThreshold.toFixed(4)} freq=${tuner.state.frequency?.toFixed(1) || 'N/A'}`
							);
						}
					});
					console.log('\nAll samples (every 3rd):');
					relevantHistory.forEach((h, i) => {
						if (i % 3 === 0) {
							const dynamicThreshold = calculateDynamicThreshold(
								relevantHistory.slice(Math.max(0, i - 29), i + 1).map((s) => s.spectralFlux),
								10,
								3.0
							);
							const marker = h.onset ? ' <-- ONSET' : '';
							console.log(
								`  ${Math.round(h.t - startTime)}ms: flux=${h.spectralFlux.toFixed(4)} phase=${h.phaseDeviation.toFixed(4)} strength=${h.onsetStrength.toFixed(4)} thresh=${dynamicThreshold.toFixed(4)}${marker}`
							);
						}
					});
				}, 5000);
			}
		}, SAMPLE_INTERVAL_MS);
	}

	function stopSampling() {
		if (sampleTimer !== null) {
			clearInterval(sampleTimer);
			sampleTimer = null;
		}
		if (testLogTimer !== null) {
			clearTimeout(testLogTimer);
			testLogTimer = null;
		}
		prevNoteActive = false;
		prevPhases = null;
		prevSpectrum = null;
		fluxHistory = [];
		firstNoteTime = null;
	}

	function draw() {
		if (!ctx || !canvasEl) return;
		drawSpectrum();
		drawPhase();
		scheduleNextFrame();
	}

	function drawSpectrum() {
		if (!ctx || !canvasEl) return;
		const c = ctx;
		const canvas = canvasEl;
		const now = performance.now();
		history = history.filter((h) => h.t >= now - HISTORY_MS);

		const { width, height } = canvas;
		c.clearRect(0, 0, width, height);

		// Dark base to let the heatmap and white line pop
		c.fillStyle = '#0b1226';
		c.fillRect(0, 0, width, height);

		if (!history.length) {
			c.fillStyle = '#cbd5e1';
			c.font = '12px sans-serif';
			c.fillText('No audio yet...', 12, 20);
			return;
		}

		const oldest = now - HISTORY_MS;
		const paddingTop = 12;
		const paddingBottom = 32;
		const heatmapHeight = height - paddingTop - paddingBottom;
		const binCount = history.find((h) => h.spectrum)?.spectrum?.length ?? 0;
		const topMarkY = Math.max(6, paddingTop * 0.5);

		// Spectrum heatmap timeline
		if (binCount > 0) {
			for (let i = 0; i < history.length; i++) {
				const sample = history[i];
				if (!sample.spectrum) continue;
				const nextT = history[i + 1]?.t ?? now;
				const x = ((sample.t - oldest) / HISTORY_MS) * width;
				const xNext = ((nextT - oldest) / HISTORY_MS) * width;
				const columnWidth = Math.max(1, Math.ceil(xNext - x));

				for (let b = 0; b < binCount; b++) {
					const mag = sample.spectrum[b];
					const y = paddingTop + heatmapHeight - ((b + 1) / binCount) * heatmapHeight;
					const binHeight = Math.ceil(heatmapHeight / binCount) + 1;
					c.fillStyle = magnitudeToColor(mag);
					c.fillRect(x, y, columnWidth, binHeight);
				}
			}
		}

		// Amplitude trace overlaid on the heatmap
		const ampMax = Math.max(...history.map((h) => h.amp), 0.001);
		const yScale = heatmapHeight / ampMax;
		const baseline = paddingTop + heatmapHeight;

		c.strokeStyle = '#ffffff';
		c.lineWidth = 2;
		c.beginPath();
		history.forEach((h, idx) => {
			const x = ((h.t - oldest) / HISTORY_MS) * width;
			const y = baseline - h.amp * yScale;
			if (idx === 0) {
				c.moveTo(x, y);
			} else {
				c.lineTo(x, y);
			}
		});
		c.stroke();

		// Note onsets as dots along the top edge
		c.fillStyle = '#fbbf24';
		history.forEach((h) => {
			if (!h.onset) return;
			const x = ((h.t - oldest) / HISTORY_MS) * width;
			c.beginPath();
			c.arc(x, topMarkY, 5, 0, Math.PI * 2);
			c.fill();
		});

		// Active note line along the top edge
		c.strokeStyle = '#fbbf24';
		c.lineWidth = 2;
		c.beginPath();
		for (let i = 0; i < history.length; i++) {
			const h = history[i];
			const nextT = history[i + 1]?.t ?? now;
			if (!h.active) continue;
			const x = ((h.t - oldest) / HISTORY_MS) * width;
			const xNext = ((nextT - oldest) / HISTORY_MS) * width;
			c.moveTo(x, topMarkY);
			c.lineTo(xNext, topMarkY);
		}
		c.stroke();
	}

	function drawPhase() {
		if (!phaseCtx || !phaseCanvasEl) return;
		const c = phaseCtx;
		const canvas = phaseCanvasEl;
		const now = performance.now();

		const { width, height } = canvas;
		c.clearRect(0, 0, width, height);

		// Dark background
		c.fillStyle = '#0b1226';
		c.fillRect(0, 0, width, height);

		if (!history.length) {
			c.fillStyle = '#cbd5e1';
			c.font = '12px sans-serif';
			c.fillText('No phase data yet...', 12, 20);
			return;
		}

		const oldest = now - HISTORY_MS;
		const paddingTop = 12;
		const paddingBottom = 32;
		const heatmapHeight = height - paddingTop - paddingBottom;
		const binCount = history.find((h) => h.phases)?.phases?.length ?? 0;

		// Phase heatmap: map phase angles (-π to π) to colors
		if (binCount > 0) {
			for (let i = 0; i < history.length; i++) {
				const sample = history[i];
				if (!sample.phases) continue;
				const nextT = history[i + 1]?.t ?? now;
				const x = ((sample.t - oldest) / HISTORY_MS) * width;
				const xNext = ((nextT - oldest) / HISTORY_MS) * width;
				const columnWidth = Math.max(1, Math.ceil(xNext - x));

				for (let b = 0; b < binCount; b++) {
					const phase = sample.phases[b];
					const y = paddingTop + heatmapHeight - ((b + 1) / binCount) * heatmapHeight;
					const binHeight = Math.ceil(heatmapHeight / binCount) + 1;
					c.fillStyle = phaseToColor(phase);
					c.fillRect(x, y, columnWidth, binHeight);
				}
			}
		}

		// Phase deviation trace overlaid on the heatmap
		const phaseDevMax = Math.max(...history.map((h) => h.phaseDeviation), 0.001);
		const phaseYScale = heatmapHeight / phaseDevMax;
		const phaseBaseline = paddingTop + heatmapHeight;

		c.strokeStyle = '#ffffff';
		c.lineWidth = 2;
		c.beginPath();
		history.forEach((h, idx) => {
			const x = ((h.t - oldest) / HISTORY_MS) * width;
			const y = phaseBaseline - h.phaseDeviation * phaseYScale;
			if (idx === 0) {
				c.moveTo(x, y);
			} else {
				c.lineTo(x, y);
			}
		});
		c.stroke();

		// Mark phase-based onset events using raw threshold + amplitude gate
		const tuning = getDetectionConfig(
			'generic' as InstrumentKind,
			instrumentMap,
			genericDetectionConfig
		);
		c.fillStyle = '#10b981'; // Green for onset markers
		history.forEach((h) => {
			const hasPitch = !!h.frequency && h.frequency > 0;
			if (
				h.phaseDeviation > onsetDetectionConfig.c_minRawPhase &&
				h.amp > tuning.onsetMinAmplitude &&
				h.active &&
				hasPitch
			) {
				const x = ((h.t - oldest) / HISTORY_MS) * width;
				c.beginPath();
				c.arc(x, paddingTop / 2, 5, 0, Math.PI * 2);
				c.fill();
			}
		});

		// Add phase legend labels
		c.fillStyle = '#94a3b8';
		c.font = '10px monospace';
		c.textAlign = 'right';
		c.fillText('+π', width - 4, paddingTop + 10);
		c.fillText('0', width - 4, paddingTop + heatmapHeight / 2 + 4);
		c.fillText('-π', width - 4, paddingTop + heatmapHeight - 4);
	}

	function phaseToColor(phase: number): string {
		// Map phase from [-π, π] to [0, 1]
		const normalized = (phase + Math.PI) / (2 * Math.PI);
		// Use HSL for cyclical phase representation
		const hue = normalized * 360;
		return `hsl(${hue}, 70%, 50%)`;
	}

	function magnitudeToColor(mag: number) {
		const t = Math.pow(Math.min(Math.max(mag / 255, 0), 1), 0.6); // slight curve to lift quiet bins
		const start = { r: 12, g: 30, b: 73 }; // dark blue
		const end = { r: 239, g: 68, b: 68 }; // red
		const r = Math.round(start.r + (end.r - start.r) * t);
		const g = Math.round(start.g + (end.g - start.g) * t);
		const b = Math.round(start.b + (end.b - start.b) * t);
		return `rgb(${r}, ${g}, ${b})`;
	}

	function scheduleNextFrame() {
		animationId = requestAnimationFrame(draw);
	}

	function handleDeviceChange(deviceId: string) {
		tuner.state.selectedDeviceId = deviceId;
	}

	onMount(async () => {
		if (canvasEl) {
			ctx = canvasEl.getContext('2d');
		}
		if (phaseCanvasEl) {
			phaseCtx = phaseCanvasEl.getContext('2d');
		}

		resizeObserver = new ResizeObserver(() => {
			const dpr = devicePixelRatio || 1;
			if (canvasEl) {
				canvasEl.width = canvasEl.clientWidth * dpr;
				canvasEl.height = 280 * dpr;
			}
			if (phaseCanvasEl) {
				phaseCanvasEl.width = phaseCanvasEl.clientWidth * dpr;
				phaseCanvasEl.height = 280 * dpr;
			}
		});
		if (canvasEl) resizeObserver.observe(canvasEl);
		if (phaseCanvasEl) resizeObserver.observe(phaseCanvasEl);

		tuner.checkSupport();
		tuner.refreshDevices();
		startSampling();
		scheduleNextFrame();

		// Default to looping the bundled test audio until the user opts into the mic
		await tuner.startWithFile('/test-audio.wav');
	});

	onDestroy(() => {
		stopSampling();
		if (animationId) cancelAnimationFrame(animationId);
		if (resizeObserver) {
			if (canvasEl) resizeObserver.unobserve(canvasEl);
			if (phaseCanvasEl) resizeObserver.unobserve(phaseCanvasEl);
		}
		tuner.destroy();
	});
</script>

<div class="min-h-screen bg-off-white py-12">
	<div class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4">
		<header class="flex flex-col gap-2">
			<p class="text-sm tracking-[0.08em] text-slate-500 uppercase">Audio analysis</p>
			<h1 class="text-2xl font-semibold">Incoming audio (last 10s)</h1>
			<p class="text-sm text-slate-700">
				Microphone input visualized in near-real-time as a running spectrum heatmap with a white
				amplitude trace over the last ten seconds.
			</p>
		</header>

		<div class="flex flex-col gap-4">
			<div class="rounded-2xl bg-white p-4 shadow-sm">
				<div class="mb-2 flex items-center justify-between">
					<p class="text-sm font-semibold text-slate-700">
						Spectrum heatmap & amplitude (last 10s)
					</p>
					{#if tuner.state.note}
						<span class="rounded-full bg-dark-blue px-3 py-1 text-xs font-semibold text-white">
							{tuner.state.note}
						</span>
					{:else}
						<span class="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
							>—</span
						>
					{/if}
				</div>
				<canvas bind:this={canvasEl} class="h-72 w-full rounded-xl bg-slate-900"></canvas>
			</div>
			<div class="rounded-2xl bg-white p-4 shadow-sm">
				<div class="mb-2 flex items-center justify-between">
					<p class="text-sm font-semibold text-slate-700">Phase information (last 10s)</p>
					<span class="text-xs text-slate-500">Cyclical hue = phase angle</span>
				</div>
				<canvas bind:this={phaseCanvasEl} class="h-72 w-full rounded-xl bg-slate-900"></canvas>
			</div>
			<div class="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
				{#if tuner.state.needsUserGesture}
					<div
						class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
					>
						Audio is blocked until you click. Click “Enable audio” to resume.
					</div>
				{/if}

				<div class="mb-2">
					<p class="mb-2 text-sm font-semibold text-slate-700">Audio Source</p>
					<div class="flex gap-2">
						<button
							class={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:shadow ${tuner.sourceType === 'file' ? 'bg-dark-blue text-white' : 'bg-slate-100 text-slate-600'}`}
							onclick={async () => {
								await tuner.startWithFile('/test-audio.wav');
							}}
							type="button"
						>
							Test Audio File
						</button>
						<button
							class={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:shadow ${tuner.sourceType === 'microphone' ? 'bg-dark-blue text-white' : 'bg-slate-100 text-slate-600'}`}
							onclick={async () => {
								await tuner.start();
							}}
							type="button"
						>
							Microphone
						</button>
					</div>
				</div>

				{#if tuner.sourceType === 'microphone'}
					<MicrophoneSelector
						tunerState={tuner.state}
						onStartListening={tuner.start}
						onDeviceChange={handleDeviceChange}
					/>
				{/if}

				<button
					class={`rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px hover:shadow ${tuner.state.isListening ? 'bg-slate-600' : 'bg-dark-blue'}`}
					onclick={async () => {
						if (tuner.state.needsUserGesture) {
							await tuner.resumeAfterGesture(
								tuner.sourceType === 'microphone' ? undefined : '/test-audio.wav'
							);
							return;
						}

						if (tuner.state.isListening) {
							tuner.stop();
						} else if (tuner.sourceType === 'microphone') {
							await tuner.start();
						} else {
							await tuner.startWithFile('/test-audio.wav');
						}
					}}
					type="button"
				>
					{tuner.state.needsUserGesture
						? 'Enable audio'
						: tuner.state.isListening
							? 'Stop'
							: 'Start'}
				</button>
			</div>
		</div>
	</div>
</div>
