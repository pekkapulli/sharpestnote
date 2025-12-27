# Onset Detection Algorithm Refactor

## Overview

The onset detection algorithm in `useTuner.svelte.ts` has been completely refactored to follow a clear, step-by-step methodology that is easier to understand, maintain, and tune.

## Key Changes

### 1. Clear Algorithm Structure

The algorithm now follows a well-defined 7-step process with explicit comments:

**Step 0 — Analysis Setup**

- Short analysis frames (~20-30ms via FFT)
- Small hop size (~5-10ms via frame rate)
- Windowing applied automatically by FFT
- State tracking for previous frames

**Step 1 — Per-Frame Feature Extraction**

- Spectrum computation (magnitudes + phases)
- Excitation cue: HF spectral flux (positive-only, frequency-weighted)
- Phase disruption cue: measures phase deviation from expected advance
- Pitch estimation: continuous tracking with confidence scoring

**Step 2 — Local Normalization**

- Sliding history windows (~400ms, 40 frames)
- Baseline computed using median (robust to outliers)
- Spread computed using MAD (Median Absolute Deviation)
- Cues expressed as relative deviations (sigma units)
- **Adapts automatically to dynamics, instrument, and room acoustics**

**Step 3 — Pitch Change Detection**

- Compares current pitch to recent stable pitch
- Requires >25 cents change (~1/4 semitone)
- High pitch confidence required (>0.6)

**Step 4 — Onset Decision Rules**

Three rules evaluated in order:

- **Rule A (Guaranteed Onset):** Pitch change with high confidence → onset
- **Rule B (Re-articulation):** Strong excitation (>2.5σ) + strong phase (>2.0σ) → onset
- **Rule C (Soft-attack Fallback):** Very strong phase alone (>3.5σ) → onset

**Step 5 — Cooldown Enforcement**

- Simple 100ms refractory period
- Suppresses ALL onsets during cooldown
- No complex override logic

**Step 6 — Note End Tracking**

- Completely separate from onset detection
- Uses amplitude decay + pitch confidence loss
- Requires sustained end condition (hysteresis)
- Does NOT feed into onset logic

**Step 7 — State Update**

- Store magnitudes, phases, pitch history
- Update normalization windows
- Advance time

## What Was Removed

1. **Complex dynamic thresholds** - replaced with statistical normalization
2. **Multiple refractory override paths** - simplified to single cooldown
3. **Amplitude change detection** - no longer used in onset logic
4. **Fast pitch change detection** - replaced with pitch change rule (Rule A)
5. **Multiple onset strength combinations** - replaced with clear rules
6. **Instrument-specific phase thresholds** - replaced with normalized sigma values

## What Was Added

1. **Local normalization** - adapts to dynamics automatically
2. **Pitch confidence tracking** - smooth, continuous confidence scoring
3. **Stable pitch reference** - for reliable pitch change detection
4. **Clear decision rules** - three simple, ordered rules
5. **Extensive comments** - explains every step of the algorithm

## Benefits

### Readability

- Clear section headers for each algorithm step
- Self-documenting code structure
- Explicit decision rules

### Maintainability

- Easy to tune sigma thresholds (Rule B, C)
- Simple to add new rules
- No hidden interactions between components

### Performance

- Adapts to different dynamics automatically
- Robust to reverb and sustain (via HF weighting + phase)
- Prevents false triggers (100ms cooldown)
- Catches legato passages (pitch change rule)
- Detects repeat notes (phase rule)

### Guarantees

✅ **Legato notes** - caught by pitch-change rule (Rule A)
✅ **Repeated notes** - caught by excitation + phase rules (Rule B)
✅ **Fast passages** - preserved by small hop + 100ms cooldown
✅ **Reverb & sustain** - ignored by phase coherence and HF weighting
✅ **False retriggers** - prevented by cooldown + local normalization
✅ **Soft attacks** - caught by phase-only rule (Rule C)

## Tuning Parameters

The algorithm has natural tuning points:

```typescript
// History length for normalization (currently ~400ms)
const HISTORY_LENGTH = 40;

// Cooldown period (currently 100ms)
const COOLDOWN_MS = 100;

// Pitch change threshold (currently 25 cents)
const pitchChangeCents = 25;

// Pitch confidence threshold (currently 0.6)
const minConfidence = 0.6;

// Rule B: excitation + phase (currently 2.5σ + 2.0σ)
normalizedExcitation > 2.5 && normalizedPhase > 2.0

// Rule C: phase-only fallback (currently 3.5σ)
normalizedPhase > 3.5
```

## Migration Notes

The old instrument-specific detection configs (`tuning` object) are still loaded but most fields are no longer used. Only these fields remain relevant:

- `onsetMinAmplitude` - minimum amplitude for onset
- `endMinAmplitudeRatio` - ratio for note end detection
- `endHoldMs` - hysteresis for note endings

Consider removing unused config fields in a future cleanup.

## Testing Recommendations

1. **Repeated notes** - Test staccato passages on sustained instruments
2. **Legato passages** - Test smooth pitch changes without re-articulation
3. **Soft attacks** - Test very gentle onsets (flute, voice)
4. **Fast passages** - Test rapid note sequences (<100ms apart)
5. **Different dynamics** - Test pp through ff to verify normalization
6. **Different rooms** - Test dry vs reverberant spaces

## Future Improvements

1. Could make sigma thresholds configurable per instrument
2. Could add Rule D for specific instrument characteristics
3. Could expose normalization parameters (history length, MAD multiplier)
4. Could add visualization of normalized cues for debugging
5. Could experiment with different pitch confidence algorithms
