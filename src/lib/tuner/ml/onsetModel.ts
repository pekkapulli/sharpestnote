import * as tf from '@tensorflow/tfjs';

export interface OnsetModelConfig {
	inputShape: number[];
	outputShape: number[];
	optimalThreshold: number;
	version: string;
	created: string;
}

export interface OnsetPrediction {
	probability: number;
	isOnset: boolean;
	threshold: number;
}

export class OnsetModel {
	private model: tf.LayersModel | null = null;
	private config: OnsetModelConfig | null = null;
	private scaler: { mean: number[]; std: number[] } | null = null;
	private isLoaded = false;

	async load(modelPath: string): Promise<void> {
		try {
			// Load the model
			this.model = await tf.loadLayersModel(`${modelPath}/model.json`);

			// Load the config
			const configResponse = await fetch(`${modelPath}/config.json`);
			this.config = await configResponse.json();

			this.isLoaded = true;
			console.log('[OnsetModel] Model loaded successfully', this.config);
		} catch (error) {
			console.error('[OnsetModel] Failed to load model:', error);
			throw error;
		}
	}

	/**
	 * Predict onset probability for a single frame
	 * @param features Array of 25 features (5 base features + 4 frames of history)
	 */
	predict(features: number[]): OnsetPrediction | null {
		if (!this.isLoaded || !this.model || !this.config) {
			console.warn('[OnsetModel] Model not loaded');
			return null;
		}

		if (features.length !== 25) {
			console.warn(`[OnsetModel] Expected 25 features, got ${features.length}`);
			return null;
		}

		try {
			// Create tensor from features
			const inputTensor = tf.tensor2d([features], [1, 25]);

			// Run prediction
			const prediction = this.model.predict(inputTensor) as tf.Tensor;
			const probability = prediction.dataSync()[0];

			// Clean up tensors
			inputTensor.dispose();
			prediction.dispose();

			const isOnset = probability > this.config.optimalThreshold;

			return {
				probability,
				isOnset,
				threshold: this.config.optimalThreshold
			};
		} catch (error) {
			console.error('[OnsetModel] Prediction error:', error);
			return null;
		}
	}

	/**
	 * Batch predict for multiple frames
	 */
	predictBatch(featuresBatch: number[][]): OnsetPrediction[] | null {
		if (!this.isLoaded || !this.model || !this.config) {
			return null;
		}

		try {
			const inputTensor = tf.tensor2d(featuresBatch);
			const predictions = this.model.predict(inputTensor) as tf.Tensor;
			const probabilities = Array.from(predictions.dataSync());

			inputTensor.dispose();
			predictions.dispose();

			return probabilities.map((probability) => ({
				probability,
				isOnset: probability > this.config!.optimalThreshold,
				threshold: this.config!.optimalThreshold
			}));
		} catch (error) {
			console.error('[OnsetModel] Batch prediction error:', error);
			return null;
		}
	}

	getConfig(): OnsetModelConfig | null {
		return this.config;
	}

	isReady(): boolean {
		return this.isLoaded;
	}

	dispose(): void {
		if (this.model) {
			this.model.dispose();
			this.model = null;
			this.config = null;
			this.isLoaded = false;
		}
	}
}
