# Tuner Module Refactoring Summary

## Overview

Successfully refactored the large `useTuner.svelte.ts` file (1382 lines) by extracting specialized concerns into focused, reusable modules. This improves code organization, testability, and maintainability.

## New Modules Created

### 1. **mlState.svelte.ts** - ML Model Management

- **Purpose**: Encapsulates ML model initialization, prediction, and diagnostics
- **Key Exports**:
  - `createMLState()`: Initializes ML state object
  - `ensureMlModelLoad()`: Async model loading with probe checking
  - `updateMLDiagnostics()`: Diagnostic state tracking (failed, warming-up, predicting)
  - `predict()`: Makes predictions with feature history management
  - `reset()`: Clears ML state on stop
- **Benefit**: ML-specific logic completely isolated; easy to disable or replace

### 2. **gainControl.svelte.ts** - Auto-Gain Management

- **Purpose**: Manages input gain levels and auto-gain adaptation
- **Key Exports**:
  - `createGainState()`: Initializes gain configuration
  - `clampGain()`: Validates gain within min/max bounds
  - `updatePeakAmplitude()`: Tracks rolling amplitude window
  - `updateAutoGain()`: Implements adaptive gain adjustment algorithm
  - `setGain()`: Safe gain setter with clamping
  - `reset()`: Resets auto-gain accumulators
- **Benefit**: Audio level management decoupled from onset detection logic

### 3. **latencyTracking.svelte.ts** - Performance Metrics

- **Purpose**: Tracks timing from user interaction to note output
- **Key Exports**:
  - `createLatencyTracking()`: Initializes latency measurement state
  - `updateLatencyMilestones()`: Records amplitude thresholds crossed
  - `recordOnset()`: Marks onset detection time
  - `recordNoteOutput()`: Tracks note debounce completion
  - `resetLatencyTracking()`: Clears metrics for new session
- **Metrics Tracked**:
  - Session start to amplitude threshold
  - Amplitude threshold to pitch lock
  - Pitch lock to first onset detection
  - Onset to note output (includes debounce)
- **Benefit**: Separated diagnostic/monitoring from core detection logic

### 4. **onsetAnalysis.svelte.ts** - Onset Detection State & Algorithms

- **Purpose**: Manages onset detection state and local normalization
- **Key Exports**:
  - `createOnsetAnalysisState()`: Initializes all onset analysis state
  - `computeNormalized()`: MAD-based normalization (median absolute deviation)
  - `updateOnsetHistories()`: Maintains sliding windows for analysis
  - `updateOnsetFunction()`: Combines spectral and phase cues
  - `updateLegatoState()`: Tracks legato dip-rise detection
  - `updatePhaseCue()`: Smooths phase deviation with EMA
  - `resetOnsetAnalysis()`: Clears state on session end
- **Managed State**:
  - Excitation/harmonic/phase history windows
  - Spectral whitening state
  - Legato rebound tracking
  - Pitch confidence and stability
  - FFT previous frame reference
- **Benefit**: Onset detection algorithm state consolidated and reusable

## Refactoring Pattern Applied

The refactoring follows a consistent pattern for each module:

```typescript
// Module exports factory function
export function createModuleState() {
  const state: ModuleState = { /* ... */ };

  // Export helper functions that operate on state
  return {
    state,  // Direct access to state object
    method1(...) { /* ... */ },
    method2(...) { /* ... */ }
  };
}

// In useTuner, instantiate once:
const moduleState = createModuleState();

// Use throughout:
moduleState.method1();
moduleState.state.property = value;
```

## Changes to useTuner.svelte.ts

### Removed (Inlined into Modules):

- ML model state variables and initialization logic
- Auto-gain state and update logic
- Latency tracking variables and milestone recording
- Onset analysis history arrays and helper functions
- Spectral whitening state management

### Simplified:

- Removed ~200 lines of initialization code
- Replaced inline normalization with imported `computeNormalized()`
- Replaced inline legato tracking with `updateLegatoState()`
- Replaced inline phase smoothing with `updatePhaseCue()`

### Imports:

```typescript
import { createMLState } from './mlState.svelte';
import { createGainState } from './gainControl.svelte';
import { createLatencyTracking, updateLatencyMilestones, recordOnset, recordNoteOutput, resetLatencyTracking } from './latencyTracking.svelte';
import {
  createOnsetAnalysisState,
  computeNormalized,
  updateOnsetHistories,
  updateOnsetFunction,
  updateLegatoState,
  updatePhaseCue,
  resetOnsetAnalysis
} from './onsetAnalysis.svelte';
```

## Code Organization Benefits

1. **Single Responsibility**: Each module handles one concern
2. **Testability**: Modules can be tested independently with known state
3. **Reusability**: Modules can be imported in other components
4. **Maintainability**: Easier to understand and modify specific features
5. **Scalability**: New features can add modules without cluttering main file
6. **State Visibility**: Related state grouped logically, not scattered

## Sensible Refactoring Patterns Identified

### Pattern 1: Experimental Features → Separate Modules

ML model comparison is experimental and isolated → separate `mlState.svelte.ts`

### Pattern 2: Cross-Cutting Concerns → Shared Logic

Gain control used throughout tick but independent of detection → separate module

### Pattern 3: Measurement/Diagnostics → Dedicated State

Latency tracking is pure instrumentation → separate module

### Pattern 4: Complex Algorithms with State → Domain Modules

Onset detection with multiple history windows and helper functions → separate module

## Integration Points

- **MLstate**: Called from tick() to make predictions; reset on stop()
- **GainControl**: Called from tick() for peak tracking and auto-gain updates
- **LatencyTracking**: Called at amplitude threshold, pitch lock, onset, and note output
- **OnsetAnalysis**: Used throughout tick() for pitch tracking, normalization, and onset rules

## Future Refactoring Opportunities

1. **Note Debouncing**: Could move note output debounce to separate module
2. **Pitch Tracking**: Could extract pitch confidence and stability checking
3. **Device Management**: Could extract device enumeration and selection logic
4. **Rule Engine**: The 6 onset rules (A, B1-B5, D) could be extracted to rule modules
5. **Audio Graph**: Could further modularize audio context, chain, and analyser setup

## No Breaking Changes

All public API of `createTuner()` remains unchanged. Refactoring is internal reorganization only.
