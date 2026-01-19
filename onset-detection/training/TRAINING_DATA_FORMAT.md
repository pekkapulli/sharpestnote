# Onset Detection Training Data Format

## Overview

This document describes the training data format and preprocessing pipeline for the onset detection neural network. The approach is designed for real-time, causal inference with fast repeat detection capabilities.

## Key Principles

### 1. Fixed Frame Rate

- **Hop size**: ~10ms (measured from actual data)
- **Frame rate**: ~100 Hz
- Fixed across all recordings
- No variable-length windows

### 2. Causal Windowing

- **Window size**: 5 frames (50ms of context)
- **Structure**: `[t-4, t-3, t-2, t-1, t]`
- Only uses PAST data (no future lookahead)
- Matches real-time inference constraints

### 3. Onset Labeling

- **Tolerance window**: ±10ms around each onset
- **Frame tolerance**: ±1 frame (at 10ms hop)
- Each onset creates positive labels for frames: `t-1, t, t+1`
- Absorbs labeling imprecision
- Matches human perception threshold

### 4. Data Balance

- **Target positive ratio**: ≥20%
- Random downsampling of negatives if needed
- Prevents "always predict zero" solution
- No oversampling of positives

## Data Pipeline

### Recording (onset-training/+page.svelte)

```
User plays instrument →
  Sample at 10ms intervals →
    Extract 5 features per frame →
      User marks onsets manually →
        Export JSON with ±1 frame tolerance
```

**Exported format**:

```json
[
  {
    "timestamp": 53352.1,
    "amplitude": 0.0015,
    "spectralFlux": 0.385,
    "phaseDeviation": 1.475,
    "highFrequencyEnergy": 0.016,
    "hasPitch": false,
    "hasManualOnset": false
  },
  ...
]
```

### Preprocessing (scripts/preprocess.py)

```
Load JSON files →
  Build 5-frame windows →
    Flatten to 25 features →
      Balance dataset →
        Normalize features →
          Save for training
```

**Window construction**:

- For each frame `t >= 4`:
  - Input: `[features(t-4), features(t-3), features(t-2), features(t-1), features(t)]`
  - Features per frame: 5 (amplitude, flux, phase, HF energy, hasPitch)
  - Total input size: 5 frames × 5 features = **25 features**
  - Label: `hasManualOnset` from frame `t`

**Skip first 4 frames** (insufficient history)

### Training (scripts/train.py)

Standard binary classification:

- Input shape: `(batch, 25)`
- Output: Single sigmoid neuron
- Loss: Binary cross-entropy
- Metrics: Precision, Recall, AUC

## What the Model Learns

**The model answers:**

> "Given the last 50ms of audio, am I in the neighborhood of a new articulation?"

**NOT:**

- "Did something happen exactly now?"
- "Is this frame special?"
- "What will happen next?"

This distinction is crucial for:

- Fast repeat detection
- Robust to timing jitter
- Stable real-time inference

## Why These Choices?

### Why 5 frames (50ms)?

- Sweet spot for bow re-articulation cues
- Captures HF noise bursts
- Sufficient for envelope slope
- Longer windows add little useful info
- Increases latency unnecessarily

### Why ±10ms tolerance?

- Matches human labeling precision
- Absorbs annotation jitter
- Aligns with perceptual threshold
- Stabilizes training gradients

### Why causal only?

- Required for real-time inference
- Web constraints (no buffering)
- Symmetric windows cause edge jitter
- Train behavior you can actually deploy

### Why 20% positive ratio?

- Enough signal for learning
- Not too imbalanced
- Avoids "always zero" collapse
- Preserves temporal structure

## File Structure

```
onset-detection/training/
├── data/
│   ├── raw/               # JSON files from onset-training page
│   │   ├── onset-training-violin-1.json
│   │   └── onset-training-viola-1.json
│   └── processed/         # Preprocessed NumPy arrays
│       ├── X.npy          # Features (n_samples, 25)
│       ├── y.npy          # Labels (n_samples,)
│       ├── scaler.pkl     # StandardScaler for inference
│       └── metadata.json  # Dataset statistics
├── models/
│   └── saved/             # Trained models
│       ├── best_model.keras
│       ├── final_model.keras
│       └── tfjs_model/    # Browser-compatible model
└── scripts/
    ├── preprocess.py      # Data preprocessing
    ├── train.py           # Model training
    └── evaluate.py        # Evaluation metrics
```

## Usage

### 1. Record Training Data

```bash
# Open in browser
http://localhost:5173/onset-training

# 1. Select microphone or upload audio file
# 2. Click "Start Recording"
# 3. Play instrument with clear onsets
# 4. Click "Stop Recording"
# 5. Click on timeline to mark onsets
# 6. Export JSON
```

### 2. Preprocess Data

```bash
cd onset-detection/training
python scripts/preprocess.py
```

Expected output:

```
Found 2 JSON files
Processing onset-training-violin-1.json...
  - Extracted 6912 samples, 906 onsets (13.11%)

Before balancing:
  Total samples: 8876
  Total onsets: 1032 (11.63%)

Positive ratio (0.116) is below target (0.200)
Downsampling negatives...
  New ratio: 0.200

After balancing:
  Total samples: 5160
  Feature shape: (5160, 25)
```

### 3. Train Model

```bash
python scripts/train.py
```

## Quality Checks

### Good training data has:

- ✅ Consistent ~10ms hop size
- ✅ 10-20%+ onset ratio before balancing
- ✅ Clean, synchronized onset markers
- ✅ Multiple instruments/playing styles
- ✅ Various dynamics and tempos

### Bad training data has:

- ❌ Variable hop sizes
- ❌ <5% onset ratio (too sparse)
- ❌ Misaligned onset markers
- ❌ Only one instrument
- ❌ Only slow passages

## Future Improvements

### NOT recommended:

- ❌ Longer windows (>50ms) - adds latency, little gain
- ❌ Future lookahead - can't deploy in real-time
- ❌ Smaller hop (<5ms) - marginal gains, much more compute
- ❌ Oversampling positives - destroys temporal structure

### Worth exploring:

- ✅ More diverse instruments
- ✅ Augmentation: pitch shift, time stretch
- ✅ Multi-task learning (onset + pitch)
- ✅ Attention over the 5-frame window
- ✅ Separate models per instrument family

## References

This format follows best practices for real-time onset detection:

1. Causal processing for zero-latency inference
2. Tolerance windows for robust labeling
3. Balanced datasets for stable training
4. Minimal context for fast repeats
