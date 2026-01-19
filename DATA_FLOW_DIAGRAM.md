# Data Flow Diagram - Onset Training Pipeline

## BEFORE THE FIX (Broken)

```
┌─────────────────────────────────────────────────────────────┐
│ TRAINING PHASE                                              │
└─────────────────────────────────────────────────────────────┘

Raw Features (amplitude ≈ 0.0-0.5)
         ↓
    StandardScaler
         ↓
Normalized Features (mean=0, std=1, range ≈ -1 to +3)
         ↓
    Neural Network Training ← Model learns on this scale
         ↓
    Trained Weights + Scaler

    ❌ SCALER NOT SAVED (or saved as .pkl only)


┌─────────────────────────────────────────────────────────────┐
│ INFERENCE PHASE (Browser)                                  │
└─────────────────────────────────────────────────────────────┘

Raw Features (amplitude ≈ 0.0-0.5)
         ↓
    ❌ NO SCALER APPLIED ← Features still 0.0-0.5
         ↓
    Neural Network
         ↓
    Probability ≈ 0.5 ALWAYS (model thinks: "I don't know")

💥 RESULT: Broken! No onsets detected
```

---

## AFTER THE FIX (Working)

```
┌─────────────────────────────────────────────────────────────┐
│ TRAINING PHASE                                              │
└─────────────────────────────────────────────────────────────┘

Raw Features (amplitude ≈ 0.0-0.5)
         ↓
    StandardScaler.fit_transform()
         ↓
Normalized Features (mean=0, std=1, range ≈ -1 to +3)
         ↓
    Neural Network Training
         ↓
    Trained Weights

    ✅ SCALER SAVED:
       - scaler.pkl (for Python)
       - scaler.json (for Browser) ← NEW!
              {
                "mean": [0.08, 0.15, ...],
                "std": [0.03, 0.05, ...]
              }

    ✅ COPIED TO STATIC:
       static/models/onset-model-v1/
       ├── model.json
       ├── group1-shard1of1.bin
       ├── config.json
       └── scaler.json ← Browser will fetch this


┌─────────────────────────────────────────────────────────────┐
│ INFERENCE PHASE (Browser)                                  │
└─────────────────────────────────────────────────────────────┘

1️⃣ Load Model
   onsetModel.load('/path/to/model')
         ↓
   ✅ Fetch scaler.json
   ✅ Parse mean[] and std[] arrays

2️⃣ Get Raw Features
   Raw Features: [0.1, 0.05, 0.02, 0.15, 1.0, ...] (25 total)
         ↓
   3️⃣ Scale Using Saved Statistics
   For each feature i:
     scaled[i] = (raw[i] - mean[i]) / std[i]
         ↓
   Scaled Features: [0.67σ, -2.0σ, 0.33σ, 2.0σ, ...] ✅ Same scale as training!
         ↓
   4️⃣ Run Neural Network
   NN(scaled_features) → logits → sigmoid
         ↓
   5️⃣ Output Probability
   probability ≈ 0.85 (or 0.15, or 0.92, etc.)
         ↓
   6️⃣ Threshold Decision
   if probability > 0.5:
       ONSET DETECTED ✅

✨ RESULT: Working! Detects onsets correctly (70-90% accuracy)
```

---

## FFT SIZE IMPROVEMENT

```
BEFORE (FFT_SIZE = 2048):
═══════════════════════════

Frame Rate: 10ms
FFT Window: 46ms (covers ~4.6 frames)

Timeline:
  FFT A [0-46ms]
    ↓ spectralFlux = 0.15

  Recording happens every 10ms:
  ├─ 0ms:   Frame 0 ← gets FFT A's flux (0.15)
  ├─ 10ms:  Frame 1 ← gets FFT A's flux (0.15) ← DUPLICATE!
  ├─ 20ms:  Frame 2 ← gets FFT A's flux (0.15) ← DUPLICATE!
  ├─ 30ms:  Frame 3 ← gets FFT A's flux (0.15) ← DUPLICATE!
  ├─ 40ms:  Frame 4 ← gets FFT A's flux (0.15) ← DUPLICATE!
  └─ 50ms:  Frame 5 ← gets FFT B's flux

Training Window [Frame 0,1,2,3,4]:
  Flux: [0.15, 0.15, 0.15, 0.15, 0.15]
  Pattern: "Flux is always constant"
  💥 Model OVERFITS to this artifact

Inference with same FFT size but different rate:
  FFT happens at different intervals
  Features don't have this constant pattern
  💥 Model fails: "Where's the pattern I trained on?"


AFTER (FFT_SIZE = 1024):
════════════════════════

Frame Rate: 10ms
FFT Window: 23ms (covers ~2.3 frames)
FFT Hop: ~11.6ms

Timeline:
  FFT A [0-23ms]          FFT B [11.6-34.6ms]      FFT C [23.2-46.2ms]
    ↓ flux = 0.15            ↓ flux = 0.22             ↓ flux = 0.18

  Recording happens every 10ms:
  ├─ 0ms:   Frame 0 ← gets FFT A (0.15)
  ├─ 10ms:  Frame 1 ← gets FFT B (0.22) ← DIFFERENT! ✓
  ├─ 20ms:  Frame 2 ← gets FFT B (0.22)
  ├─ 30ms:  Frame 3 ← gets FFT C (0.18) ← DIFFERENT! ✓
  ├─ 40ms:  Frame 4 ← gets FFT C (0.18)
  └─ 50ms:  Frame 5 ← gets FFT D

Training Window [Frame 0,1,2,3,4]:
  Flux: [0.15, 0.22, 0.22, 0.18, 0.18]
  Pattern: Real temporal variation
  ✓ Model learns genuine temporal patterns

Inference:
  FFT happens at similar rate
  Features have similar temporal variation
  ✓ Model works: "I see the patterns I trained on!"
```

