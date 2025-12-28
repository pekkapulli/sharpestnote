export interface AudioChain {
	analyser: AnalyserNode;
	mediaStream?: MediaStream;
	mediaSource?: MediaStreamAudioSourceNode;
	audioElement?: HTMLAudioElement;
	audioElementSource?: MediaElementAudioSourceNode;
	gainNode: GainNode;
	compressor: DynamicsCompressorNode;
	highpassFilter: BiquadFilterNode;
	buffer: Float32Array;
	sourceType: 'microphone' | 'file';
}

const FFT_SIZE = 2048;

export async function createAudioChain(
	audioContext: AudioContext,
	selectedDeviceId: string | null,
	gainValue: number
): Promise<AudioChain> {
	const constraints: MediaStreamConstraints = {
		audio: selectedDeviceId
			? {
					deviceId: { exact: selectedDeviceId },
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false,
					channelCount: 1
				}
			: {
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false,
					channelCount: 1
				},
		video: false
	};

	const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
	const mediaSource = audioContext.createMediaStreamSource(mediaStream);

	const gainNode = audioContext.createGain();
	gainNode.gain.value = gainValue;

	const compressor = audioContext.createDynamicsCompressor();
	compressor.threshold.value = -20;
	compressor.knee.value = 30;
	compressor.ratio.value = 4;
	compressor.attack.value = 0.01;
	compressor.release.value = 0.1;

	const highpassFilter = audioContext.createBiquadFilter();
	highpassFilter.type = 'highpass';
	highpassFilter.frequency.value = 40;

	const analyser = audioContext.createAnalyser();
	analyser.fftSize = FFT_SIZE;
	const buffer = new Float32Array(analyser.fftSize);

	mediaSource.connect(gainNode);
	gainNode.connect(compressor);
	compressor.connect(highpassFilter);
	highpassFilter.connect(analyser);

	return {
		analyser,
		mediaStream,
		mediaSource,
		gainNode,
		compressor,
		highpassFilter,
		buffer,
		sourceType: 'microphone'
	};
}

export async function createAudioChainFromFile(
	audioContext: AudioContext,
	audioUrl: string,
	gainValue: number
): Promise<AudioChain> {
	const audioElement = new Audio(audioUrl);
	audioElement.loop = true;
	audioElement.crossOrigin = 'anonymous';

	const audioElementSource = audioContext.createMediaElementSource(audioElement);

	const gainNode = audioContext.createGain();
	gainNode.gain.value = gainValue;

	const compressor = audioContext.createDynamicsCompressor();
	compressor.threshold.value = -20;
	compressor.knee.value = 30;
	compressor.ratio.value = 4;
	compressor.attack.value = 0.01;
	compressor.release.value = 0.1;

	const highpassFilter = audioContext.createBiquadFilter();
	highpassFilter.type = 'highpass';
	highpassFilter.frequency.value = 40;

	const analyser = audioContext.createAnalyser();
	analyser.fftSize = FFT_SIZE;
	const buffer = new Float32Array(analyser.fftSize);

	audioElementSource.connect(gainNode);
	gainNode.connect(compressor);
	compressor.connect(highpassFilter);
	highpassFilter.connect(analyser);
	// Also connect to destination so we can hear it
	highpassFilter.connect(audioContext.destination);

	// Start playing
	await audioElement.play();

	return {
		analyser,
		audioElement,
		audioElementSource,
		gainNode,
		compressor,
		highpassFilter,
		buffer,
		sourceType: 'file'
	};
}

export function teardownAudioChain(chain: AudioChain | null) {
	if (!chain) return;

	if (chain.sourceType === 'microphone') {
		chain.mediaStream?.getTracks().forEach((track) => track.stop());
		chain.mediaSource?.disconnect();
	} else if (chain.sourceType === 'file') {
		// Pause and fully unload any playing HTMLAudioElement to prevent overlap
		try {
			if (chain.audioElement) {
				chain.audioElement.pause();
				// Reset playback position and unload source to ensure no lingering audio
				chain.audioElement.currentTime = 0;
				chain.audioElement.src = '';
				chain.audioElement.load();
			}
		} finally {
			chain.audioElement = undefined;
		}
		chain.audioElementSource?.disconnect();
	}

	chain.gainNode.disconnect();
	chain.compressor.disconnect();
	chain.highpassFilter.disconnect();
	chain.analyser.disconnect();
}
