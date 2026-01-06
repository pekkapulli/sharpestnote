# Synth Voice Module

A simple Web Audio API-based synth voice for playing musical notes from `MelodyItem` objects.

## Overview

The synth voice module (`useSynth.svelte.ts`) provides a simple interface for playing musical notes in the browser. It follows the same pattern as the `useTuner` module and is designed to work seamlessly with `MelodyItem` objects from the melody configuration.

## Features

- **Simple API**: Play notes with a single function call
- **MelodyItem Support**: Direct integration with the existing melody system
- **Configurable Waveforms**: Sine, square, sawtooth, and triangle waves
- **ADSR Envelope**: Attack and release controls for natural-sounding notes
- **Rest Support**: Automatically handles rests (null notes)
- **Safari Compatible**: Follows best practices for Web Audio API in Safari/iOS

## Usage

### Basic Example

```typescript
import { createSynth } from '$lib/tuner/useSynth.svelte';
import type { MelodyItem } from '$lib/config/melody';

// Create synth instance (must be triggered from user interaction)
const synth = createSynth({
  waveform: 'sine',    // 'sine', 'square', 'sawtooth', 'triangle'
  volume: 0.3,         // 0-1
  attack: 0.02,        // seconds
  release: 0.1,        // seconds
  a4: 442              // reference pitch (default 442)
});

// Define a melody
const melody: MelodyItem[] = [
  { note: 'C4', length: 4 },  // Quarter note
  { note: 'E4', length: 2 },  // Eighth note
  { note: null, length: 2 },  // Rest (eighth)
  { note: 'G4', length: 4 }   // Quarter note
];

// Play the melody at 120 BPM
async function playMelody() {
  const tempoBPM = 120;
  for (const item of melody) {
    await synth.playNote(item, tempoBPM);
  }
}

// Call from user interaction (e.g., button click)
button.onclick = playMelody;
```

### API Reference

#### `createSynth(options?: SynthOptions): SynthVoice`

Creates a new synth voice instance.

**Options:**

- `waveform?: OscillatorType` - Waveform type: 'sine', 'square', 'sawtooth', 'triangle' (default: 'sine')
- `a4?: number` - Reference A4 frequency (default: 442 Hz)
- `attack?: number` - Attack time in seconds (default: 0.01)
- `release?: number` - Release time in seconds (default: 0.05)
- `volume?: number` - Master volume 0-1 (default: 0.3)

**Returns:** `SynthVoice` object with the following methods:

#### `playNote(item: MelodyItem, tempoBPM: number): Promise<void>`

Plays a single note from a MelodyItem. The promise resolves when the note completes.

**Parameters:**

- `item` - MelodyItem containing note name and length
- `tempoBPM` - Tempo in beats per minute

**Example:**

```typescript
await synth.playNote({ note: 'C4', length: 4 }, 120);
```

#### `stopAll(): void`

Immediately stops all currently playing notes with a quick fade-out.

**Example:**

```typescript
synth.stopAll();
```

#### `isPlaying(): boolean`

Returns whether the synth is currently playing any notes.

**Example:**

```typescript
if (synth.isPlaying()) {
  console.log('Synth is active');
}
```

#### `setOptions(options: Partial<SynthOptions>): void`

Updates synth configuration.

**Example:**

```typescript
synth.setOptions({
  waveform: 'square',
  volume: 0.5
});
```

## Note Format

Notes should follow the format: `[Letter][Accidental?][Octave]`

**Examples:**

- `C4` - Middle C
- `D#5` - D sharp in the 5th octave
- `Eb3` - E flat in the 3rd octave
- `A4` - Concert A (440 Hz at default A4=442)

**Rests:**

- Use `null` for the note property to create a rest

## Integration Example

See [SightGame.svelte](../lib/components/sight/SightGame.svelte) for a real-world integration example where the synth is used to play back melodies.

## Safari/iOS Compatibility

⚠️ **Important:** The Web Audio API requires user interaction to initialize on Safari and iOS.

- The first call to `playNote()` must be in response to a user gesture (click, touch)
- After the initial user gesture, subsequent calls can be made programmatically
- Do NOT call `playNote()` from async callbacks or after `await` on the first interaction

**Good:**

```typescript
button.onclick = () => synth.playNote(note, 120);
```

**Bad:**

```typescript
button.onclick = async () => {
  await someAsyncOperation();
  synth.playNote(note, 120); // Won't work on first call in Safari!
};
```

## Demo

Visit `/synth-demo` to see a live demonstration with multiple example melodies and configuration options.

## Implementation Details

- Built on Web Audio API
- Uses `OscillatorNode` for tone generation
- ADSR envelope via `GainNode` automation
- Frequency calculation from MIDI note numbers
- Automatic cleanup of audio nodes after playback
