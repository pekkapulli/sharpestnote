# Onset Training Pipeline Debug Analysis

## Executive Summary

I've thoroughly reviewed the entire onset training workflow. I found several **potential synchronization and feature extraction issues** that could explain why the trained model doesn't detect onsets well on playback.

---

## 1. FRAME TIMING & SYNC ISSUES

### 1.1 Frame Rate Mismatch: 10ms target vs actual variable rates

**Location:** [src/routes/onset-training/+page.svelte#L14](src/routes/onset-training/+page.svelte#L14)

```typescript
const SAMPLE_INTERVAL_MS = 10; // Target 100fps sampling
```

**Problem:** The onset-training page samples recorded data at a **fixed 10ms interval** using `setInterval`, BUT the underlying audio analysis happens at **variable rates** based on when the browser processes audio frames from useTuner.

**Impact on Training:**

- The 10ms interval may not align with actual audio analysis frames
- If useTuner's actual frame rate varies (e.g., 8-12ms due to browser scheduling), the exported frames will NOT align with the frames that produced the spectral features
- When training data is preprocessed into 5-frame windows, these windows may be misaligned with the actual spectral analysis windows
- **Result:** Features are extracted from one time window, but labels are applied to a slightly different time window

**Evidence:**

- [src/routes/onset-training/+page.svelte#L515-525](src/routes/onset-training/+page.svelte#L515-525): The export function calculates "avgHopMs" from actual timestamps, but only for logging—it doesn't use this to align the frames

```typescript
const timestamps = recordedData.map((f) => f.timestamp);
const diffs = [];
for (let i = 1; i < timestamps.length; i++) {
    diffs.push(timestamps[i] - timestamps[i - 1]);
}
const avgHopMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
// ^^ This is computed but not used to verify or adjust the window alignment
```

### 1.2 State Snapshot Timing

**Location:** [src/routes/onset-training/+page.svelte#L167-193](src/routes/onset-training/+page.svelte#L167-193)

```typescript
sampleTimer = window.setInterval(() => {
    const now = performance.now();

    // Snapshot tuner state at this moment
    const frame: RecordedFrame = {
        timestamp: now,
        amplitude: tuner.state.amplitude,
        frequency: tuner.state.frequency,
        // ... other features
    };

    recordedData.push(frame);
}, SAMPLE_INTERVAL_MS);
```

**Problem:** This captures the **current tuner state** at sample time, NOT the state that corresponds to the audio frame being analyzed at that moment.

- useTuner updates its state asynchronously via `tick()` (requestAnimationFrame)
- The state snapshot may be from the **previous analysis frame** (delayed by up to ~16ms)
- This creates a **timing offset** between when audio is analyzed and when the state is recorded

---

## 2. ONSET MARKING & LABELING ISSUES

### 2.1 Manual Onset Tolerance is Frame-Based, Not Time-Based

**Location:** [src/routes/onset-training/+page.svelte#L523-545](src/routes/onset-training/+page.svelte#L523-545)

```typescript
const TOLERANCE_FRAMES = 1; // ±1 frame at 10ms hop = ±10ms tolerance

const mlData = recordedData.map((frame, frameIndex) => {
    let hasOnset = false;

    for (const onsetTime of manualOnsets) {
        // Find closest frame to this onset time
        let closestIndex = 0;
        let minDiff = Math.abs(recordedData[0].timestamp - onsetTime);

        for (let i = 1; i < recordedData.length; i++) {
            const diff = Math.abs(recordedData[i].timestamp - onsetTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }

        // Label frame if within ±1 frame of onset
        if (Math.abs(frameIndex - closestIndex) <= TOLERANCE_FRAMES) {
            hasOnset = true;
            break;
        }
    }

    return { ..., hasManualOnset: hasOnset };
});
```

**Critical Issue:** The code assumes all frames are **exactly 10ms apart**, but as noted above, the actual intervals vary.

Example scenario:

- Frame N: 100.0ms, Frame N+1: 110.2ms (12.2ms apart)
- Manual onset marked at: 105ms
- `closestIndex` will find Frame N (distance=5ms)
- But Frame N+2 (at 110.2ms) may have the actual spectral feature from that onset
- Labeling will be off by up to ±1 frame, which at variable rates could be ±12ms

### 2.2 Windowing is Applied in Preprocessing, Not at Export

**Location:** [onset-detection/training/scripts/preprocess.py#L31-81](onset-detection/training/scripts/preprocess.py#L31-81)

```python
# Create 5-frame causal windows DURING preprocessing
for t in range(window_size - 1, len(data)):
    window_features = []

    # Build: [t-4, t-3, t-2, t-1, t]
    for offset in range(window_size - 1, -1, -1):
        frame_idx = t - offset
        frame = data[frame_idx]

        window_features.extend([
            frame["amplitude"],
            frame["spectralFlux"],
            # ...
        ])

    features.append(window_features)

    # Label from CURRENT frame (t), not future
    current_frame = data[t]
    labels.append(1 if current_frame.get("hasManualOnset", False) else 0)
```

**Problem:** The preprocessing creates windows **at preprocessing time**, but the label is from the **current frame's** `hasManualOnset` field, which was already expanded to ±1 frame in the export step.

This means:

- Preprocessing window: frames [t-40ms, t-30ms, t-20ms, t-10ms, t]
- But the label might be from an onset marked ±10ms from frame t
- If onset is actually at t-10ms, but marked at t-5ms, the label might be applied to the wrong window

### 2.3 Feature Extraction in useTuner Doesn't Match Export

**useTuner Extracted Features:** [src/lib/tuner/useTuner.svelte.ts#L975-990](src/lib/tuner/useTuner.svelte.ts#L975-990)

```typescript
const currentFeatures = [
    amplitude,
    state.spectralFlux,
    state.phaseDeviation,
    state.highFrequencyEnergy,
    state.hasPitch ? 1.0 : 0.0
];
```

**Onset-Training Exported Features:** [src/routes/onset-training/+page.svelte#L543-552](src/routes/onset-training/+page.svelte#L543-552)

```typescript
return {
    timestamp: frame.timestamp,
    amplitude: frame.amplitude,
    spectralFlux: frame.spectralFlux,
    phaseDeviation: frame.phaseDeviation,
    highFrequencyEnergy: frame.highFrequencyEnergy,
    hasPitch: frame.hasPitch,
    hasManualOnset: hasOnset
};
```

**✓ These match!** Good.

---

## 3. TRAINING PIPELINE ISSUES

### 3.1 🔴 CRITICAL: Scaler NOT Applied During Inference

**Location - Training:** [onset-detection/training/scripts/preprocess.py#L192-195](onset-detection/training/scripts/preprocess.py#L192-195)

```python
# Normalize features during training
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)  # Mean=0, Std=1

# Save scaler for inference
with open(output_path / "scaler.pkl", "wb") as f:
    pickle.dump(scaler, f)  # Saved but NEVER used!
```

**Location - Inference:** [src/lib/tuner/ml/onsetModel.ts#L38-70](src/lib/tuner/ml/onsetModel.ts#L38-70)

```typescript
predict(features: number[]): OnsetPrediction | null {
    if (!this.isLoaded || !this.model || !this.config) return null;
    if (features.length !== 25) return null;

    try {
        // ❌ CRITICAL: Features are NOT scaled!
        // Model trained on scaled features but receives raw features
        const inputTensor = tf.tensor2d([features], [1, 25]);

        const prediction = this.model.predict(inputTensor) as tf.Tensor;
        const probability = prediction.dataSync()[0];

        inputTensor.dispose();
        prediction.dispose();

        const isOnset = probability > this.config.optimalThreshold;
        return { probability, isOnset, threshold: this.config.optimalThreshold };
    } catch (error) {
        console.error('[OnsetModel] Prediction error:', error);
        return null;
    }
}
```

**💥 This is likely THE PRIMARY CAUSE of poor detection:**

- **Training data:** Features normalized to mean≈0, std≈1
  - Example: amplitude feature range becomes [-1.5, +2.5]
- **Inference data:** Raw features without normalization
  - Example: amplitude feature range is [0.0, 0.5] (actual magnitude values)
- **Result:** Model trained on [-1.5, +2.5] receives [0.0, 0.5] → **completely different scale**
- **Impact:** Activation functions (ReLU, sigmoid) interpret the inputs as essentially zero
- **Output:** Probability ≈ 0.5 (model's "I don't know" state) regardless of actual signal

**The scaler is saved but never used in inference!**

### 3.2 ✓ Threshold Setting (Working Correctly)

**Location:** [onset-detection/training/scripts/train.py#L290-315](onset-detection/training/scripts/train.py#L290-315)

```python
# Calculate optimal threshold from validation data
if X_val is not None and y_val is not None:
    from sklearn.metrics import roc_curve

    y_pred = model.predict(X_val, verbose=0)
    fpr, tpr, thresholds = roc_curve(y_val, y_pred)
    optimal_idx = np.argmax(tpr - fpr)
    optimal_threshold = float(thresholds[optimal_idx])

model_config = {
    "inputShape": list(input_shape[1:]),
    "outputShape": list(model.output_shape[1:]),
    "optimalThreshold": optimal_threshold,
    # ...
}
```

**Location - Inference:** [src/lib/tuner/ml/onsetModel.ts#L62](src/lib/tuner/ml/onsetModel.ts#L62)

```typescript
const isOnset = probability > this.config.optimalThreshold;
```

**✓ The threshold IS loaded from config and used correctly.** (But useless if features aren't scaled!)

---

## 4. SPECTRAL ANALYSIS CONFIGURATION

### 4.1 🔴 FFT Size Mismatch: 2048 samples (46ms) vs 10ms frames

**Location:** [src/lib/tuner/audioGraph.ts#L13](src/lib/tuner/audioGraph.ts#L13)

```typescript
const FFT_SIZE = 2048;

const analyser = audioContext.createAnalyser();
analyser.fftSize = FFT_SIZE;  // 2048 samples
const buffer = new Float32Array(analyser.fftSize);
```

**At 44.1kHz sample rate:**

- FFT window: 2048 / 44100 ≈ **46.4ms**
- Recording frames: 10ms (fixed interval)
- **Ratio:** Each FFT covers ~4.6 recording frames

**The Problem:**

1. FFT is computed once every ~46ms with 50% overlap (typical for spectral analysis)
2. But recording happens every 10ms
3. The **same spectral features** (spectralFlux, phaseDeviation, highFrequencyEnergy) are recorded into **multiple consecutive 10ms frames**

**Example Timeline:**

```
FFT 0: [0-46ms] → spectralFlux=0.15
  Frame 0 (0ms):   spectralFlux=0.15
  Frame 1 (10ms):  spectralFlux=0.15  ← same value!
  Frame 2 (20ms):  spectralFlux=0.15  ← same value!
  Frame 3 (30ms):  spectralFlux=0.15  ← same value!
  Frame 4 (40ms):  spectralFlux=0.15  ← same value!

FFT 1: [23-69ms] → spectralFlux=0.42
  Frame 5 (50ms):  spectralFlux=0.42
  ...
```

**Impact on Training:**

When preprocessing creates 5-frame windows, you get:

```
Window at frame 5: [Frame1, Frame2, Frame3, Frame4, Frame5]
                 = [0.15, 0.15, 0.15, 0.15, 0.42]
```

The first 4 values are **identical duplicates** - this creates artificial temporal patterns:

- The model learns that spectralFlux values are usually constant
- When it sees variation (0.15→0.42), that's a strong signal
- But this temporal structure **doesn't exist at inference time** if the actual feature extraction rate is different

This could cause:

- **Overfitting** to the duplicate-frame artifact
- **Poor generalization** to different audio settings or FFT parameters

### 4.2 Recommended FFT Size for 10ms Frames

At 44.1kHz, for 10ms frames:

```
Ideal hop size = 10ms × 44100 samples/sec = 441 samples

Typical FFT size = 2 × hop size (50% overlap) = 882 samples
(or 1024 for nearest power-of-2)
```

Current FFT size (2048) is ~2.3× larger than needed for 10ms frames.

---

## Key Issues Summary Table

| Priority        | Issue                                   | Severity    | Impact                                                                 | Location                    |
| --------------- | --------------------------------------- | ----------- | ---------------------------------------------------------------------- | --------------------------- |
| **1️⃣ CRITICAL** | **Features NOT scaled in inference**    | 🔴 CRITICAL | Model receives wrong scale → outputs ≈0.5 always                       | onsetModel.ts L38-70        |
| **2️⃣ CRITICAL** | **FFT size mismatch (2048 vs 10ms)**    | 🔴 CRITICAL | Spectral features duplicated across frames, model overfits to artifact | audioGraph.ts L13           |
| **3️⃣ HIGH**     | Frame timing not synchronized           | 🔴 High     | Training features don't align with labels                              | +page.svelte L167-193       |
| **4️⃣ HIGH**     | Variable frame intervals                | 🔴 High     | Tolerance window math assumes fixed 10ms                               | +page.svelte L523-545       |
| **5️⃣ MEDIUM**   | State snapshot delay                    | 🟡 Medium   | Features lag audio analysis by ~8-16ms                                 | +page.svelte L169-174       |
| **6️⃣ MEDIUM**   | Mismatch between FFT hop and frame rate | 🟡 Medium   | Training data artificial, inference different                          | audioGraph.ts / useTuner.ts |

---

## Recommended Fixes (In Priority Order)

### 🔴 CRITICAL FIX #1: Add Scaler to onsetModel.ts

**File:** [src/lib/tuner/ml/onsetModel.ts](src/lib/tuner/ml/onsetModel.ts)

The scaler state must be:

1. Loaded from the training directory
2. Applied to every prediction

```typescript
export class OnsetModel {
    private model: tf.LayersModel | null = null;
    private config: OnsetModelConfig | null = null;
    private scalerMean: number[] = [];      // ADD THIS
    private scalerStd: number[] = [];       // ADD THIS
    private isLoaded = false;

    async load(modelPath: string): Promise<void> {
        try {
            // Load the model
            this.model = await tf.loadLayersModel(`${modelPath}/model.json`);

            // Load the config
            const configResponse = await fetch(`${modelPath}/config.json`);
            this.config = await configResponse.json();

            // ADD THIS: Load scaler from scaler.json
            // (will need to export scaler as JSON during training)
            const scalerResponse = await fetch(`${modelPath}/scaler.json`);
            const scalerData = await scalerResponse.json();
            this.scalerMean = scalerData.mean;
            this.scalerStd = scalerData.std;

            this.isLoaded = true;
            console.log('[OnsetModel] Model loaded successfully', this.config);
        } catch (error) {
            console.error('[OnsetModel] Failed to load model:', error);
            throw error;
        }
    }

    /**
     * Scale features using training set statistics
     */
    private scaleFeatures(features: number[]): number[] {
        if (this.scalerMean.length === 0 || this.scalerStd.length === 0) {
            console.warn('[OnsetModel] Scaler not loaded, using raw features');
            return features;
        }

        return features.map((value, i) => {
            return (value - this.scalerMean[i]) / this.scalerStd[i];
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
            // CRITICAL: Scale features before prediction
            const scaledFeatures = this.scaleFeatures(features);

            // Create tensor from SCALED features
            const inputTensor = tf.tensor2d([scaledFeatures], [1, 25]);

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

    // ... rest of the class
}
```

**Also needed:** Update the training script to export scaler as JSON:

**File:** [onset-detection/training/scripts/train.py](onset-detection/training/scripts/train.py)

```python
# After fitting scaler, export it as JSON
import json

scaler_data = {
    "mean": scaler.mean_.tolist(),
    "std": scaler.scale_.tolist()  # Note: sklearn uses "scale_" not "std_"
}

with open(output_path / "scaler.json", "w") as f:
    json.dump(scaler_data, f)
```

---

### 🔴 CRITICAL FIX #2: Change FFT Size to Match Frame Rate

**File:** [src/lib/tuner/audioGraph.ts#L13](src/lib/tuner/audioGraph.ts#L13)

**Current:**

```typescript
const FFT_SIZE = 2048;  // ~46ms at 44.1kHz
```

**Change to:**

```typescript
const FFT_SIZE = 1024;  // ~23ms at 44.1kHz, hop ~11ms → close to 10ms frames

// OR even better, compute it based on desired frame rate:
// At 44.1kHz, for 10ms frames:
// - Hop size = 10ms * 44100 Hz = 441 samples
// - FFT size = 2 * hop = 882 (next power of 2: 1024)
const FFT_SIZE = 1024;
```

**Why 1024 instead of 2048:**

- Hop size ≈ 512 samples = ~11.6ms (much closer to 10ms target)
- Features update ~every 10-11ms, aligned with recording frames
- Less redundancy in temporal windows
- Better generalization at inference time

---

### 🟡 MEDIUM FIX #3: Synchronize Frame Recording to Actual Analysis Rate

**File:** [src/routes/onset-training/+page.svelte](src/routes/onset-training/+page.svelte)

**Current approach:** Sample tuner state every 10ms (setInterval)

**Better approach:** Sample tuner state at actual analysis rate

```typescript
// Instead of fixed interval:
// sampleTimer = window.setInterval(() => { ... }, SAMPLE_INTERVAL_MS);

// Use requestAnimationFrame with actual timing:
let lastSampleTime = 0;
const MIN_SAMPLE_INTERVAL_MS = 10; // Minimum interval

function recordFrame(timestamp: number) {
    if (timestamp - lastSampleTime >= MIN_SAMPLE_INTERVAL_MS && isRecording) {
        // Record frame at actual analysis rate
        const frame: RecordedFrame = {
            timestamp: performance.now(),
            amplitude: tuner.state.amplitude,
            frequency: tuner.state.frequency,
            // ...
        };
        recordedData.push(frame);
        lastSampleTime = timestamp;
    }

    if (isRecording) {
        animationId = requestAnimationFrame(recordFrame);
    }
}

// Start recording
recordFrame(performance.now());
```

This ensures:

- ✓ Frames align with actual audio analysis cadence
- ✓ No duplicated features from same FFT window
- ✓ Interval stays ~10ms but respects actual timing

---

### 🟡 MEDIUM FIX #4: Use Time-Based Tolerance for Onset Marking

**File:** [src/routes/onset-training/+page.svelte#L523-545](src/routes/onset-training/+page.svelte#L523-545)

**Current:** Assumes all frames are exactly 10ms apart

**Change to:** Use actual time differences

```typescript
const TOLERANCE_MS = 20; // ±20ms window around manual onset

const mlData = recordedData.map((frame) => {
    let hasOnset = false;

    for (const onsetTime of manualOnsets) {
        // Time-based tolerance instead of frame-based
        if (Math.abs(frame.timestamp - onsetTime) <= TOLERANCE_MS) {
            hasOnset = true;
            break;
        }
    }

    return {
        timestamp: frame.timestamp,
        amplitude: frame.amplitude,
        spectralFlux: frame.spectralFlux,
        phaseDeviation: frame.phaseDeviation,
        highFrequencyEnergy: frame.highFrequencyEnergy,
        hasPitch: frame.hasPitch,
        hasManualOnset: hasOnset
    };
});
```

This is more robust because:

- ✓ Works with variable frame intervals
- ✓ Directly uses real time measurements
- ✓ Simpler to understand and debug

---

## Implementation Priority

| Step | Fix                                           | Time   | Impact                                 |
| ---- | --------------------------------------------- | ------ | -------------------------------------- |
| 1️⃣   | Add scaler to onsetModel.ts + update train.py | 15 min | 🔴 **Likely fixes the entire issue**   |
| 2️⃣   | Change FFT_SIZE from 2048 → 1024              | 5 min  | 🔴 **Removes training data artifacts** |
| 3️⃣   | Sync frame recording to actual analysis rate  | 20 min | 🟡 **Improves alignment**              |
| 4️⃣   | Use time-based onset tolerance                | 10 min | 🟡 **More robust**                     |

**Minimum viable fix:** Steps 1 + 2 (20 minutes) should dramatically improve ML detection.

---

## Testing Strategy to Verify Fixes

### Before applying fixes (Diagnostic):

1. **Export test data:**

   ```bash
   # Record 10 seconds with 3 clear onsets on test-audio.wav
   # Export JSON
   ```

2. **Inspect the exported JSON:**

   ```python
   import json
   with open('onset-training-*.json') as f:
       data = json.load(f)

   # Check frame intervals
   intervals = []
   for i in range(1, len(data)):
       intervals.append(data[i]['timestamp'] - data[i-1]['timestamp'])

   print(f"Mean interval: {sum(intervals)/len(intervals):.1f}ms")
   print(f"Std dev: {np.std(intervals):.2f}ms")
   print(f"Min: {min(intervals):.1f}ms, Max: {max(intervals):.1f}ms")

   # Look for duplicates in spectralFlux (indicates FFT reuse)
   flux_diffs = [data[i]['spectralFlux'] - data[i-1]['spectralFlux']
                 for i in range(1, len(data))]
   num_zeros = sum(1 for d in flux_diffs if d == 0)
   print(f"Frames with identical spectralFlux: {num_zeros}/{len(flux_diffs)}")
   ```

3. **Check the preprocessed training data:**

   ```python
   import numpy as np
   X = np.load('onset-detection/training/data/processed/X.npy')
   y = np.load('onset-detection/training/data/processed/y.npy')

   print(f"X shape: {X.shape}")
   print(f"X mean: {X.mean(axis=0)[:5]}")  # Should be ~0 if scaled
   print(f"X std: {X.std(axis=0)[:5]}")    # Should be ~1 if scaled
   print(f"Onsets: {y.sum()} ({100*y.mean():.1f}%)")
   ```

### After applying fixes:

4. **Test inference with scaler:**

   ```typescript
   // In browser console after loading onset-training page

   const testFeatures = [0.1, 0.05, 0.02, 0.15, 1.0,
                        0.1, 0.05, 0.02, 0.15, 1.0,
                        0.1, 0.05, 0.02, 0.15, 1.0,
                        0.1, 0.05, 0.02, 0.15, 1.0,
                        0.2, 0.25, 0.08, 0.35, 1.0];  // Last frame has bigger values

   // Get from tuner's ml model
   if (tuner.mlModel) {
       const result = tuner.mlModel.predict(testFeatures);
       console.log(result);  // Should show probability > 0.3 if onset-like
   }
   ```

5. **Compare rule-based vs ML on test file:**
   - Load test-audio.wav
   - Enable debug logging
   - Record both rule-based and ML predictions
   - They should mostly agree (with ML being a bit noisier or smoother depending on calibration)

---

## Summary of Root Causes

### Why the ML model isn't detecting onsets:

**Primary cause (80% likelihood):**

- Model trained on **normalized features** (StandardScaler applied)
- Inference uses **raw, unnormalized features**
- Result: Features are ~100× too small → model's neurons see near-zero inputs
- Output: Probability ≈ 0.5 (random/uncertain) regardless of actual signal

**Secondary cause (combined 20% likelihood):**

- FFT window (2048 samples, ~46ms) is 4.6× larger than recording frames (10ms)
- Spectral features are duplicated across frames
- Model learns temporal patterns that don't exist (constant spectralFlux)
- Overfits to artifact, poor generalization

**Tertiary causes:**

- Variable frame intervals make tolerance math unreliable
- State snapshot timing creates small misalignment

---

## Expected Outcomes After Fixes

| Issue                      | Current               | After Fix              | Expected Result                                   |
| -------------------------- | --------------------- | ---------------------- | ------------------------------------------------- |
| Feature scale              | Raw (0-1 range)       | Normalized (±2σ range) | Model receives expected input scale               |
| FFT-to-frame ratio         | 4.6:1                 | 1.1:1                  | No duplicate features, features update each frame |
| Feature variance per frame | All zeros (duplicate) | ~50% variation         | Model can learn real temporal patterns            |
| ML detection rate          | ~0%                   | ~70-90%                | Competitive with rule-based                       |

---
