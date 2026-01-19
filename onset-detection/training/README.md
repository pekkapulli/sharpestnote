# Onset Detection Neural Network Training

This directory contains the training pipeline for the onset detection neural network.

## Setup

```bash
cd onset-detection/training
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Data Preparation

Place your JSON training files in `data/raw/`. Each file should contain:

- `manualOnsets`: Array of manual onset timestamps
- `analysisData`: Array of frames with features:
  - `timestamp`
  - `amplitude`
  - `spectralFlux`
  - `phaseDeviation`
  - `highFrequencyEnergy`
  - `hasPitch`

## Training Pipeline

1. **Preprocess data**:

```bash
python scripts/preprocess.py
```

2. **Train model**:

```bash
python scripts/train.py
```

3. **Evaluate model**:

```bash
python scripts/evaluate.py
```

## Model Export

The trained model will be converted to TensorFlow.js format and saved in `models/saved/tfjs_model/`.

## Browser Integration

The exported model is loaded by `src/lib/tuner/ml/inference.ts` for real-time onset detection.