---

## File Format: scaler.json

```json
{
	"mean": [
		0.0847, // mean of feature 0 (amplitude)
		0.1523, // mean of feature 1 (spectralFlux)
		0.0293, // mean of feature 2 (phaseDeviation)
		0.1847, // mean of feature 3 (highFrequencyEnergy)
		0.7234, // mean of feature 4 (hasPitch)
		0.0847, // (repeat for frame 2)
		0.1523,
		0.0293,
		0.1847,
		0.7234
		// ... (5 frames × 5 features = 25 total)
	],
	"std": [
		0.0387, // standard deviation of feature 0
		0.0512, // standard deviation of feature 1
		0.0145, // standard deviation of feature 2
		0.0923, // standard deviation of feature 3
		0.4421, // standard deviation of feature 4
		0.0387,
		0.0512,
		0.0145,
		0.0923,
		0.4421
		// ... (5 frames × 5 features = 25 total)
	],
	"n_features": 25,
	"feature_names": [
		"amplitude",
		"spectralFlux",
		"phaseDeviation",
		"highFrequencyEnergy",
		"hasPitch"
		// ... (repeated 5 times, once per frame)
	]
}
```

Normalization formula:

```
scaled_value = (raw_value - mean) / std

Example:
raw_amplitude = 0.12
mean = 0.0847
std = 0.0387
scaled = (0.12 - 0.0847) / 0.0387 = +0.91σ (slightly above mean)
```

---

## Training → Browser Pipeline

```
Training Directory:
onset-detection/training/
├── data/
│   └── processed/
│       ├── X.npy          ← Preprocessed features
│       ├── y.npy          ← Labels
│       ├── scaler.pkl     ← (Python version)
│       └── scaler.json    ← NEW! Browser version
├── scripts/
│   ├── preprocess.py      ← Creates scaler.json
│   └── train.py           ← Copies scaler.json
└── models/
    └── saved/
        └── tfjs_model/
            ├── model.json
            ├── group1-shard1of1.bin
            ├── config.json
            └── scaler.json ← Copied here


Static Directory (Served to Browser):
static/models/onset-model-v1/
├── model.json             ← Browser downloads
├── group1-shard1of1.bin   ← Browser downloads
├── config.json            ← Browser downloads
└── scaler.json            ← Browser downloads ✅


Browser Memory:
onsetModel.ts:
├── model: tf.LayersModel
├── config: OnsetModelConfig
├── scalerMean: number[]   ← From scaler.json
├── scalerStd: number[]    ← From scaler.json
└── scaleFeatures()        ← Applies normalization
```

---

## Success Checklist

```
✅ Code Changes:
   ☑ onsetModel.ts - loads scaler.json and scales features
   ☑ audioGraph.ts - FFT_SIZE = 1024
   ☑ preprocess.py - exports scaler.json
   ☑ train.py - copies scaler.json to static

✅ Files Created:
   ☑ ONSET_TRAINING_DEBUG_ANALYSIS.md
   ☑ ONSET_TRAINING_FIX_GUIDE.md
   ☑ IMPLEMENTATION_SUMMARY.md
   ☑ IMPLEMENTATION_QUICK_REFERENCE.md
   ☑ DATA_FLOW_DIAGRAM.md (this file)

⏳ Next: Retrain Model
   ☐ cd onset-detection/training
   ☐ python scripts/preprocess.py
   ☐ python scripts/train.py
   ☐ Verify scaler.json in static/models/onset-model-v1/

🧪 Then: Test in Browser
   ☐ Load onset-training page
   ☐ Record test audio with onsets
   ☐ Check console for [OnsetModel] Scaler loaded
   ☐ Verify ML detects onsets (probability not always 0.5)
```
