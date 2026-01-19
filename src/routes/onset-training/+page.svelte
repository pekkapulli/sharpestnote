<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import MicrophoneSelector from '$lib/components/ui/MicrophoneSelector.svelte';
	import PillSelector from '$lib/components/ui/PillSelector.svelte';
	import { createTuner } from '$lib/tuner/useTuner.svelte';
	import { DEFAULT_A4 } from '$lib/tuner/tune';
	import SharePreview from '$lib/components/SharePreview.svelte';

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
	let spectrumCanvasEl: HTMLCanvasElement | null = null;
	let timelineCanvasEl: HTMLCanvasElement | null = null;
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
		drawSpectrum();
		drawTimeline();
		animationId = requestAnimationFrame(draw);
	}

	function drawSpectrum() {
		if (!spectrumCtx || !spectrumCanvasEl || !tuner.state.spectrum) return;

		const c = spectrumCtx;
		const canvas = spectrumCanvasEl;
		const { width, height } = canvas;

		c.clearRect(0, 0, width, height);

		// Dark background
		c.fillStyle = '#0b1226';
		c.fillRect(0, 0, width, height);

		const spectrum = tuner.state.spectrum;
		const barWidth = width / spectrum.length;

		// Draw spectrum bars
		for (let i = 0; i < spectrum.length; i++) {
			const magnitude = spectrum[i] / 255;
			const barHeight = magnitude * height;

			// Color gradient from blue to red based on magnitude
			const hue = (1 - magnitude) * 240; // 240 = blue, 0 = red
			c.fillStyle = `hsl(${hue}, 80%, 50%)`;

			c.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
		}

		// Draw amplitude indicator
		c.fillStyle = '#ffffff';
		c.font = '14px monospace';
		c.fillText(`Amp: ${tuner.state.amplitude.toFixed(3)}`, 10, 20);

		if (tuner.state.frequency) {
			c.fillText(`Freq: ${tuner.state.frequency.toFixed(1)} Hz`, 10, 40);
			c.fillText(`Note: ${tuner.state.note || 'N/A'}`, 10, 60);
		}

		// Show onset detection
		if (tuner.state.lastOnsetRule) {
			c.fillStyle = '#fbbf24';
			c.font = 'bold 16px monospace';
			c.fillText(`ONSET: ${tuner.state.lastOnsetRule}`, 10, 80);
		}

		// Show flux and phase
		c.fillStyle = '#4facfe';
		c.font = '12px monospace';
		c.fillText(`Flux: ${tuner.state.spectralFlux.toFixed(3)}`, 10, height - 40);
		c.fillText(`Phase: ${tuner.state.phaseDeviation.toFixed(3)}`, 10, height - 20);
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

		// Draw amplitude timeline
		c.strokeStyle = '#4facfe';
		c.lineWidth = 2;
		c.beginPath();

		const maxAmp = Math.max(...recordedData.map((f) => f.amplitude), 0.01);

		recordedData.forEach((frame, idx) => {
			const x = ((frame.timestamp - firstTime) / timeRange) * width;
			const y = height - (frame.amplitude / maxAmp) * (height * 0.8);

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
	function exportData() {
		if (recordedData.length === 0) {
			alert('No data to export. Please record first.');
			return;
		}

		// Filter to only ML-relevant features and add manual onset labels
		const ONSET_WINDOW_MS = 50; // Consider frames within 50ms of onset as positive examples

		const mlData = recordedData.map((frame) => {
			// Check if this frame is near a manual onset
			const hasOnset = manualOnsets.some(
				(onsetTime) => Math.abs(frame.timestamp - onsetTime) <= ONSET_WINDOW_MS
			);

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

		const dataStr = JSON.stringify(mlData, null, 2);
		const blob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = `onset-training-${Date.now()}.json`;
		a.click();

		URL.revokeObjectURL(url);
	}

	function exportCSV() {
		if (recordedData.length === 0) {
			alert('No data to export. Please record first.');
			return;
		}

		// Create CSV header
		const headers = [
			'timestamp',
			'amplitude',
			'spectralFlux',
			'phaseDeviation',
			'highFrequencyEnergy',
			'hasPitch',
			'hasOnset'
		];

		const ONSET_WINDOW_MS = 50;

		// Create CSV rows
		const rows = recordedData.map((frame) => {
			const hasOnset = manualOnsets.some(
				(onsetTime) => Math.abs(frame.timestamp - onsetTime) <= ONSET_WINDOW_MS
			);

			return [
				frame.timestamp,
				frame.amplitude,
				frame.spectralFlux,
				frame.phaseDeviation,
				frame.highFrequencyEnergy,
				frame.hasPitch ? 1 : 0,
				hasOnset ? 1 : 0
			];
		});

		const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = `onset-training-${Date.now()}.csv`;
		a.click();

		URL.revokeObjectURL(url);
	}

	function clearData() {
		if (confirm('Are you sure you want to clear all recorded data?')) {
			recordedData = [];
			onsetEvents = [];
			manualOnsets = [];
		}
	}

	onMount(() => {
		if (spectrumCanvasEl) {
			spectrumCtx = spectrumCanvasEl.getContext('2d');
		}
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
	</div>

	{#if selectedSource === 'microphone'}
		<div class="control-section">
			<h3>Select Microphone</h3>
			<MicrophoneSelector
				tunerState={tuner.state}
				onStartListening={() => {}}
				onDeviceChange={async (deviceId) => {
					await tuner.refreshDevices();
					// Device change is handled by tuner internally
				}}
			/>
		</div>
	{:else}
		<div class="control-section">
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

	<!-- Live Visualization -->
	<div class="visualization-section">
		<h2>Live Spectrum</h2>
		<canvas bind:this={spectrumCanvasEl} width="800" height="400" class="canvas"></canvas>
	</div>

	<div class="visualization-section">
		<h2>Recording Timeline</h2>
		{#if recordedData.length > 0 && !isRecording}
			<p class="info-text" style="margin-bottom: 0.5rem;">
				Click to add onset markers, click again to remove, or drag to move them
			</p>
		{/if}
		<div class="timeline-scroll-container">
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
			Export the labeled data for machine learning training. Frames within 50ms of an onset marker
			will be labeled as positive examples.
		</p>
		<div class="button-group">
			<button class="btn btn-success" onclick={exportData} disabled={recordedData.length === 0}>
				💾 Export JSON (Full Data)
			</button>
			<button class="btn btn-success" onclick={exportCSV} disabled={recordedData.length === 0}>
				📊 Export CSV (Summary)
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
</style>
