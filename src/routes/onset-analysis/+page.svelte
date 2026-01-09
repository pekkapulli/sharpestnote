<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { DEFAULT_A4 } from '$lib/tuner/tune';
	import { onsetDetectionConfig, type OnsetDetectionConfig } from '$lib/config/onset';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import { createSynth } from '$lib/synth/useSynth.svelte';
	import type { MelodyItem } from '$lib/config/melody';

	// Create mutable config that we can edit
	let config = $state({ ...onsetDetectionConfig });

	// Update global config when local config changes
	$effect(() => {
		Object.assign(onsetDetectionConfig, config);
	});

	let { data } = $props();

	// Create synth instance
	const synth = createSynth({
		waveform: 'sine',
		volume: 0.25,
		attack: 0.02,
		decay: 0.1,
		sustain: 0.7,
		release: 0.1,
		a4: DEFAULT_A4,
		reverbMix: 0.1,
		reverbDecay: 2
	});

	const HISTORY_MS = 10_000;
	const SAMPLE_INTERVAL_MS = 16; // ~60fps sampling for the history buffer
	const MAX_ONSET_LATENCY_MS = 1000;

	const tuner = createTuner({
		a4: DEFAULT_A4,
		accidental: 'sharp',
		debug: false,
		gain: 15,
		maxGain: 500,
		autoGain: true,
		onOnset: (event) => {
			pendingOnset = {
				timestamp: event.timestamp,
				rule: event.rule ?? null
			};

			if (lastNoteStartTime !== null && onsetLatencyStatus === 'waiting') {
				const latency = event.timestamp - lastNoteStartTime;
				lastOnsetLatency = latency;
				onsetLatencyStatus = 'detected';

				latencyHistory.push({
					attempt: latencyHistory.length + 1,
					noteName: selectedNote,
					latency,
					timestamp: event.timestamp
				});
				latencyHistory = latencyHistory;
			}
		}
	});

	let spectrumCanvasEl: HTMLCanvasElement | null = null;
	let fluxCanvasEl: HTMLCanvasElement | null = null;
	let fundamentalPhaseCanvasEl: HTMLCanvasElement | null = null;
	let latencyChartCanvasEl: HTMLCanvasElement | null = null;
	let spectrumCtx: CanvasRenderingContext2D | null = null;
	let fluxCtx: CanvasRenderingContext2D | null = null;
	let fundamentalPhaseCtx: CanvasRenderingContext2D | null = null;
	let latencyChartCtx: CanvasRenderingContext2D | null = null;
	let animationId: number | null = null;
	let sampleTimer: number | null = null;
	let resizeObserver: ResizeObserver | null = null;

	// Synth state
	let selectedNote = $state('C4');
	let tempo = $state(120); // BPM
	let isPlayingNote = $state(false);
	let lastNoteStartTime: number | null = null;
	let lastOnsetLatency: number | null = $state(null);
	let onsetLatencyStatus: 'waiting' | 'detected' | 'missed' = $state('waiting');

	// Latency history
	type LatencyRecord = {
		attempt: number;
		noteName: string;
		latency: number | null; // null means missed
		timestamp: number;
	};
	let latencyHistory: LatencyRecord[] = $state([]);
	let pendingOnset: { timestamp: number; rule: string | null } | null = null;

	const availableNotes = [
		'C3',
		'D3',
		'E3',
		'F3',
		'G3',
		'A3',
		'B3',
		'C4',
		'D4',
		'E4',
		'F4',
		'G4',
		'A4',
		'B4',
		'C5'
	];

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
	}[] = [];

	function startSampling() {
		stopSampling();
		sampleTimer = window.setInterval(() => {
			const now = performance.now();
			const isActive = tuner.state.isNoteActive;
			// Use explicit onset events from tuner callback for accurate timing
			const onset = pendingOnset ? now - pendingOnset.timestamp <= SAMPLE_INTERVAL_MS * 1.5 : false;
			const rule = onset && pendingOnset ? pendingOnset.rule : null;
			if (onset) pendingOnset = null;

			// Use spectral flux and phase deviation directly from tuner state
			const spectralFlux = tuner.state.spectralFlux;
			const phaseDeviation = tuner.state.phaseDeviation;

			// Check if we've missed the onset (>500ms)
			if (lastNoteStartTime !== null && onsetLatencyStatus === 'waiting') {
				const timeSinceNote = now - lastNoteStartTime;
				if (timeSinceNote > MAX_ONSET_LATENCY_MS) {
					onsetLatencyStatus = 'missed';
					lastOnsetLatency = null;
					console.log('[Onset] MISSED - no detection within 1000ms');

					// Add to history as missed
					latencyHistory.push({
						attempt: latencyHistory.length + 1,
						noteName: selectedNote,
						latency: null,
						timestamp: now
					});
					latencyHistory = latencyHistory; // trigger reactivity
				}
			}

			history.push({
				t: now,
				amp: tuner.state.amplitude,
				spectrum: tuner.state.spectrum ? new Uint8Array(tuner.state.spectrum) : null,
				phases: tuner.state.phases ? new Float32Array(tuner.state.phases) : null,
				onset,
				rule,
				active: isActive,
				frequency: tuner.state.frequency ?? null,
				phaseDeviation,
				spectralFlux
			});
			history = history.filter((h) => h.t >= now - HISTORY_MS);
		}, SAMPLE_INTERVAL_MS);
	}

	function stopSampling() {
		if (sampleTimer !== null) {
			clearInterval(sampleTimer);
			sampleTimer = null;
		}
	}

	function draw() {
		if (!spectrumCtx || !spectrumCanvasEl) return;
		drawSpectrum();
		drawSpectralFlux();
		drawFundamentalPhase();
		drawLatencyChart();
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
		const paddingTop = 8;
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

	function drawLatencyChart() {
		if (!latencyChartCtx || !latencyChartCanvasEl) return;
		const c = latencyChartCtx;
		const canvas = latencyChartCanvasEl;
		const { width, height } = canvas;

		c.clearRect(0, 0, width, height);

		// Dark background
		c.fillStyle = '#0b1226';
		c.fillRect(0, 0, width, height);

		if (latencyHistory.length === 0) {
			c.fillStyle = '#cbd5e1';
			c.font = '12px sans-serif';
			c.fillText('No attempts yet...', 12, 20);
			return;
		}

		const paddingTop = 20;
		const paddingBottom = 40;
		const paddingLeft = 40;
		const paddingRight = 20;
		const graphHeight = height - paddingTop - paddingBottom;
		const graphWidth = width - paddingLeft - paddingRight;
		const baseline = paddingTop + graphHeight;

		// Draw axes
		c.strokeStyle = '#475569';
		c.lineWidth = 1;
		c.beginPath();
		c.moveTo(paddingLeft, paddingTop);
		c.lineTo(paddingLeft, baseline);
		c.lineTo(paddingLeft + graphWidth, baseline);
		c.stroke();

		// Y-axis labels (time in ms)
		c.fillStyle = '#94a3b8';
		c.font = '10px monospace';
		c.textAlign = 'right';
		const maxLatency = 500;
		for (let i = 0; i <= 5; i++) {
			const ms = i * 100;
			const y = baseline - (ms / maxLatency) * graphHeight;
			c.fillText(`${ms}ms`, paddingLeft - 5, y + 4);

			// Grid line
			c.strokeStyle = 'rgba(148, 163, 184, 0.1)';
			c.beginPath();
			c.moveTo(paddingLeft, y);
			c.lineTo(paddingLeft + graphWidth, y);
			c.stroke();
		}

		// Draw bars
		const barWidth = Math.min(graphWidth / latencyHistory.length, 40);
		const spacing = graphWidth / latencyHistory.length;

		latencyHistory.forEach((record, idx) => {
			const x = paddingLeft + idx * spacing + spacing / 2 - barWidth / 2;

			if (record.latency === null) {
				// Missed - draw red bar at max height
				c.fillStyle = '#ef4444';
				const barHeight = graphHeight;
				c.fillRect(x, baseline - barHeight, barWidth, barHeight);
			} else {
				// Detected - draw green bar
				const barHeight = (record.latency / maxLatency) * graphHeight;
				c.fillStyle = '#22c55e';
				c.fillRect(x, baseline - barHeight, barWidth, barHeight);

				// Draw latency value on top
				c.fillStyle = '#ffffff';
				c.font = '9px monospace';
				c.textAlign = 'center';
				c.fillText(`${record.latency.toFixed(0)}`, x + barWidth / 2, baseline - barHeight - 4);
			}

			// X-axis label (attempt number)
			c.fillStyle = '#94a3b8';
			c.font = '10px monospace';
			c.textAlign = 'center';
			c.fillText(`#${record.attempt}`, x + barWidth / 2, baseline + 15);

			// Note name
			c.fillStyle = '#64748b';
			c.font = '8px monospace';
			c.fillText(record.noteName, x + barWidth / 2, baseline + 28);
		});

		// Axis labels
		c.fillStyle = '#cbd5e1';
		c.font = '11px sans-serif';
		c.textAlign = 'center';
		c.fillText('Attempt #', paddingLeft + graphWidth / 2, height - 5);

		c.save();
		c.translate(10, paddingTop + graphHeight / 2);
		c.rotate(-Math.PI / 2);
		c.fillText('Latency (ms)', 0, 0);
		c.restore();
	}

	function scheduleNextFrame() {
		animationId = requestAnimationFrame(draw);
	}

	function handleDeviceChange(deviceId: string) {
		tuner.state.selectedDeviceId = deviceId;
	}

	// Play a note with the synth
	async function playTestNote() {
		if (isPlayingNote) return;

		// Stop any lingering notes first
		synth.stopAll();

		// Reset latency tracking
		lastNoteStartTime = performance.now();
		lastOnsetLatency = null;
		onsetLatencyStatus = 'waiting';

		isPlayingNote = true;
		const note: MelodyItem = {
			note: selectedNote,
			length: 4 // quarter note (4 sixteenths)
		};

		try {
			await synth.playNote(note, tempo);
		} catch (error) {
			console.error('Error playing note:', error);
		} finally {
			isPlayingNote = false;
		}
	}

	// Play a random note
	async function playRandomNote() {
		if (isPlayingNote) return;

		// Stop any lingering notes first
		synth.stopAll();

		// Reset latency tracking
		lastNoteStartTime = performance.now();
		lastOnsetLatency = null;
		onsetLatencyStatus = 'waiting';

		// Select random note
		const randomIndex = Math.floor(Math.random() * availableNotes.length);
		const randomNote = availableNotes[randomIndex];
		selectedNote = randomNote;

		isPlayingNote = true;
		const note: MelodyItem = {
			note: randomNote,
			length: 4 // quarter note (4 sixteenths)
		};

		try {
			console.log('[Test] Playing random note:', randomNote);
			await synth.playNote(note, tempo);
		} catch (error) {
			console.error('Error playing note:', error);
		} finally {
			isPlayingNote = false;
		}
	}

	function stopSynth() {
		synth.stopAll();
		isPlayingNote = false;
	}

	onMount(() => {
		if (spectrumCanvasEl) {
			spectrumCtx = spectrumCanvasEl.getContext('2d');
		}
		if (fluxCanvasEl) {
			fluxCtx = fluxCanvasEl.getContext('2d');
		}
		if (fundamentalPhaseCanvasEl) {
			fundamentalPhaseCtx = fundamentalPhaseCanvasEl.getContext('2d');
		}
		if (latencyChartCanvasEl) {
			latencyChartCtx = latencyChartCanvasEl.getContext('2d');
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
			if (fundamentalPhaseCanvasEl) {
				fundamentalPhaseCanvasEl.width = fundamentalPhaseCanvasEl.clientWidth * dpr;
				fundamentalPhaseCanvasEl.height = 160 * dpr;
			}
			if (latencyChartCanvasEl) {
				latencyChartCanvasEl.width = latencyChartCanvasEl.clientWidth * dpr;
				latencyChartCanvasEl.height = 200 * dpr;
			}
		});
		if (spectrumCanvasEl) resizeObserver.observe(spectrumCanvasEl);
		if (fluxCanvasEl) resizeObserver.observe(fluxCanvasEl);
		if (fundamentalPhaseCanvasEl) resizeObserver.observe(fundamentalPhaseCanvasEl);
		if (latencyChartCanvasEl) resizeObserver.observe(latencyChartCanvasEl);

		tuner.checkSupport();
		tuner.refreshDevices();
		startSampling();
		scheduleNextFrame();

		// Add keyboard listener for space key
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === 'Space' && !e.repeat) {
				e.preventDefault();
				playRandomNote();
			}
		};
		window.addEventListener('keydown', handleKeyDown);

		// Store cleanup function
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	onDestroy(() => {
		stopSampling();
		stopSynth();
		if (animationId) cancelAnimationFrame(animationId);
		if (resizeObserver) {
			if (spectrumCanvasEl) resizeObserver.unobserve(spectrumCanvasEl);
			if (fluxCanvasEl) resizeObserver.unobserve(fluxCanvasEl);
			if (fundamentalPhaseCanvasEl) resizeObserver.unobserve(fundamentalPhaseCanvasEl);
			if (latencyChartCanvasEl) resizeObserver.unobserve(latencyChartCanvasEl);
		}
		tuner.destroy();
	});
