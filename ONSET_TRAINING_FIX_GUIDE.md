# Onset Training Debug - Quick Reference

## 🔴 TWO CRITICAL BUGS FOUND

### Bug #1: Features NOT Scaled in Inference (CRITICAL)

```
TRAINING:                          INFERENCE:
Feature: amplitude = 0.1           Feature: amplitude = 0.1
Scaler: mean=0.08, std=0.03        ❌ Scaler NOT applied

Scaled: (0.1 - 0.08) / 0.03        Raw: 0.1
      = +0.67 σ                         (model expects -1 to +3)

Model TRAINED on: [-1σ to +3σ]     Model RECEIVES: [0 to 1 raw]

Result: Predictions ≈ 0.5 always (uncertain)
```

**File:** [src/lib/tuner/ml/onsetModel.ts](src/lib/tuner/ml/onsetModel.ts)  
**Line:** [38-70](src/lib/tuner/ml/onsetModel.ts#L38)

**Fix:** Add scaler loading and apply it in `predict()` method

- Load `scaler.json` (mean, std arrays)
- For each feature: `(raw_value - mean) / std`

---

### Bug #2: FFT Window 46ms, Frames 10ms (CRITICAL)

```
FFT WINDOW:          FRAMES:
[0-46ms] FFT A      [0ms]   Frame 0 → gets FFT A's spectralFlux
         ↓flux=0.15 [10ms]  Frame 1 → gets FFT A's spectralFlux (same!)
                    [20ms]  Frame 2 → gets FFT A's spectralFlux (same!)
                    [30ms]  Frame 3 → gets FFT A's spectralFlux (same!)
                    [40ms]  Frame 4 → gets FFT A's spectralFlux (same!)
                    [50ms]  Frame 5 → gets FFT B's spectralFlux

Training Window (5 frames):        Actual at Inference:
Frames [0,1,2,3,4] →              FFT rates different
flux = [0.15, 0.15, 0.15,        flux varies frame-to-frame
        0.15, 0.15]
      (learns: "flux is constant")  (doesn't see constant patterns)

Result: Overfits to artifact, poor generalization
```

**File:** [src/lib/tuner/audioGraph.ts](src/lib/tuner/audioGraph.ts)  
**Line:** [13](src/lib/tuner/audioGraph.ts#L13)

**Fix:** Change FFT size from 2048 → 1024

- Hop size: ~512 samples = ~11.6ms (instead of ~46ms)
- Features update ~every 10ms, aligns with frames
- Removes duplicate-frame artifact

---

## Implementation Checklist

### ✅ Fix #1: Add Scaler (15 minutes)

**Step 1:** In training script, save scaler as JSON

```python
# In train.py, after scaler.fit_transform():
scaler_data = {
    "mean": scaler.mean_.tolist(),
    "std": scaler.scale_.tolist()  # Note: sklearn uses scale_
}
with open(output_path / "scaler.json", "w") as f:
    json.dump(scaler_data, f)
```

**Step 2:** In onsetModel.ts, load and apply scaler

```typescript
private scalerMean: number[] = [];
private scalerStd: number[] = [];

async load(modelPath: string) {
    // ... load model and config ...

    const scalerResponse = await fetch(`${modelPath}/scaler.json`);
    const scalerData = await scalerResponse.json();
    this.scalerMean = scalerData.mean;
    this.scalerStd = scalerData.std;
}

private scaleFeatures(features: number[]): number[] {
    return features.map((v, i) => (v - this.scalerMean[i]) / this.scalerStd[i]);
}

predict(features: number[]): OnsetPrediction | null {
    // ... validation ...
    const scaledFeatures = this.scaleFeatures(features);  // ADD THIS LINE
    const inputTensor = tf.tensor2d([scaledFeatures], [1, 25]);
    // ... rest of predict
}
```

### ✅ Fix #2: Change FFT Size (5 minutes)

**File:** [src/lib/tuner/audioGraph.ts](src/lib/tuner/audioGraph.ts) Line 13

**Change:**

```typescript
const FFT_SIZE = 2048;  // Current
```

**To:**

```typescript
const FFT_SIZE = 1024;  // New: ~23ms window, ~11.6ms hop
```

---

## Expected Improvement

| Metric                    | Before                       | After                   |
| ------------------------- | ---------------------------- | ----------------------- |
| ML Onset Detection Rate   | ~0% (always 0.5 probability) | ~70-90%                 |
| Agreement with Rule-based | Very poor                    | Good                    |
| Model Confidence          | Low/uncertain                | High when onset present |

---

## Validation Steps

After fixes, test with:

1. **Load test-audio.wav** in onset-training page
2. **Export training data** - check console for scaler confirmation
3. **Listen to debug output** - ML should now detect onsets (check console logs)
4. **Compare probabilities** - should be near 0 or near 1, not 0.5

---

## Files to Modify

1. ✏️ [src/lib/tuner/ml/onsetModel.ts](src/lib/tuner/ml/onsetModel.ts) - Add scaler
2. ✏️ [onset-detection/training/scripts/train.py](onset-detection/training/scripts/train.py) - Export scaler
3. ✏️ [src/lib/tuner/audioGraph.ts](src/lib/tuner/audioGraph.ts) - Change FFT_SIZE

---

## For Detailed Analysis

See: [ONSET_TRAINING_DEBUG_ANALYSIS.md](ONSET_TRAINING_DEBUG_ANALYSIS.md)

This file contains:

- Full technical breakdown of each issue
- Root cause analysis with examples
- Optional medium-priority fixes
- Comprehensive testing strategy
- Timeline-based recommendations
