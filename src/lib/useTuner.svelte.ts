import { untrack } from 'svelte';
import {
	autoCorrelate,
	centsOff,
	frequencyFromNoteNumber,
	noteFromPitch,
	noteNameFromMidi,
	type Accidental
} from '$lib';

const FFT_SIZE = 2048;

export interface TunerState {
	isListening: boolean;
	frequency: number | null;
	cents: number | null;
	note: string | null;
	error: string | null;
	devices: MediaDeviceInfo[];
	selectedDeviceId: string | null;
}

export interface TunerOptions {
	a4?: number;
	accidental?: Accidental;
	debounceTime?: number;
}

export function createTuner(options: TunerOptions = {}) {
	let audioContext: AudioContext | null = null;
	let analyser: AnalyserNode | null = null;
	let mediaStream: MediaStream | null = null;
	let mediaSource: MediaStreamAudioSourceNode | null = null;
	let rafId: number | null = null;
	let buffer: Float32Array | null = null;
	let noteDebounceId: number | null = null;
	let debouncedNote: string | null = null;
	let pendingNote: string | null = null;

	const state = $state<TunerState>({
		isListening: false,
		frequency: null,
		cents: null,
		note: null,
		error: null,
		devices: [],
		selectedDeviceId: null
	});

	const a4 = $state({ value: options.a4 ?? 442 });
	const accidental = $state({ value: options.accidental ?? 'sharp' });
	const debounceTime = $state({ value: options.debounceTime ?? 200 });

	async function refreshDevices() {
		try {
			const list = await navigator.mediaDevices.enumerateDevices();
			state.devices = list.filter((d) => d.kind === 'audioinput');
			if (!state.selectedDeviceId && state.devices.length) {
				state.selectedDeviceId = state.devices[0].deviceId;
			}
		} catch (err) {
			console.error(err);
			state.error = 'Could not list audio devices.';
		}
	}

	async function start() {
		try {
			state.error = null;
			stop();

			audioContext = audioContext ?? new AudioContext();
			await audioContext.resume();

			analyser = audioContext.createAnalyser();
			analyser.fftSize = FFT_SIZE;
			buffer = new Float32Array(analyser.fftSize);

			const constraints: MediaStreamConstraints = {
				audio: state.selectedDeviceId
					? {
							deviceId: { exact: state.selectedDeviceId },
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

			mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
			mediaSource = audioContext.createMediaStreamSource(mediaStream);
			mediaSource.connect(analyser);

			state.isListening = true;
			refreshDevices();
			tick();
		} catch (err) {
			console.error(err);
			state.error = 'Unable to start microphone. Please check permissions.';
			stop();
		}
	}

	function stop() {
		if (noteDebounceId) {
			clearTimeout(noteDebounceId);
			noteDebounceId = null;
		}
		debouncedNote = null;
		pendingNote = null;

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
		state.isListening = false;
	}

	function tick() {
		const data = buffer;
		if (!analyser || !audioContext || !data) {
			return;
		}

		const tempData = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>;
		analyser.getFloatTimeDomainData(tempData);
		const freq = autoCorrelate(tempData, audioContext.sampleRate);

		if (freq > 0) {
			const currentA4 = untrack(() => a4.value);
			const currentAccidental = untrack(() => accidental.value);

			const midi = noteFromPitch(freq, currentA4);
			const target = frequencyFromNoteNumber(midi, currentA4);
			state.frequency = freq;
			state.cents = centsOff(freq, target);
			const detectedNote = noteNameFromMidi(midi, currentAccidental);

			// Debounce note changes to smooth transient noise
			if (detectedNote !== pendingNote) {
				if (noteDebounceId) clearTimeout(noteDebounceId);
				pendingNote = detectedNote;
				noteDebounceId = window.setTimeout(() => {
					debouncedNote = pendingNote;
					state.note = pendingNote;
					noteDebounceId = null;
				}, debounceTime.value);
			} else if (noteDebounceId === null && state.note !== debouncedNote) {
				// Timer already fired; sync state if needed
				state.note = debouncedNote;
			}
		} else {
			state.frequency = null;
			state.cents = null;
			if (noteDebounceId) {
				clearTimeout(noteDebounceId);
				noteDebounceId = null;
			}
			debouncedNote = null;
			pendingNote = null;
			state.note = null;
		}

		rafId = requestAnimationFrame(tick);
	}

	function checkSupport() {
		if (!navigator.mediaDevices?.getUserMedia) {
			state.error = 'Microphone access is not available in this browser.';
			return false;
		}
		return true;
	}

	return {
		get state() {
			return state;
		},
		get a4() {
			return a4.value;
		},
		set a4(value: number) {
			a4.value = value;
		},
		get accidental() {
			return accidental.value;
		},
		set accidental(value: Accidental) {
			accidental.value = value;
		},
		get debounceTime() {
			return debounceTime.value;
		},
		set debounceTime(value: number) {
			debounceTime.value = value;
		},
		start,
		stop,
		refreshDevices,
		checkSupport,
		destroy: stop
	};
}
