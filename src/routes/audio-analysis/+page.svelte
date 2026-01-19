<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { DEFAULT_A4 } from '$lib/tuner/tune';
	import { onsetDetectionConfig } from '$lib/config/onset';
	import SharePreview from '$lib/components/SharePreview.svelte';

	let { data } = $props();

	const HISTORY_MS = 10_000;
	const SAMPLE_INTERVAL_MS = 16; // ~60fps sampling for the history buffer

	// Track all onset events (not just note state changes)
	let onsetEvents: { timestamp: number; rule: string | null; frequency: number }[] = [];

	const tuner = createTuner({
		a4: DEFAULT_A4,
		accidental: 'sharp',
		debug: false,
		gain: 15,
		maxGain: 50,
		onsetMode: 'algorithmic',
		onOnset: (event) => {
			// Capture every onset detection
			onsetEvents.push({
				timestamp: event.timestamp,
				rule: event.rule,
				frequency: event.frequency
			});
		}
	});

	let spectrumCanvasEl: HTMLCanvasElement | null = null;
	let fluxCanvasEl: HTMLCanvasElement | null = null;
	let mlProbCanvasEl: HTMLCanvasElement | null = null;
	let fundamentalPhaseCanvasEl: HTMLCanvasElement | null = null;
	let spectrumCtx: CanvasRenderingContext2D | null = null;
	let fluxCtx: CanvasRenderingContext2D | null = null;
	let mlProbCtx: CanvasRenderingContext2D | null = null;
	let fundamentalPhaseCtx: CanvasRenderingContext2D | null = null;
	let animationId: number | null = null;
	let sampleTimer: number | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let shouldPlayOnStart = false; // Track if start button was explicitly clicked
	let selectedSource: 'file' | 'microphone' = $state('file'); // Track selected source locally

	let history: {
		t: number;
		amp: number;
		spectrum: Uint8Array | null;
		phases: Float32Array | null;
		onset: boolean;
		rule: string | null; // Which rule triggered this onset (A, B1, B2, B3, B4, B5, B6, C, D)
		active: boolean;
		frequency?: number | null;
		phaseDeviation: number;
		spectralFlux: number;
		mlOnsetDetected: boolean; // ML model prediction
		mlOnsetProbability: number; // ML model probability
	}[] = [];
	let prevNoteActive = false;

	function startSampling() {
		stopSampling();
		onsetEvents = []; // Clear onset events when starting
		sampleTimer = window.setInterval(() => {
			const now = performance.now();
			const isActive = tuner.state.isNoteActive;

			// Use spectral flux and phase deviation directly from tuner state
			const spectralFlux = tuner.state.spectralFlux;
			const phaseDeviation = tuner.state.phaseDeviation;

			// Check if there are any onset events in this sample window
			// (find onsets that happened since the last sample)
			const lastSampleTime =
				history.length > 0 ? history[history.length - 1].t : now - SAMPLE_INTERVAL_MS;
			const newOnsets = onsetEvents.filter(
				(evt) => evt.timestamp > lastSampleTime && evt.timestamp <= now
			);

			// For each new onset, create a history entry at its exact timestamp
			for (const evt of newOnsets) {
				history.push({
					t: evt.timestamp,
					amp: tuner.state.amplitude,
					spectrum: tuner.state.spectrum ? new Uint8Array(tuner.state.spectrum) : null,
					phases: tuner.state.phases ? new Float32Array(tuner.state.phases) : null,
					onset: true,
					rule: evt.rule,
					active: isActive,
					frequency: evt.frequency,
					phaseDeviation,
					spectralFlux,
					mlOnsetDetected: tuner.state.mlOnsetDetected,
					mlOnsetProbability: tuner.state.mlOnsetProbability
				});
			}

			// Add regular sample point (no onset flag unless it just happened)
			history.push({
				t: now,
				amp: tuner.state.amplitude,
				spectrum: tuner.state.spectrum ? new Uint8Array(tuner.state.spectrum) : null,
				phases: tuner.state.phases ? new Float32Array(tuner.state.phases) : null,
				onset: false,
				rule: null,
				active: isActive,
				frequency: tuner.state.frequency ?? null,
				phaseDeviation,
				spectralFlux,
				mlOnsetDetected: tuner.state.mlOnsetDetected,
				mlOnsetProbability: tuner.state.mlOnsetProbability
			});

			history = history.filter((h) => h.t >= now - HISTORY_MS);
			onsetEvents = onsetEvents.filter((evt) => evt.timestamp >= now - HISTORY_MS);
		}, SAMPLE_INTERVAL_MS);
	}

	function stopSampling() {
		if (sampleTimer !== null) {
			clearInterval(sampleTimer);
			sampleTimer = null;
		}
		onsetEvents = [];
	}

	function draw() {
		if (!spectrumCtx || !spectrumCanvasEl) return;
		drawSpectrum();
		drawMLProbability();
		drawSpectralFlux();
		drawFundamentalPhase();
		scheduleNextFrame();
	}

	function drawSpectrum() {
		if (!spectrumCtx || !spectrumCanvasEl) return;
		const c = spectrumCtx;
		const canvas = spectrumCanvasEl;
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

		// Note onsets as dots at y-position based on rule
		// Rules mapped to y-positions: A, B1, B2, B3, B4, B5, B6, C, D
		const ruleToY = (rule: string | null): number => {
			const ruleOrder: { [key: string]: number } = {
				A: 0,
				B1: 1,
				B2: 2,
				B3: 3,
				B4: 4,
				B5: 5,
				B6: 6,
				C: 7,
				D: 8
			};
			const idx = rule ? (ruleOrder[rule] ?? -1) : -1;
			if (idx < 0) return topMarkY;
			return topMarkY + idx * 24; // Space rules 24px apart
		};

		// Draw onset markers and note-duration lines tied to the onset
		for (let i = 0; i < history.length; i++) {
			const h = history[i];
			if (!h.onset) continue;
			const x = ((h.t - oldest) / HISTORY_MS) * width;
			const y = ruleToY(h.rule);

			// Find the end of the active segment that starts at this onset
			let j = i;
			while (j + 1 < history.length && history[j + 1].active) {
				j++;
			}
			const segmentEndT = history[j + 1]?.t ?? now;
			const xEnd = ((segmentEndT - oldest) / HISTORY_MS) * width;

			// Draw horizontal dashed line from onset to the end of this note's active segment
			c.strokeStyle = 'rgba(251, 191, 36, 1)';
			c.lineWidth = 1;
			c.beginPath();
			c.moveTo(x, y);
			c.lineTo(Math.min(xEnd, width), y);
			c.stroke();
			c.setLineDash([]);

			// Draw onset dot
			c.fillStyle = '#fbbf24';
			c.beginPath();
			c.arc(x, y, 5, 0, Math.PI * 2);
			c.fill();

			// Draw rule label at the onset position
			if (h.rule) {
				c.fillStyle = '#fbbf24';
				c.font = '8px monospace';
				c.fillText(h.rule, x + 7, y + 8);
			}
		}

		// Removed top active note line; note-duration lines are tied to onsets at rule-specific Y

		// Draw rule labels on the left side
		c.fillStyle = '#94a3b8';
		c.font = '24px monospace';
		c.textAlign = 'right';
		const ruleLabels: { [key: string]: string } = {
			A: 'Pitch Change',
			B1: 'Excitation-Only',
			B2: 'Phase-Dominant',
			B3: 'Strong Excitation',
			B4: 'Harmonic Flux',
			B5: 'Legato Rebound',
			B6: 'Burst-on-Rise',
			C: 'Raw Phase',
			D: 'Soft Attack'
		};
		const rules = ['A', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'C', 'D'];
		rules.forEach((rule) => {
			const y = ruleToY(rule);
			c.fillText(ruleLabels[rule], width - 8, y + 3);
		});

		// Draw ML onset detection as a separate line at the bottom
		const mlY = topMarkY + 10 * 24; // Below all rule lines
		c.fillStyle = '#8b5cf6'; // Purple for ML
		c.font = '24px monospace';
		c.textAlign = 'right';
		c.fillText('ML Model', width - 8, mlY + 3);

		// Draw ML onset markers
		for (let i = 0; i < history.length; i++) {
			const h = history[i];
			if (!h.mlOnsetDetected) continue;
			const x = ((h.t - oldest) / HISTORY_MS) * width;

			// Draw ML onset dot (purple)
			c.fillStyle = h.onset ? '#22c55e' : '#8b5cf6'; // Green if both detected, purple if ML only
			c.beginPath();
			c.arc(x, mlY, h.onset ? 6 : 4, 0, Math.PI * 2); // Larger if both systems agree
			c.fill();

			// Show probability on hover (simplified: just show prob as text)
			if (h.mlOnsetProbability > 0.7) {
				c.fillStyle = '#8b5cf6';
				c.font = '8px monospace';
				c.fillText((h.mlOnsetProbability * 100).toFixed(0) + '%', x + 7, mlY - 5);
			}
		}
	}

	function drawMLProbability() {
		if (!mlProbCtx || !mlProbCanvasEl) return;
		const c = mlProbCtx;
		const canvas = mlProbCanvasEl;
		const now = performance.now();

		const { width, height } = canvas;
		c.clearRect(0, 0, width, height);

		c.fillStyle = '#0b1226';
		c.fillRect(0, 0, width, height);

		if (!history.length) {
			c.fillStyle = '#cbd5e1';
			c.font = '12px sans-serif';
			c.fillText('No data yet...', 12, 20);
			return;
		}

		const oldest = now - HISTORY_MS;
		const paddingTop = 6;
		const paddingBottom = 20;
		const graphHeight = height - paddingTop - paddingBottom;
		const baseline = paddingTop + graphHeight;

		// Draw probability as filled area (0-1)
		c.fillStyle = 'rgba(139, 92, 246, 0.35)';
		c.beginPath();
		c.moveTo(0, baseline);
		history.forEach((h, idx) => {
			const x = ((h.t - oldest) / HISTORY_MS) * width;
			const y = baseline - Math.min(Math.max(h.mlOnsetProbability, 0), 1) * graphHeight;
			if (idx === 0) {
				c.lineTo(x, y);
			} else {
				c.lineTo(x, y);
			}
		});
		c.lineTo(width, baseline);
		c.closePath();
		c.fill();

		// Outline
		c.strokeStyle = '#8b5cf6';
		c.lineWidth = 1.5;
		c.beginPath();
		history.forEach((h, idx) => {
			const x = ((h.t - oldest) / HISTORY_MS) * width;
			const y = baseline - Math.min(Math.max(h.mlOnsetProbability, 0), 1) * graphHeight;
			if (idx === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		});
		c.stroke();

		// Threshold marker at 0.5
		c.strokeStyle = 'rgba(255, 255, 255, 0.3)';
		c.setLineDash([4, 4]);
		c.beginPath();
		c.moveTo(0, baseline - 0.5 * graphHeight);
		c.lineTo(width, baseline - 0.5 * graphHeight);
		c.stroke();
		c.setLineDash([]);

		// Onset markers
		history.forEach((h, idx) => {
			if (!h.mlOnsetDetected) return;
			const nextT = history[idx + 1]?.t ?? now;
			const x = ((h.t - oldest) / HISTORY_MS) * width;
			const xNext = ((nextT - oldest) / HISTORY_MS) * width;
			const columnWidth = Math.max(2, Math.ceil(xNext - x));
			c.fillStyle = '#f472b6';
			c.fillRect(x, paddingTop - 1, columnWidth, graphHeight + 2);
		});

		// Labels
		c.fillStyle = '#cbd5e1';
		c.font = '10px monospace';
		c.textAlign = 'left';
		c.fillText('ML probability', 8, paddingTop + 10);
		c.textAlign = 'right';
		c.fillText('1.0', width - 8, paddingTop + 10);
		c.fillText('0.0', width - 8, baseline + 12);
	}

	function drawSpectralFlux() {
		if (!fluxCtx || !fluxCanvasEl) return;
		const c = fluxCtx;
		const canvas = fluxCanvasEl;
		const now = performance.now();

		const { width, height } = canvas;
		c.clearRect(0, 0, width, height);

		// Dark background
		c.fillStyle = '#0b1226';
		c.fillRect(0, 0, width, height);

		if (!history.length) {
			c.fillStyle = '#cbd5e1';
			c.font = '12px sans-serif';
			c.fillText('No data yet...', 12, 20);
			return;
		}

		const oldest = now - HISTORY_MS;
		const paddingTop = 6;
		const paddingBottom = 20;
		const graphHeight = height - paddingTop - paddingBottom;
		const baseline = paddingTop + graphHeight;

		// Find max flux for scaling
		const maxFlux = Math.max(...history.map((h) => h.spectralFlux), 0.001);
		const yScale = graphHeight / maxFlux;

		// Draw spectral flux as a filled area
		c.fillStyle = 'rgba(79, 172, 254, 0.6)'; // light blue with transparency
		c.beginPath();
		c.moveTo(0, baseline);
		history.forEach((h, idx) => {
			const x = ((h.t - oldest) / HISTORY_MS) * width;
			const y = baseline - h.spectralFlux * yScale;
			if (idx === 0) {
				c.lineTo(x, y);
			} else {
				c.lineTo(x, y);
			}
		});
		c.lineTo(width, baseline);
		c.closePath();
		c.fill();

		// Draw outline
		c.strokeStyle = '#4face';
		c.lineWidth = 1.5;
		c.beginPath();
		history.forEach((h, idx) => {
			const x = ((h.t - oldest) / HISTORY_MS) * width;
			const y = baseline - h.spectralFlux * yScale;
			if (idx === 0) {
				c.moveTo(x, y);
			} else {
				c.lineTo(x, y);
			}
		});
		c.stroke();

		// Draw threshold lines
		c.font = '9px monospace';
		c.textAlign = 'right';

		// B1 threshold (moderate)
		const b1Y = baseline - onsetDetectionConfig.b1_minNormalizedExcitation * yScale;
		if (b1Y > paddingTop && b1Y < baseline) {
			c.strokeStyle = 'rgba(34, 197, 94, 0.5)'; // green
			c.lineWidth = 1;
			c.setLineDash([2, 2]);
			c.beginPath();
			c.moveTo(0, b1Y);
			c.lineTo(width - 4, b1Y);
			c.stroke();
			c.fillStyle = '#22c55e';
			c.fillText('B1', width - 4, b1Y - 2);
		}

		c.setLineDash([]);

		// Add grid lines and labels
		c.strokeStyle = 'rgba(148, 163, 184, 0.2)';
		c.lineWidth = 1;
		c.fillStyle = '#94a3b8';

		// Grid at 25%, 50%, 75%, 100%
		for (let i = 1; i <= 4; i++) {
			const y = baseline - (graphHeight / 4) * i;
			c.beginPath();
			c.moveTo(0, y);
			c.lineTo(width - 4, y);
			c.stroke();
		}
		c.fillText(`${(maxFlux * 0.75).toFixed(2)}`, width - 4, baseline - (graphHeight / 4) * 3 - 2);
		c.fillText(`${(maxFlux * 0.5).toFixed(2)}`, width - 4, baseline - (graphHeight / 4) * 2 + 4);
		c.fillText(`0`, width - 4, baseline + 12);
	}

	function drawFundamentalPhase() {
		if (!fundamentalPhaseCtx || !fundamentalPhaseCanvasEl) return;
		const c = fundamentalPhaseCtx;
		const canvas = fundamentalPhaseCanvasEl;
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
		const graphHeight = height - paddingTop - paddingBottom;
		const baseline = paddingTop + graphHeight;

		// Find max phase deviation for scaling
		// This is the phase COHERENCE metric - how many bins deviate from expected phase advance
		const maxPhaseDeviation = Math.max(...history.map((h) => h.phaseDeviation), 0.001);
		const phaseDevScale = graphHeight / maxPhaseDeviation;

		// Draw phase deviation as a filled area (shows unexpected phase shifts across the spectrum)
		c.fillStyle = 'rgba(167, 139, 250, 0.4)'; // purple with transparency
		c.beginPath();
		c.moveTo(0, baseline);
		history.forEach((h, idx) => {
			const x = ((h.t - oldest) / HISTORY_MS) * width;
			const y = baseline - h.phaseDeviation * phaseDevScale;
			if (idx === 0) {
				c.lineTo(x, y);
			} else {
				c.lineTo(x, y);
			}
		});
		c.lineTo(width, baseline);
		c.closePath();
		c.fill();

		// Draw outline
		c.strokeStyle = '#a78bfa'; // purple
		c.lineWidth = 2;
		c.beginPath();
		history.forEach((h, idx) => {
			const x = ((h.t - oldest) / HISTORY_MS) * width;
			const y = baseline - h.phaseDeviation * phaseDevScale;
			if (idx === 0) {
				c.moveTo(x, y);
			} else {
				c.lineTo(x, y);
			}
		});
		c.stroke();

		// Draw Rule C threshold (raw phase deviation)
		// Note: Threshold visualization removed - config not exposed to this visualization layer
		// This is the threshold for detecting onsets based on phase incoherence

		c.setLineDash([]);

		// Draw baseline
		c.strokeStyle = 'rgba(148, 163, 184, 0.3)';
		c.lineWidth = 1;
		c.setLineDash([4, 4]);
		c.beginPath();
		c.moveTo(0, baseline);
		c.lineTo(width, baseline);
		c.stroke();
		c.setLineDash([]);

		// Add phase deviation legend labels
		c.fillStyle = '#94a3b8';
		c.font = '9px monospace';
		c.textAlign = 'right';
		c.fillText('Phase coherence (full spectrum)', width - 4, paddingTop + 10);
		c.fillText(
			`${(maxPhaseDeviation * 0.5).toFixed(2)}`,
			width - 4,
			baseline - graphHeight / 2 + 4
		);
		c.fillText('0 (coherent)', width - 4, baseline + 12);
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

	async function handleSourceChange(sourceType: 'file' | 'microphone') {
		// Update the selected source
		selectedSource = sourceType;
		// When source changes, don't auto-play - wait for start button
		shouldPlayOnStart = false;
		stopSampling();
		startSampling();
		// Note: Audio source will be set when user clicks Start button
	}

	onMount(async () => {
		if (spectrumCanvasEl) {
			spectrumCtx = spectrumCanvasEl.getContext('2d');
		}
		if (fluxCanvasEl) {
			fluxCtx = fluxCanvasEl.getContext('2d');
		}
		if (mlProbCanvasEl) {
			mlProbCtx = mlProbCanvasEl.getContext('2d');
		}
		if (fundamentalPhaseCanvasEl) {
			fundamentalPhaseCtx = fundamentalPhaseCanvasEl.getContext('2d');
		}

		resizeObserver = new ResizeObserver(() => {
			const dpr = devicePixelRatio || 1;
			if (spectrumCanvasEl) {
				spectrumCanvasEl.width = spectrumCanvasEl.clientWidth * dpr;
				spectrumCanvasEl.height = 280 * dpr;
			}
			if (fluxCanvasEl) {
				fluxCanvasEl.width = fluxCanvasEl.clientWidth * dpr;
				fluxCanvasEl.height = 100 * dpr;
			}
			if (mlProbCanvasEl) {
				mlProbCanvasEl.width = mlProbCanvasEl.clientWidth * dpr;
				mlProbCanvasEl.height = 90 * dpr;
			}
			if (fundamentalPhaseCanvasEl) {
				fundamentalPhaseCanvasEl.width = fundamentalPhaseCanvasEl.clientWidth * dpr;
				fundamentalPhaseCanvasEl.height = 160 * dpr;
			}
		});
		if (spectrumCanvasEl) resizeObserver.observe(spectrumCanvasEl);
		if (fluxCanvasEl) resizeObserver.observe(fluxCanvasEl);
		if (mlProbCanvasEl) resizeObserver.observe(mlProbCanvasEl);
		if (fundamentalPhaseCanvasEl) resizeObserver.observe(fundamentalPhaseCanvasEl);

		tuner.checkSupport();
		tuner.refreshDevices();
		startSampling();
		scheduleNextFrame();

		// Don't auto-start audio - wait for user to click Start button
	});

	onDestroy(() => {
		stopSampling();
		if (animationId) cancelAnimationFrame(animationId);
		if (resizeObserver) {
			if (spectrumCanvasEl) resizeObserver.unobserve(spectrumCanvasEl);
			if (fluxCanvasEl) resizeObserver.unobserve(fluxCanvasEl);
			if (mlProbCanvasEl) resizeObserver.unobserve(mlProbCanvasEl);
			if (fundamentalPhaseCanvasEl) resizeObserver.unobserve(fundamentalPhaseCanvasEl);
		}
		tuner.destroy();
	});
</script>

<SharePreview data={data.sharePreviewData} />

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
				<PillSelector
					options={[
						{ value: 'file', label: 'Test Audio File' },
						{ value: 'microphone', label: 'Microphone' }
					]}
					selected={selectedSource}
					onSelect={handleSourceChange}
					ariaLabel="Select audio source"
				/>
			</div>

			{#if selectedSource === 'microphone'}
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
							selectedSource === 'microphone' ? undefined : '/test-audio.wav'
						);
						return;
					}

					if (tuner.state.isListening) {
						stopSampling();
						tuner.stop();
					} else if (selectedSource === 'microphone') {
						startSampling();
						await tuner.start();
					} else {
						startSampling();
						await tuner.startWithFile('/test-audio.wav');
					}
				}}
				type="button"
			>
				{tuner.state.needsUserGesture ? 'Enable audio' : tuner.state.isListening ? 'Stop' : 'Start'}
			</button>
		</div>

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
				<canvas bind:this={spectrumCanvasEl} class="h-72 w-full rounded-xl bg-slate-900"></canvas>
			</div>
			<div class="rounded-2xl bg-white p-4 shadow-sm">
				<div class="mb-2 flex items-center justify-between">
					<p class="text-sm font-semibold text-slate-700">ML probability (last 10s)</p>
					<span class="text-xs text-slate-500">0 → 1</span>
				</div>
				<canvas bind:this={mlProbCanvasEl} class="h-24 w-full rounded-xl bg-slate-900"></canvas>
			</div>
			<div class="rounded-2xl bg-white p-4 shadow-sm">
				<div class="mb-2">
					<p class="text-sm font-semibold text-slate-700">Spectral flux (last 10s)</p>
				</div>
				<canvas bind:this={fluxCanvasEl} class="h-24 w-full rounded-xl bg-slate-900"></canvas>
			</div>
			<div class="rounded-2xl bg-white p-4 shadow-sm">
				<div class="mb-2">
					<p class="text-sm font-semibold text-slate-700">Phase coherence (last 10s)</p>
				</div>
				<canvas bind:this={fundamentalPhaseCanvasEl} class="h-40 w-full rounded-xl bg-slate-900"
				></canvas>
			</div>
		</div>
	</div>
</div>
