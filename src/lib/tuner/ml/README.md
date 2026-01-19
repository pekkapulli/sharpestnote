# ML Onset Detection Integration

This directory contains the integration of a trained neural network model for onset detection in the tuner.

## Model Details

- **Location**: `/static/models/onset-model-v1/`
- **Training Data**: 6,916 samples from violin recordings
- **Features**: 25 features (5 base features + 4 frames of temporal context)
  - Amplitude
  - Spectral Flux
  - Phase Deviation
  - High Frequency Energy
  - Has Pitch (boolean)

## Performance Metrics

- **Accuracy**: 87.14%
- **Precision**: 50.46%
- **Recall**: 91.71% (catches 92% of onsets!)
- **AUC**: 94.88%
- **Optimal Threshold**: 0.4993

## Integration

The ML model runs in parallel with the existing rule-based onset detection for comparison:

1. **Non-intrusive**: The ML model logs predictions but doesn't affect the current onset detection
2. **Comparison Mode**: Logs are generated when predictions differ from rule-based detection
3. **Debug Mode**: Enable `debug: true` in tuner options to see ML predictions

## Usage

The model is automatically loaded when the tuner starts. Check the console for these logs:

- `🤖 ML Model detected onset (rule-based missed)` - ML found an onset the rules missed
- `📊 Rule-based detected onset (ML missed)` - Rules found an onset ML missed
- `✅ Both detected onset` - Both systems agreed

## Future Work

- Collect more training data from different instruments
- Retrain with data augmentation
- Implement A/B testing to compare ML vs rule-based accuracy
- Consider hybrid approach combining both methods
- Add user feedback mechanism to improve the model

## Model Files

- `model.json` - Model architecture
- `group1-shard1of1.bin` - Model weights
- `config.json` - Model configuration with optimal threshold

## Training

The model was trained using:

- TensorFlow/Keras 2.19.0
- 100 epochs with early stopping
- Adam optimizer
- Binary cross-entropy loss
- Class weighting to handle imbalanced data (13% onset samples)

See `/onset-detection/training/` for training scripts.
