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
	private scalerMean: number[] = [];
	private scalerStd: number[] = [];
	private isLoaded = false;

	async load(modelPath: string): Promise<void> {
		try {
			// Load the model
			this.model = await tf.loadLayersModel(`${modelPath}/model.json`);

			// Load the config
			const configResponse = await fetch(`${modelPath}/config.json`);
			this.config = await configResponse.json();

			// Load the scaler (mean and std from training)
			try {
				const scalerResponse = await fetch(`${modelPath}/scaler.json`);
				if (scalerResponse.ok) {
					const scalerData = await scalerResponse.json();
					this.scalerMean = scalerData.mean;
					this.scalerStd = scalerData.std;
					console.log('[OnsetModel] Scaler loaded', {
						meanLength: this.scalerMean.length,
						stdLength: this.scalerStd.length
					});
				} else {
					console.warn('[OnsetModel] Scaler.json not found, predictions will use raw features');
				}
			} catch (scalerError) {
				console.warn('[OnsetModel] Failed to load scaler:', scalerError);
			}

			this.isLoaded = true;
			console.log('[OnsetModel] Model loaded successfully', this.config);
		} catch (error) {
			console.error('[OnsetModel] Failed to load model:', error);
			throw error;
		}
	}

	/**
	 * Apply StandardScaler normalization to raw features
	 * @param features Raw feature values
	 * @returns Scaled features (mean=0, std=1)
	 */
	private scaleFeatures(features: number[]): number[] {
		if (this.scalerMean.length === 0 || this.scalerStd.length === 0) {
			// Scaler not loaded, return raw features with warning (first time only)
			if (features.length === 25 && this.scalerMean.length === 0) {
				console.warn(
					'[OnsetModel] Scaler not available, using raw features. ' +
						'Predictions may be inaccurate. Ensure scaler.json is available.'
				);
			}
			return features;
		}

		return features.map((value, i) => {
			const mean = this.scalerMean[i] ?? 0;
			const std = this.scalerStd[i] ?? 1;
			// Prevent division by zero
			if (std === 0) return 0;
			return (value - mean) / std;
		});
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
			// CRITICAL: Scale features using training set statistics
			const scaledFeatures = this.scaleFeatures(features);

			// Create tensor from scaled features
			const inputTensor = tf.tensor2d([scaledFeatures], [1, 25]);

			// Run prediction
			const prediction = this.model.predict(inputTensor) as tf.Tensor;
			const probability = prediction.dataSync()[0];

			// Clean up tensors
			inputTensor.dispose();
			prediction.dispose();

			// Slightly higher threshold for single frame
			const isOnset = probability > this.config.optimalThreshold * 1.3;

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
			// Scale each feature vector in the batch
			const scaledBatch = featuresBatch.map((features) => this.scaleFeatures(features));

			const inputTensor = tf.tensor2d(scaledBatch);
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
