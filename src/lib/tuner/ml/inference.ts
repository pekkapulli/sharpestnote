/**
 * ML-based onset detection inference using TensorFlow.js
 */
import * as tf from '@tensorflow/tfjs';

interface OnsetModelConfig {
	inputShape: number[];
	outputShape: number[];
	optimalThreshold: number;
	version: string;
	created: string;
}

interface OnsetFeatures {
	amplitude: number;
	spectralFlux: number;
	phaseDeviation: number;
	highFrequencyEnergy: number;
	hasPitch: boolean;
}

interface NormalizationParams {
	mean: number[];
	std: number[];
}

export class OnsetDetector {
	private model: tf.LayersModel | null = null;
	private config: OnsetModelConfig | null = null;
	private normalizationParams: NormalizationParams | null = null;
	private featureHistory: OnsetFeatures[] = [];
	private readonly windowSize: number = 5;
	private isReady: boolean = false;

	async initialize(modelPath: string = '/models/onset-detection'): Promise<void> {
		try {
			console.log('Loading onset detection model...');

			// Load model configuration
			const configResponse = await fetch(`${modelPath}/config.json`);
			this.config = await configResponse.json();

			// Load normalization parameters
			const normResponse = await fetch(`${modelPath}/normalization.json`);
			this.normalizationParams = await normResponse.json();

			// Load TensorFlow.js model
			this.model = await tf.loadLayersModel(`${modelPath}/model.json`);

			this.isReady = true;
			console.log('Onset detection model loaded successfully', this.config);
		} catch (error) {
			console.error('Failed to load onset detection model:', error);
			this.isReady = false;
		}
	}

	/**
	 * Add a new frame of features to the history buffer
	 */
	addFrame(features: OnsetFeatures): void {
		this.featureHistory.push(features);

		// Keep only the last windowSize frames
		if (this.featureHistory.length > this.windowSize) {
			this.featureHistory.shift();
		}
	}

	/**
	 * Predict whether the current frame contains an onset
	 */
	predictOnset(): { isOnset: boolean; probability: number } | null {
		if (!this.isReady || !this.model || !this.config || !this.normalizationParams) {
			return null;
		}

		// Need enough history for temporal context
		if (this.featureHistory.length < this.windowSize) {
			return { isOnset: false, probability: 0 };
		}

		try {
			// Extract features from history
			const features = this.extractFeatures();

			// Normalize features
			const normalizedFeatures = this.normalizeFeatures(features);

			// Create tensor and predict
			const inputTensor = tf.tensor2d([normalizedFeatures]);
			const prediction = this.model.predict(inputTensor) as tf.Tensor;
			const probability = prediction.dataSync()[0];

			// Cleanup tensors
			inputTensor.dispose();
			prediction.dispose();

			// Apply threshold
			const isOnset = probability >= this.config.optimalThreshold;

			return { isOnset, probability };
		} catch (error) {
			console.error('Error during onset prediction:', error);
			return null;
		}
	}

	/**
	 * Extract feature vector from history buffer
	 */
	private extractFeatures(): number[] {
		const features: number[] = [];

		// Current frame features
		const currentFrame = this.featureHistory[this.featureHistory.length - 1];
		features.push(
			currentFrame.amplitude,
			currentFrame.spectralFlux,
			currentFrame.phaseDeviation,
			currentFrame.highFrequencyEnergy,
			currentFrame.hasPitch ? 1.0 : 0.0
		);

		// Add temporal context from previous frames
		for (let i = 1; i < this.windowSize; i++) {
			const idx = this.featureHistory.length - 1 - i;
			if (idx >= 0) {
				const frame = this.featureHistory[idx];
				features.push(
					frame.amplitude,
					frame.spectralFlux,
					frame.phaseDeviation,
					frame.highFrequencyEnergy,
					frame.hasPitch ? 1.0 : 0.0
				);
			} else {
				// Pad with zeros if not enough history
				features.push(0, 0, 0, 0, 0);
			}
		}

		return features;
	}

	/**
	 * Normalize features using training statistics
	 */
	private normalizeFeatures(features: number[]): number[] {
		if (!this.normalizationParams) {
			return features;
		}

		const { mean, std } = this.normalizationParams;
		return features.map((value, idx) => {
			if (idx < mean.length && idx < std.length) {
				return (value - mean[idx]) / (std[idx] + 1e-8);
			}
			return value;
		});
	}

	/**
	 * Reset the feature history buffer
	 */
	reset(): void {
		this.featureHistory = [];
	}

	/**
	 * Check if the model is ready for inference
	 */
	isModelReady(): boolean {
		return this.isReady;
	}

	/**
	 * Cleanup resources
	 */
	dispose(): void {
		if (this.model) {
			this.model.dispose();
			this.model = null;
		}
		this.featureHistory = [];
		this.isReady = false;
	}
}
