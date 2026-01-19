import { SvelteDate } from 'svelte/reactivity';
import { OnsetModel, type OnsetPrediction } from './ml/onsetModel';

const ML_WINDOW_SIZE = 5; // Same as training: current + 4 previous frames
const ML_LOG_INTERVAL = 500; // ms between diagnostic logs

export interface MLState {
	mlModelReady: boolean;
	mlModelLoadStarted: boolean;
	mlModelLoadFailed: boolean;
	mlFeatureHistory: number[][];
	mlDiagLastState: string | null;
	mlDiagLastLogTime: number;
	mlOnsetDetected: boolean;
	mlOnsetProbability: number;
}

export function createMLState(basePath: string = '') {
	const state: MLState = {
		mlModelReady: false,
		mlModelLoadStarted: false,
		mlModelLoadFailed: false,
		mlFeatureHistory: [],
		mlDiagLastState: null,
		mlDiagLastLogTime: 0,
		mlOnsetDetected: false,
		mlOnsetProbability: 0
	};

	const mlModel = new OnsetModel();
	const mlModelPath = `${basePath}/models/onset-model-v1`;

	function debugLogForce(...args: unknown[]): void {
		const timestamp = new SvelteDate().toISOString().split('T')[1].slice(0, -1); // HH:MM:SS.mmm
		console.log(`[Tuner ${timestamp}]`, ...args);
	}

	async function ensureMlModelLoad() {
		if (state.mlModelReady || state.mlModelLoadStarted) return;
		state.mlModelLoadStarted = true;
		state.mlModelLoadFailed = false;
		const loadStart = performance.now();
		const loadTimeout = window.setTimeout(() => {
			if (!state.mlModelReady) {
				debugLogForce('[ML] Model load still pending after 5s');
			}
		}, 5000);
		debugLogForce(`[ML] Loading onset model from ${mlModelPath}`);
		try {
			const probe = await fetch(`${mlModelPath}/model.json`, { method: 'GET' });
			if (!probe.ok) {
				throw new Error(`Probe failed with status ${probe.status}`);
			}
		} catch (err) {
			state.mlModelLoadFailed = true;
			state.mlModelLoadStarted = false;
			window.clearTimeout(loadTimeout);
			debugLogForce('[ML] Probe failed before loading model', err);
			return;
		}

		mlModel
			.load(mlModelPath)
			.then(() => {
				state.mlModelReady = true;
				state.mlModelLoadFailed = false;
				debugLogForce(
					`[ML] Onset model loaded successfully in ${Math.round(performance.now() - loadStart)}ms`
				);
			})
			.catch((err) => {
				state.mlModelLoadFailed = true;
				state.mlModelLoadStarted = false; // allow retry on next start
				debugLogForce('[ML] Failed to load model', err);
			})
			.finally(() => {
				window.clearTimeout(loadTimeout);
			});
	}

	function updateMLDiagnostics(now: number) {
		const mlDiagState = state.mlModelLoadFailed
			? 'failed'
			: !state.mlModelReady
				? 'not-ready'
				: state.mlFeatureHistory.length < ML_WINDOW_SIZE
					? 'warming-up'
					: 'predicting';

		if (mlDiagState !== state.mlDiagLastState && now - state.mlDiagLastLogTime > ML_LOG_INTERVAL) {
			state.mlDiagLastState = mlDiagState;
			state.mlDiagLastLogTime = now;
			switch (mlDiagState) {
				case 'failed':
					debugLogForce('[ML] Model load failed — see previous error');
					break;
				case 'not-ready':
					debugLogForce('[ML] Waiting for model to load...');
					// If load never started, kick it off from here as a safety net
					if (!state.mlModelLoadStarted) {
						ensureMlModelLoad();
					}
					break;
				case 'warming-up':
					debugLogForce('[ML] Collecting history before first prediction');
					break;
				case 'predicting':
					debugLogForce('[ML] Running predictions');
					break;
			}
		}
	}

	function predict(
		normalizedAmplitude: number,
		normalizedExcitation: number,
		normalizedPhaseDeviation: number,
		highFrequencyEnergy: number,
		hasPitch: boolean,
		onsetDetected: boolean,
		frequency: number | null
	): OnsetPrediction | null {
		if (!state.mlModelReady) {
			state.mlOnsetDetected = false;
			state.mlOnsetProbability = 0;
			return null;
		}

		// Build feature vector: [amplitude, spectralFlux, phaseDeviation, highFrequencyEnergy, hasPitch]
		const currentFeatures = [
			normalizedAmplitude,
			normalizedExcitation,
			normalizedPhaseDeviation,
			highFrequencyEnergy,
			hasPitch ? 1.0 : 0.0
		];

		// Store in history
		state.mlFeatureHistory.push(currentFeatures);
		if (state.mlFeatureHistory.length > ML_WINDOW_SIZE) {
			state.mlFeatureHistory.shift(); // Keep only last 5 frames
		}

		// Once we have enough history, build full feature vector and predict
		if (state.mlFeatureHistory.length === ML_WINDOW_SIZE) {
			// Build feature vector: current frame + 4 previous frames (25 features total)
			const fullFeatures: number[] = [];
			for (let i = 0; i < ML_WINDOW_SIZE; i++) {
				fullFeatures.push(...state.mlFeatureHistory[i]);
			}

			const prediction = mlModel.predict(fullFeatures);
			if (prediction) {
				// Update state with ML prediction
				state.mlOnsetDetected = prediction.isOnset;
				state.mlOnsetProbability = prediction.probability;

				// Log ML prediction for comparison (show all detections)
				if (prediction.isOnset) {
					const pitchInfo = hasPitch ? `freq=${frequency?.toFixed(1)}Hz` : '(no pitch lock)';
					if (!onsetDetected) {
						debugLogForce(
							`🤖 ML detected onset (rule-based missed): prob=${prediction.probability.toFixed(3)} ${pitchInfo}`
						);
					} else {
						debugLogForce(
							`✅ Both detected onset: ML prob=${prediction.probability.toFixed(3)} rule=yes ${pitchInfo}`
						);
					}
				} else if (!prediction.isOnset && onsetDetected) {
					debugLogForce(
						`📊 Rule-based detected onset (ML missed): prob=${prediction.probability.toFixed(3)}`
					);
				}

				// Debug: log every 5th prediction with probability to see model output
				if (Math.random() < 0.2) {
					console.log(
						`[ML] Prediction: isOnset=${prediction.isOnset}, prob=${prediction.probability.toFixed(3)}, rule=${onsetDetected}`
					);
				}
			} else {
				debugLogForce('⚠️ ML prediction returned null');
			}

			return prediction;
		} else {
			// Not enough history yet, reset ML state
			state.mlOnsetDetected = false;
			state.mlOnsetProbability = 0;
			return null;
		}
	}

	function reset() {
		state.mlFeatureHistory.length = 0;
		state.mlOnsetDetected = false;
		state.mlOnsetProbability = 0;
		state.mlDiagLastState = null;
		state.mlDiagLastLogTime = 0;
	}

	return {
		state,
		ensureMlModelLoad,
		updateMLDiagnostics,
		predict,
		reset
	};
}