</script>

<SharePreview data={data.sharePreviewData} />

<div class="min-h-screen bg-off-white py-12">
	<div class="mx-auto w-full max-w-450 px-4">
		<div class="flex flex-col gap-6">
			<header class="flex flex-col gap-2">
				<p class="text-sm tracking-[0.08em] text-slate-500 uppercase">Onset Detection Analysis</p>

				<h1 class="text-2xl font-semibold">Onset Speed Optimization</h1>
				<p class="text-sm text-slate-700">
					Test onset detection with synthesized notes. Play notes through the synth and monitor
					onset detection speed in real-time.
				</p>
			</header>

			<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
				<div class="flex min-w-0 flex-col gap-6">
					<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
						<div class="rounded-2xl bg-white p-4 shadow-sm">
							{#if tuner.state.needsUserGesture}
								<div
									class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
								>
									Audio is blocked until you click. Click "Enable audio" to resume.
								</div>
							{/if}

							<MicrophoneSelector
								tunerState={tuner.state}
								onStartListening={tuner.start}
								onDeviceChange={handleDeviceChange}
							/>
						</div>

						<div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
							<p class="mb-1 text-xs font-semibold text-slate-600 uppercase">Onset Latency</p>
							{#if onsetLatencyStatus === 'waiting'}
								<p class="font-mono text-lg text-slate-400">Waiting...</p>
							{:else if onsetLatencyStatus === 'detected' && lastOnsetLatency !== null}
								<p class="font-mono text-lg font-semibold text-green-600">
									{lastOnsetLatency.toFixed(1)}ms
								</p>
							{:else if onsetLatencyStatus === 'missed'}
								<p class="font-mono text-lg font-semibold text-red-600">MISSED (&gt;1000ms)</p>
							{/if}
						</div>
					</div>

					<div class="rounded-2xl bg-white p-4 shadow-sm">
						<div class="mb-2 flex items-center justify-between">
							<p class="text-sm font-semibold text-slate-700">Onset Latency History</p>
							{#if latencyHistory.length > 0}
								<button
									class="rounded-lg bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
									onclick={() => {
										latencyHistory = [];
									}}
									type="button"
								>
									Clear
								</button>
							{/if}
						</div>
						<canvas bind:this={latencyChartCanvasEl} class="h-48 w-full rounded-xl bg-slate-900"
						></canvas>
					</div>

					<div class="flex flex-col gap-4">
						<div class="rounded-2xl bg-white p-4 shadow-sm">
							<div class="mb-2 flex items-center justify-between">
								<p class="text-sm font-semibold text-slate-700">
									Spectrum heatmap & amplitude (last 10s)
								</p>
								{#if tuner.state.note}
									<span
										class="rounded-full bg-dark-blue px-3 py-1 text-xs font-semibold text-white"
									>
										{tuner.state.note}
									</span>
								{:else}
									<span
										class="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
										>—</span
									>
								{/if}
							</div>
							<canvas bind:this={spectrumCanvasEl} class="h-72 w-full rounded-xl bg-slate-900"
							></canvas>
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
							<canvas
								bind:this={fundamentalPhaseCanvasEl}
								class="h-40 w-full rounded-xl bg-slate-900"
							></canvas>
						</div>
					</div>
				</div>

				<!-- Right column: Settings Panel -->
				<div class="w-full max-w-95 shrink-0 xl:w-full">
					<div class="sticky top-4 flex flex-col gap-4">
						<div class="rounded-2xl bg-white p-4 shadow-sm">
							<h2 class="mb-4 text-lg font-semibold text-slate-800">Onset Detection Settings</h2>

							<div class="flex max-h-[calc(100vh-8rem)] flex-col gap-4 overflow-y-auto pr-2">
								<!-- Rule A: Pitch Change -->
								<div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
									<h3 class="mb-3 text-sm font-semibold text-slate-700">Rule A: Pitch Change</h3>

									<div class="mb-3">
										<label class="mb-1 block text-xs text-slate-600" for="pitch-change-threshold">
											Pitch Change Threshold: {config.pitchChangeThresholdCents} cents
										</label>
										<input
											id="pitch-change-threshold"
											type="range"
											min="5"
											max="50"
											step="1"
											bind:value={config.pitchChangeThresholdCents}
											class="w-full"
										/>
									</div>

									<div>
										<label class="mb-1 block text-xs text-slate-600" for="min-pitch-confidence">
											Min Pitch Confidence: {config.minPitchConfidenceForChange.toFixed(2)}
										</label>
										<input
											id="min-pitch-confidence"
											type="range"
											min="0.1"
											max="1.0"
											step="0.05"
											bind:value={config.minPitchConfidenceForChange}
											class="w-full"
										/>
									</div>
								</div>

								<!-- Rule B1 -->
								<div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
									<h3 class="mb-3 text-sm font-semibold text-slate-700">Rule B1: Moderate Both</h3>

									<div class="mb-3">
										<label class="mb-1 block text-xs text-slate-600" for="b1-min-excitation">
											Min Normalized Excitation: {config.b1_minNormalizedExcitation.toFixed(2)}
										</label>
										<input
											id="b1-min-excitation"
											type="range"
											min="0"
											max="3"
											step="0.1"
											bind:value={config.b1_minNormalizedExcitation}
											class="w-full"
										/>
									</div>

									<div>
										<label class="mb-1 block text-xs text-slate-600" for="b1-min-phase">
											Min Normalized Phase: {config.b1_minNormalizedPhase.toFixed(2)}
										</label>
										<input
											id="b1-min-phase"
											type="range"
											min="0"
											max="3"
											step="0.1"
											bind:value={config.b1_minNormalizedPhase}
											class="w-full"
										/>
									</div>
								</div>

								<!-- Rule B2 -->
								<div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
									<h3 class="mb-3 text-sm font-semibold text-slate-700">Rule B2: Phase Dominant</h3>

									<div class="mb-3">
										<label class="mb-1 block text-xs text-slate-600" for="b2-min-phase">
											Min Normalized Phase: {config.b2_minNormalizedPhase.toFixed(2)}
										</label>
										<input
											id="b2-min-phase"
											type="range"
											min="0"
											max="3"
											step="0.1"
											bind:value={config.b2_minNormalizedPhase}
											class="w-full"
										/>
									</div>

									<div>
										<label class="mb-1 block text-xs text-slate-600" for="b2-min-excitation">
											Min Normalized Excitation: {config.b2_minNormalizedExcitation.toFixed(2)}
										</label>
										<input
											id="b2-min-excitation"
											type="range"
											min="-2"
											max="2"
											step="0.1"
											bind:value={config.b2_minNormalizedExcitation}
											class="w-full"
										/>
									</div>
								</div>

								<!-- Rule B3 -->
								<div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
									<h3 class="mb-3 text-sm font-semibold text-slate-700">
										Rule B3: Strong Excitation
									</h3>

									<div>
										<label class="mb-1 block text-xs text-slate-600" for="b3-min-excitation">
											Min Normalized Excitation: {config.b3_minNormalizedExcitation.toFixed(2)}
										</label>
										<input
											id="b3-min-excitation"
											type="range"
											min="1"
											max="5"
											step="0.1"
											bind:value={config.b3_minNormalizedExcitation}
											class="w-full"
										/>
									</div>
								</div>

								<!-- Rule C -->
								<div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
									<h3 class="mb-3 text-sm font-semibold text-slate-700">Rule C: Raw Phase</h3>

									<div>
										<label class="mb-1 block text-xs text-slate-600" for="c-min-raw-phase">
											Min Raw Phase: {config.c_minRawPhase.toFixed(2)}
										</label>
										<input
											id="c-min-raw-phase"
											type="range"
											min="0.5"
											max="3"
											step="0.05"
											bind:value={config.c_minRawPhase}
											class="w-full"
										/>
									</div>
								</div>

								<!-- Rule D -->
								<div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
									<h3 class="mb-3 text-sm font-semibold text-slate-700">Rule D: Strong Phase</h3>

									<div>
										<label class="mb-1 block text-xs text-slate-600" for="d-min-phase">
											Min Normalized Phase: {config.d_minNormalizedPhase.toFixed(2)}
										</label>
										<input
											id="d-min-phase"
											type="range"
											min="1"
											max="5"
											step="0.1"
											bind:value={config.d_minNormalizedPhase}
											class="w-full"
										/>
									</div>
								</div>

								<!-- General Settings -->
								<div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
									<h3 class="mb-3 text-sm font-semibold text-slate-700">General</h3>

									<div>
										<label class="mb-1 block text-xs text-slate-600" for="cooldown-ms">
											Cooldown: {config.cooldownMs} ms
										</label>
										<input
											id="cooldown-ms"
											type="range"
											min="10"
											max="200"
											step="5"
											bind:value={config.cooldownMs}
											class="w-full"
										/>
									</div>

									<div class="mt-3">
										<label class="mb-1 block text-xs text-slate-600" for="whitening-alpha">
											Spectral Whitening Alpha: {config.whiteningAlpha.toFixed(2)}
										</label>
										<input
											id="whitening-alpha"
											type="range"
											min="0.6"
											max="0.99"
											step="0.01"
											bind:value={config.whiteningAlpha}
											class="w-full"
										/>
									</div>

									<div class="mt-3">
										<label class="mb-1 block text-xs text-slate-600" for="adaptive-window">
											Adaptive Window: {config.adaptiveWindowFrames} frames
										</label>
										<input
											id="adaptive-window"
											type="range"
											min="10"
											max="120"
											step="1"
											bind:value={config.adaptiveWindowFrames}
											class="w-full"
										/>
									</div>

									<div class="mt-3">
										<label class="mb-1 block text-xs text-slate-600" for="adaptive-delta">
											Adaptive Delta Multiplier: {config.adaptiveDeltaMultiplier.toFixed(2)}
										</label>
										<input
											id="adaptive-delta"
											type="range"
											min="0.8"
											max="1.6"
											step="0.01"
											bind:value={config.adaptiveDeltaMultiplier}
											class="w-full"
										/>
									</div>
								</div>

								<!-- Reset Button -->
								<button
									class="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
									onclick={() => {
										config = { ...onsetDetectionConfig };
									}}
									type="button"
								>
									Reset to Defaults
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
