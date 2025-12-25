export interface AudioChain {
	analyser: AnalyserNode;
	mediaStream: MediaStream;
	mediaSource: MediaStreamAudioSourceNode;
	gainNode: GainNode;
	compressor: DynamicsCompressorNode;
	highpassFilter: BiquadFilterNode;
	buffer: Float32Array;
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
		buffer
	};
}

export function teardownAudioChain(chain: AudioChain | null) {
	if (!chain) return;

	chain.mediaStream.getTracks().forEach((track) => track.stop());
	chain.mediaSource.disconnect();
	chain.gainNode.disconnect();
	chain.compressor.disconnect();
	chain.highpassFilter.disconnect();
	chain.analyser.disconnect();
}
