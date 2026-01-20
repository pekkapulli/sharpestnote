<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { DEFAULT_A4 } from '$lib/tuner/tune';
	import SharePreview from '$lib/components/SharePreview.svelte';
	import { instrumentConfigs } from '$lib/config/instruments';
	import type { InstrumentId } from '$lib/config/types';

	let { data } = $props();

	const SAMPLE_INTERVAL_MS = 10; // 100fps sampling for high resolution data

	// Data recording structure for ML training
	interface RecordedFrame {
		timestamp: number; // performance.now()
		// Audio features
		amplitude: number;
		frequency: number | null;
		note: string | null;
		cents: number | null;
		// Spectral features
		spectrum: Uint8Array | null; // FFT spectrum magnitude
		phases: number[]; // Phase angles
		spectralFlux: number;
		phaseDeviation: number;
		highFrequencyEnergy: number; // Energy above 3kHz
		// State
		isNoteActive: boolean;
		hasPitch: boolean;
	}

	let recordedData: RecordedFrame[] = $state([]);
	let manualOnsets: number[] = $state([]); // Array of timestamps for manual onsets
	let isRecording = $state(false);
	let selectedSource: 'file' | 'microphone' = $state('microphone');
	let selectedInstrument: InstrumentId = $state('violin');

	// Manual onset interaction state
	let draggedOnsetIndex: number | null = null;
	let onsetHoverIndex: number | null = null;
	let didDrag = false; // Track if mouse actually moved during drag
	let isDragging = $state(false);
	let uploadedFileName = $state<string | null>(null);
	let audioFileUrl = $state<string | null>(null);

	let sampleTimer: number | null = null;
	let audioElement = $state<HTMLAudioElement | null>(null);

	// Track onset events
	let onsetEvents: { timestamp: number; rule: string | null; frequency: number }[] = [];

	const tuner = createTuner({
		a4: DEFAULT_A4,
		accidental: 'sharp',
		debug: true,
		gain: 15,
		maxGain: 50,
		onOnset: (event) => {
			onsetEvents.push({
				timestamp: event.timestamp,
				rule: event.rule,
				frequency: event.frequency
			});
		}
	});

	// Visualization
	let timelineCanvasEl: HTMLCanvasElement | null = null;
	let timelineScrollContainer: HTMLDivElement | null = null;
	let spectrumCtx: CanvasRenderingContext2D | null = null;
	let timelineCtx: CanvasRenderingContext2D | null = null;
	let animationId: number | null = null;

	// Calculate timeline width based on recording duration (40px per second)
	const PIXELS_PER_SECOND = 100;
	const MIN_TIMELINE_WIDTH = 800;

	let timelineWidth = $derived.by(() => {
		if (recordedData.length < 2) return MIN_TIMELINE_WIDTH;

		const firstTime = recordedData[0].timestamp;
		const lastTime = recordedData[recordedData.length - 1].timestamp;
		const durationSeconds = (lastTime - firstTime) / 1000;

		return Math.max(MIN_TIMELINE_WIDTH, Math.ceil(durationSeconds * PIXELS_PER_SECOND));
	});

	// File handling
	function handleFileInput(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			loadAudioFile(input.files[0]);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		const files = event.dataTransfer?.files;
		if (files && files[0]) {
			loadAudioFile(files[0]);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}

	function loadAudioFile(file: File) {
		// Validate file type
		if (!file.type.startsWith('audio/')) {
			alert('Please select a valid audio file (mp3, wav, etc.)');
			return;
		}

		uploadedFileName = file.name;

		// Create object URL for the audio file
		if (audioFileUrl) {
			URL.revokeObjectURL(audioFileUrl);
		}
		audioFileUrl = URL.createObjectURL(file);
	}

	// Recording control
	function startRecording() {
		recordedData = [];
		onsetEvents = [];
		isRecording = true;

		if (selectedSource === 'microphone') {
			tuner.start();
		} else if (selectedSource === 'file' && audioFileUrl) {
			tuner.startWithFile(audioFileUrl);
			if (audioElement) {
				audioElement.currentTime = 0;
				audioElement.play();
			}
		}

		startSampling();
		startVisualization();
	}

	function stopRecording() {
		isRecording = false;
		tuner.stop();
		stopSampling();
		if (audioElement) {
			audioElement.pause();
		}
	}

	function startSampling() {
		stopSampling();

		sampleTimer = window.setInterval(() => {
			const now = performance.now();

			// Check for onset events since last sample
			const lastSampleTime =
				recordedData.length > 0
					? recordedData[recordedData.length - 1].timestamp
					: now - SAMPLE_INTERVAL_MS;
			const newOnsets = onsetEvents.filter(
				(evt) => evt.timestamp > lastSampleTime && evt.timestamp <= now
			);

			// Record frame data
			const frame: RecordedFrame = {
				timestamp: now,
				amplitude: tuner.state.amplitude,
				frequency: tuner.state.frequency,
				note: tuner.state.note,
				cents: tuner.state.cents,
				spectrum: tuner.state.spectrum ? new Uint8Array(tuner.state.spectrum) : null,
				phases: tuner.state.phases ? Array.from(tuner.state.phases) : [],
				spectralFlux: tuner.state.spectralFlux,
				phaseDeviation: tuner.state.phaseDeviation,
				highFrequencyEnergy: tuner.state.highFrequencyEnergy,
				isNoteActive: tuner.state.isNoteActive,
				hasPitch: tuner.state.hasPitch
			};

			recordedData.push(frame);
		}, SAMPLE_INTERVAL_MS);
	}

	function stopSampling() {
		if (sampleTimer !== null) {
			clearInterval(sampleTimer);
			sampleTimer = null;
		}
	}

	// Visualization
	function startVisualization() {
		if (animationId !== null) return;
		draw();
	}

	function draw() {
		drawTimeline();

		// Auto-scroll to end when recording
		if (isRecording && timelineScrollContainer) {
			timelineScrollContainer.scrollLeft = timelineScrollContainer.scrollWidth;
		}

		animationId = requestAnimationFrame(draw);
	}

	// Manual onset annotation handlers
	function handleTimelineClick(event: MouseEvent) {
		if (!timelineCanvasEl || recordedData.length === 0 || isRecording) return;

		// Don't process click if we just finished dragging
		if (didDrag) {
			didDrag = false;
			return;
		}

		const rect = timelineCanvasEl.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const canvasWidth = timelineCanvasEl.width;

		// Scale mouse position to canvas coordinates
		const scaleX = canvasWidth / rect.width;
		const x = mouseX * scaleX;

		const firstTime = recordedData[0].timestamp;
		const lastTime = recordedData[recordedData.length - 1].timestamp;
		const timeRange = Math.max(lastTime - firstTime, 1000);

		const clickedTime = firstTime + (x / canvasWidth) * timeRange;

		// Check if clicking near an existing onset (within 10px)
		const CLICK_THRESHOLD = 10;
		for (let i = 0; i < manualOnsets.length; i++) {
			const onsetX = ((manualOnsets[i] - firstTime) / timeRange) * canvasWidth;
			if (Math.abs(x - onsetX) < CLICK_THRESHOLD) {
				// Remove this onset
				manualOnsets.splice(i, 1);
				manualOnsets = [...manualOnsets];
				return;
			}
		}

		// Add new onset
		manualOnsets.push(clickedTime);
		manualOnsets.sort((a, b) => a - b);
		manualOnsets = [...manualOnsets];
	}

	function handleTimelineMouseDown(event: MouseEvent) {
		if (!timelineCanvasEl || recordedData.length === 0 || isRecording) return;

		const rect = timelineCanvasEl.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const canvasWidth = timelineCanvasEl.width;

		// Scale mouse position to canvas coordinates
		const scaleX = canvasWidth / rect.width;
		const x = mouseX * scaleX;

		const firstTime = recordedData[0].timestamp;
		const lastTime = recordedData[recordedData.length - 1].timestamp;
		const timeRange = Math.max(lastTime - firstTime, 1000);

		// Check if clicking on an onset for dragging
		const DRAG_THRESHOLD = 10;
		for (let i = 0; i < manualOnsets.length; i++) {
			const onsetX = ((manualOnsets[i] - firstTime) / timeRange) * canvasWidth;
			if (Math.abs(x - onsetX) < DRAG_THRESHOLD) {
				draggedOnsetIndex = i;
				didDrag = false; // Reset at start of potential drag
				event.preventDefault();
				return;
			}
		}
	}

	function handleTimelineMouseMove(event: MouseEvent) {
		if (!timelineCanvasEl || recordedData.length === 0) return;

		const rect = timelineCanvasEl.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const canvasWidth = timelineCanvasEl.width;

		// Scale mouse position to canvas coordinates
		const scaleX = canvasWidth / rect.width;
		const x = mouseX * scaleX;

		const firstTime = recordedData[0].timestamp;
		const lastTime = recordedData[recordedData.length - 1].timestamp;
		const timeRange = Math.max(lastTime - firstTime, 1000);

		if (draggedOnsetIndex !== null) {
			// Dragging an onset
			const newTime = firstTime + (x / canvasWidth) * timeRange;
			manualOnsets[draggedOnsetIndex] = Math.max(firstTime, Math.min(lastTime, newTime));
			manualOnsets = [...manualOnsets];
			didDrag = true; // Mark that we actually dragged
			event.preventDefault();
		} else {
			// Update hover state
			const HOVER_THRESHOLD = 10;
			let foundHover = false;
			for (let i = 0; i < manualOnsets.length; i++) {
				const onsetX = ((manualOnsets[i] - firstTime) / timeRange) * canvasWidth;
				if (Math.abs(x - onsetX) < HOVER_THRESHOLD) {
					onsetHoverIndex = i;
					foundHover = true;
					break;
				}
			}
			if (!foundHover) {
				onsetHoverIndex = null;
			}
		}
	}

	function handleTimelineMouseUp() {
		if (draggedOnsetIndex !== null) {
			// Sort onsets after dragging
			manualOnsets.sort((a, b) => a - b);
			manualOnsets = [...manualOnsets];
		}
		draggedOnsetIndex = null;
	}

	function handleTimelineMouseLeave() {
		onsetHoverIndex = null;
		draggedOnsetIndex = null;
	}

	function drawTimeline() {
		if (!timelineCtx || !timelineCanvasEl || recordedData.length === 0) return;

		const c = timelineCtx;
		const canvas = timelineCanvasEl;
		const { width, height } = canvas;

		c.clearRect(0, 0, width, height);

		// Dark background
		c.fillStyle = '#0b1226';
		c.fillRect(0, 0, width, height);

		const firstTime = recordedData[0].timestamp;
		const lastTime = recordedData[recordedData.length - 1].timestamp;
		const timeRange = Math.max(lastTime - firstTime, 1000); // At least 1 second

		// Draw spectrum heatmap timeline (similar to audio-analysis page)
		const paddingTop = 12;
		const paddingBottom = 32;
		const heatmapHeight = height - paddingTop - paddingBottom;

		// Find a sample with spectrum data to determine bin count
		const sampleWithSpectrum = recordedData.find((f) => f.spectrum);
		const fullBinCount = sampleWithSpectrum?.spectrum?.length ?? 0;

		// Cap frequency to 8000 Hz
		// Assuming 44.1kHz sample rate and 2048 FFT size:
		// Each bin represents 44100/2048 ≈ 21.5 Hz
		// To get 8000 Hz: 8000 / 21.5 ≈ 372 bins
		const MAX_FREQ_HZ = 8000;
		const SAMPLE_RATE = 44100; // Typical sample rate
		const FFT_SIZE = 2048; // Typical FFT size
		const binFreqHz = SAMPLE_RATE / FFT_SIZE;
		const maxBin = Math.min(Math.floor(MAX_FREQ_HZ / binFreqHz), fullBinCount);

		// Helper function to convert magnitude to color (matching audio-analysis)
		const magnitudeToColor = (mag: number): string => {
			const intensity = mag / 255;
			if (intensity < 0.1) return `hsl(200, 80%, 10%)`;
			if (intensity < 0.3) return `hsl(200, 80%, ${10 + intensity * 30}%)`;
			if (intensity < 0.6) return `hsl(180, 80%, ${20 + intensity * 40}%)`;
			return `hsl(160, 90%, ${40 + intensity * 40}%)`;
		};

		// Draw spectrum heatmap for each recorded frame
		if (maxBin > 0) {
			for (let i = 0; i < recordedData.length; i++) {
				const frame = recordedData[i];
				if (!frame.spectrum) continue;

				const nextFrame = recordedData[i + 1];
				const x = ((frame.timestamp - firstTime) / timeRange) * width;
				const xNext = nextFrame ? ((nextFrame.timestamp - firstTime) / timeRange) * width : width;
				const columnWidth = Math.max(1, Math.ceil(xNext - x));

				// Draw spectrum bins up to maxBin (8000 Hz)
				for (let b = 0; b < maxBin; b++) {
					const mag = frame.spectrum[b];
					const y = paddingTop + heatmapHeight - ((b + 1) / maxBin) * heatmapHeight;
					const binHeight = Math.ceil(heatmapHeight / maxBin) + 1;
					c.fillStyle = magnitudeToColor(mag);
					c.fillRect(x, y, columnWidth, binHeight);
				}
			}
		}

		// Draw amplitude timeline overlaid on spectrum
		c.strokeStyle = '#ffffff'; // White line for visibility over heatmap
		c.lineWidth = 2;
		c.beginPath();

		const maxAmp = Math.max(...recordedData.map((f) => f.amplitude), 0.01);
		const baseline = paddingTop + heatmapHeight;

		recordedData.forEach((frame, idx) => {
			const x = ((frame.timestamp - firstTime) / timeRange) * width;
			const y = baseline - (frame.amplitude / maxAmp) * heatmapHeight;

			if (idx === 0) {
				c.moveTo(x, y);
			} else {
				c.lineTo(x, y);
			}
		});
		c.stroke();

		// Draw hasPitch indicator as a blue line
		c.strokeStyle = '#3b82f6'; // Blue for pitch detection
		c.lineWidth = 1.5;
		c.beginPath();

		recordedData.forEach((frame, idx) => {
			const x = ((frame.timestamp - firstTime) / timeRange) * width;
			// Show pitch as a line at mid-height when detected, near baseline when not
			const y = frame.hasPitch ? paddingTop + heatmapHeight * 0.25 : baseline - heatmapHeight * 0.1;

			if (idx === 0) {
				c.moveTo(x, y);
			} else {
				c.lineTo(x, y);
			}
		});
		c.stroke();

		// Draw manual onset markers as vertical lines
		manualOnsets.forEach((onsetTime, idx) => {
			const x = ((onsetTime - firstTime) / timeRange) * width;

			// Highlight if hovering or dragging
			const isHighlighted = idx === onsetHoverIndex || idx === draggedOnsetIndex;

			c.strokeStyle = isHighlighted ? '#fbbf24' : '#22c55e';
			c.lineWidth = isHighlighted ? 3 : 2;
			c.setLineDash([]);
			c.beginPath();
			c.moveTo(x, 0);
			c.lineTo(x, height);
			c.stroke();

			// Draw small handle at top
			c.fillStyle = isHighlighted ? '#fbbf24' : '#22c55e';
			c.beginPath();
			c.arc(x, 10, isHighlighted ? 6 : 4, 0, Math.PI * 2);
			c.fill();
		});

		// Stats
		c.fillStyle = '#ffffff';
		c.font = '12px monospace';
		c.fillText(`Frames: ${recordedData.length}`, 10, 20);
		c.fillText(`Duration: ${(timeRange / 1000).toFixed(2)}s`, 10, 35);
		c.fillText(`Manual Onsets: ${manualOnsets.length}`, 10, 50);
	}

	// Export data
	async function exportData() {
		if (recordedData.length === 0) {
			alert('No data to export. Please record first.');
			return;
		}

		// Calculate actual frame rate from data
		if (recordedData.length < 2) {
			alert('Need at least 2 frames to export data.');
			return;
		}

		const timestamps = recordedData.map((f) => f.timestamp);
		const diffs = [];
		for (let i = 1; i < timestamps.length; i++) {
			diffs.push(timestamps[i] - timestamps[i - 1]);
		}
		const avgHopMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;

		// ONSET LABELING STRATEGY (matching ML training requirements):
		// - Fixed hop size: ~10ms (measured from data)
		// - Tolerance window: ±10ms around each onset
		// - At 10ms hop → ±1 frame
		// - Label frames at positions: onset-1, onset, onset+1 as positive
		const TOLERANCE_FRAMES = 1; // ±1 frame at 10ms hop = ±10ms tolerance

		const mlData = recordedData.map((frame, frameIndex) => {
			// Check if this frame is within tolerance window of any manual onset
			let hasOnset = false;

			for (const onsetTime of manualOnsets) {
				// Find the frame index closest to this onset
				let closestIndex = 0;
				let minDiff = Math.abs(recordedData[0].timestamp - onsetTime);

				for (let i = 1; i < recordedData.length; i++) {
					const diff = Math.abs(recordedData[i].timestamp - onsetTime);
					if (diff < minDiff) {
						minDiff = diff;
						closestIndex = i;
					}
				}

				// Check if current frame is within tolerance window of the onset frame
				if (Math.abs(frameIndex - closestIndex) <= TOLERANCE_FRAMES) {
					hasOnset = true;
					break;
				}
			}

			// Export only features needed for causal windowing
			// (Preprocessing will create 5-frame windows from these individual frames)
			return {
				timestamp: frame.timestamp,
				amplitude: frame.amplitude,
				spectralFlux: frame.spectralFlux,
				phaseDeviation: frame.phaseDeviation,
				highFrequencyEnergy: frame.highFrequencyEnergy,
				hasPitch: frame.hasPitch,
				hasManualOnset: hasOnset
			};
		});

		// Calculate and log statistics
		const positiveCount = mlData.filter((f) => f.hasManualOnset).length;
		const positiveRatio = positiveCount / mlData.length;

		console.log('Export Statistics:');
		console.log(`  Frames: ${mlData.length}`);
		console.log(`  Avg hop size: ${avgHopMs.toFixed(2)} ms`);
		console.log(`  Frame rate: ${(1000 / avgHopMs).toFixed(1)} Hz`);
		console.log(`  Manual onsets: ${manualOnsets.length}`);
		console.log(`  Positive frames: ${positiveCount} (${(positiveRatio * 100).toFixed(1)}%)`);
		console.log(
			`  Tolerance: ±${TOLERANCE_FRAMES} frames (±${(TOLERANCE_FRAMES * avgHopMs).toFixed(0)} ms)`
		);

		// Save to server
		try {
			const response = await fetch('/api/save-training-data', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					data: mlData,
					instrument: selectedInstrument
				})
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(error);
			}

			const result = await response.json();

			// Show success alert with statistics
			alert(
				`Data saved successfully!\n\n` +
					`File: ${result.filename}\n` +
					`Instrument: ${selectedInstrument}\n` +
					`Frames: ${mlData.length}\n` +
					`Hop size: ${avgHopMs.toFixed(1)} ms (${(1000 / avgHopMs).toFixed(0)} Hz)\n` +
					`Onsets: ${manualOnsets.length}\n` +
					`Positive frames: ${positiveCount} (${(positiveRatio * 100).toFixed(1)}%)\n` +
					`Tolerance: ±${TOLERANCE_FRAMES} frames`
			);
		} catch (error) {
			console.error('Export error:', error);
			alert(`Failed to save data: ${error}`);
		}
	}

	function clearData() {
		if (confirm('Are you sure you want to clear all recorded data?')) {
			recordedData = [];
			onsetEvents = [];
			manualOnsets = [];
		}
	}

	onMount(() => {
		if (timelineCanvasEl) {
			timelineCtx = timelineCanvasEl.getContext('2d');
		}
	});

	onDestroy(() => {
		stopRecording();
		if (animationId !== null) {
			cancelAnimationFrame(animationId);
		}
		if (audioFileUrl) {
			URL.revokeObjectURL(audioFileUrl);
		}
	});
</script>

<SharePreview data={data.sharePreviewData} />

<div class="container">
	<div class="header">
		<h1>Onset Training Data Recorder</h1>
		<p class="subtitle">Record high-resolution audio analysis data for machine learning training</p>
	</div>

	<!-- Source Selection -->
	<div class="control-section">
		<h2>Audio Source</h2>
		<PillSelector
			options={[
				{ value: 'microphone', label: 'Microphone' },
				{ value: 'file', label: 'Audio File' }
			]}
			selected={selectedSource}
			onSelect={(value) => (selectedSource = value as 'file' | 'microphone')}
		/>
		{#if selectedSource === 'microphone'}
			<div class="mt-4">
				<h3>Select Microphone</h3>
				<MicrophoneSelector
					tunerState={tuner.state}
					onStartListening={() => {}}
					onDeviceChange={async (deviceId) => {
						await tuner.refreshDevices();
						// Device change is handled by tuner internally
					}}
					onRefreshDevices={tuner.refreshDevices}
				/>
			</div>
		{:else}
			<div class="mt-4">
				<h3>Upload Audio File</h3>
				<div
					class="dropzone"
					class:dragging={isDragging}
					ondrop={handleDrop}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					role="button"
					tabindex="0"
				>
					<input
						type="file"
						accept="audio/*"
						onchange={handleFileInput}
						id="audio-file-input"
						style="display: none;"
					/>
					<label for="audio-file-input" class="dropzone-label">
						{#if uploadedFileName}
							<div class="file-info">
								<span class="file-icon">🎵</span>
								<span class="file-name">{uploadedFileName}</span>
							</div>
						{:else}
							<div class="drop-prompt">
								<span class="drop-icon">📁</span>
								<p>Drag & drop an audio file here</p>
								<p class="drop-subtext">or click to browse</p>
							</div>
						{/if}
					</label>
				</div>

				{#if audioFileUrl}
					<audio bind:this={audioElement} src={audioFileUrl} style="display: none;"></audio>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Recording Controls -->
	<div class="control-section">
		<h2>Recording</h2>
		<div class="button-group">
			{#if !isRecording}
				<button
					class="btn btn-primary"
					onclick={startRecording}
					disabled={selectedSource === 'file' && !audioFileUrl}
				>
					🔴 Start Recording
				</button>
			{:else}
				<button class="btn btn-danger" onclick={stopRecording}> ⏹️ Stop Recording </button>
			{/if}

			<button class="btn" onclick={clearData} disabled={recordedData.length === 0}>
				🗑️ Clear Data
			</button>
		</div>
	</div>

	<div class="visualization-section">
		<h2>Recording Timeline</h2>
		{#if recordedData.length > 0 && !isRecording}
			<p class="info-text" style="margin-bottom: 0.5rem;">
				Click to add onset markers, click again to remove, or drag to move them
			</p>
		{/if}
		<div class="timeline-scroll-container" bind:this={timelineScrollContainer}>
			<canvas
				bind:this={timelineCanvasEl}
				width={timelineWidth}
				height="200"
				class="canvas timeline-canvas"
				class:interactive={recordedData.length > 0 && !isRecording}
				onclick={handleTimelineClick}
				onmousedown={handleTimelineMouseDown}
				onmousemove={handleTimelineMouseMove}
				onmouseup={handleTimelineMouseUp}
				onmouseleave={handleTimelineMouseLeave}
			></canvas>
		</div>
	</div>

	<!-- Data Export -->
	<div class="control-section">
		<h2>Export Data</h2>
		<p class="info-text">
			After recording, click on the timeline to add manual onset markers for ground truth labeling.
			Each onset creates a ±10ms tolerance window (±1 frame at 10ms hop). Frames within this window
			are labeled as positive examples. The preprocessing script will create causal 5-frame windows
			from this per-frame data.
		</p>

		<div style="margin-bottom: 1rem;">
			<h3>Training Instrument</h3>
			<select bind:value={selectedInstrument} class="instrument-select">
				{#each instrumentConfigs as instrument}
					<option value={instrument.id}>{instrument.label}</option>
				{/each}
			</select>
		</div>

		<div class="button-group">
			<button class="btn btn-success" onclick={exportData} disabled={recordedData.length === 0}>
				💾 Save to Training Data Folder
			</button>
		</div>

		{#if recordedData.length > 0}
			<div class="data-stats">
				<p><strong>Recorded Frames:</strong> {recordedData.length}</p>
				<p><strong>Sampling Rate:</strong> {(1000 / SAMPLE_INTERVAL_MS).toFixed(0)} fps</p>
				<p><strong>Manual Onsets:</strong> {manualOnsets.length}</p>
				{#if recordedData.length > 1}
					<p>
						<strong>Duration:</strong>
						{(
							(recordedData[recordedData.length - 1].timestamp - recordedData[0].timestamp) /
							1000
						).toFixed(2)}s
					</p>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.header {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		font-size: 2.5rem;
		color: #f8fafc;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		font-size: 1.125rem;
		color: #94a3b8;
		margin: 0;
	}

	.control-section {
		background: #1e293b;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	h2 {
		font-size: 1.5rem;
		color: #f8fafc;
		margin: 0 0 1rem 0;
	}

	h3 {
		font-size: 1.125rem;
		color: #cbd5e1;
		margin: 0 0 0.75rem 0;
	}

	.dropzone {
		border: 2px dashed #475569;
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
		transition: all 0.3s ease;
		cursor: pointer;
		background: #0f172a;
	}

	.dropzone:hover,
	.dropzone.dragging {
		border-color: #4facfe;
		background: #1e293b;
	}

	.dropzone-label {
		display: block;
		cursor: pointer;
	}

	.drop-prompt {
		color: #94a3b8;
	}

	.drop-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 1rem;
	}

	.drop-subtext {
		font-size: 0.875rem;
		color: #64748b;
	}

	.file-info {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.file-icon {
		font-size: 2rem;
	}

	.file-name {
		font-size: 1.125rem;
		color: #4facfe;
		font-weight: 500;
	}

	.button-group {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		background: #334155;
		color: #f8fafc;
	}

	.btn:hover:not(:disabled) {
		background: #475569;
		transform: translateY(-2px);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.btn-primary {
		background: #22c55e;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #16a34a;
	}

	.btn-danger {
		background: #ef4444;
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
	}

	.btn-success {
		background: #3b82f6;
		color: white;
	}

	.btn-success:hover:not(:disabled) {
		background: #2563eb;
	}

	.visualization-section {
		background: #1e293b;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.canvas {
		width: 100%;
		height: auto;
		border-radius: 8px;
		background: #0b1226;
	}

	.timeline-scroll-container {
		overflow-x: auto;
		overflow-y: hidden;
		border-radius: 8px;
		background: #0b1226;
	}

	.timeline-canvas {
		width: auto;
		display: block;
	}

	.canvas.interactive {
		cursor: crosshair;
	}

	.canvas.interactive:active {
		cursor: grabbing;
	}

	.info-text {
		color: #94a3b8;
		font-size: 0.875rem;
		margin-bottom: 1rem;
		line-height: 1.5;
	}

	.data-stats {
		margin-top: 1.5rem;
		padding: 1rem;
		background: #0f172a;
		border-radius: 8px;
		border-left: 4px solid #4facfe;
	}

	.data-stats p {
		margin: 0.5rem 0;
		color: #cbd5e1;
		font-size: 0.9375rem;
	}

	.data-stats strong {
		color: #f8fafc;
	}

	.instrument-select {
		width: 100%;
		max-width: 300px;
		padding: 0.75rem;
		font-size: 1rem;
		background: #0f172a;
		color: #f8fafc;
		border: 2px solid #475569;
		border-radius: 8px;
		cursor: pointer;
		transition: border-color 0.2s ease;
	}

	.instrument-select:hover {
		border-color: #4facfe;
	}

	.instrument-select:focus {
		outline: none;
		border-color: #4facfe;
	}
</style>
