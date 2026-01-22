# String Racer Game

A Guitar Hero-style game built with Threlte.js (Three.js + Svelte) where players avoid obstacles by playing the correct open strings on their instrument.

## Overview

String Racer is an interactive music game that combines:

- **Real-time audio detection** - Detects which open string is being played
- **3D perspective gameplay** - Guitar Hero-style lanes with perspective depth
- **Progressive difficulty** - Obstacles spawn faster and move quicker over time
- **Combo system** - Build streaks for bonus points

## Architecture

### Core Files

#### `gameState.svelte.ts`

Central state management using Svelte stores:

- `gameState` - Main reactive game state (score, combo, health, obstacles)
- `Obstacle` - Data structure for incoming obstacles
- Open string mappings for different instruments
- Helper functions: `getLaneForNote()`, `getNoteNameForLane()`

**State Properties:**

```typescript
{
  isPlaying: boolean
  score: number
  combo: number
  maxCombo: number
  health: number (0-100)
  speed: number (obstacle velocity)
  obstacles: Obstacle[]
  detectedNote: string | null
  detectedLane: number | null
}
```

#### `GameScene.svelte`

Main 3D canvas component using Threlte:

- Sets up the Three.js Canvas
- Manages camera positioning
- Renders string lanes with perspective depth
- Combines child components: `StringLanes`, `ObstacleRenderer`, `HitZone`

#### `StringLanes.svelte`

Visual representation of playable string lanes:

- Renders `6 lanes` for guitar, `4 lanes` for violin/viola/cello
- Each lane has:
  - Colored floor surface
  - Edge boundaries (glowing lines)
  - Grid pattern for depth perception
- Dark blue color scheme with indigo accents

#### `ObstacleRenderer.svelte`

Manages obstacle physics and rendering:

- Updates obstacle Z-positions each frame (scrolling down lanes)
- Removes obstacles that pass without being hit
- Color changes based on hit state (amber → green/red)
- Includes glow effects for active obstacles

#### `HitZone.svelte`

Visual indicators and collision detection:

- Shows perfect hit zone (tight green box)
- Shows good hit zone (wider blue box)
- Detects when detected note matches obstacle lane
- Triggers score rewards on successful hits

#### `gameLogic.ts`

Game loop and progression logic:

- Frame-based spawning of obstacles
- Difficulty scaling (spawn rate + speed increases)
- Note detection integration with tuner
- Game state transitions (start, running, end)

#### `StringRacerGame.svelte`

Main page component:

- Integrates tuner system with game
- Manages game screens (start, gameplay, game over)
- Handles microphone input and device selection
- Shows HUD (score, combo, health)
- Controls game lifecycle

### Data Flow

```
Tuner (Audio Input)
    ↓
Detects Note Frequency
    ↓
gameLogic.onNoteDetected()
    ↓
getLaneForNote() → gameState.setDetectedNote()
    ↓
HitZone checks for collision
    ↓
Obstacle marked as hit → gameState.addScore()
    ↓
UI updates
```

## Supported Instruments

Each instrument has a specific number of lanes matching its open strings:

| Instrument | Lanes | Open Strings           | Notes           |
| ---------- | ----- | ---------------------- | --------------- |
| Guitar     | 6     | E2, A2, D3, G3, B3, E4 | Standard tuning |
| Violin     | 4     | G3, D4, A4, E5         | Standard tuning |
| Viola      | 4     | C3, G3, D4, A4         | Standard tuning |
| Cello      | 4     | C2, G2, D3, A3         | Standard tuning |

The system uses semitone math (MIDI note numbers) to detect which lane a note belongs to. Notes within 50 cents of an open string are registered.

## Game Mechanics

### Scoring

- **Base hit**: 100 points
- **Combo bonus**: +5 points × current combo
- **Example**: 3rd hit in combo = 100 + (3 × 5) = 115 points

### Health System

- Starts at 100 HP
- -10 HP for each missed obstacle
- Game over at 0 HP

### Difficulty Progression

- **Every 10 seconds**:
  - Spawn rate increases (obstacles spawn more frequently)
  - Speed increases (obstacles move faster)
  - Multiplier increases (up to 1.5x after 5 seconds)

### Hit Detection

- Hit window: 1.5 units in Z distance
- Perfect hit when obstacle is at Z = 0.5
- Good hits: Z range 0.5 ± 0.75

## Threlte Components Used

- **Canvas**: Main 3D viewport
- **PerspectiveCamera**: First-person view
- **useFrame**: Game loop hook for per-frame updates
- **mesh**: Obstacle and lane rendering
- **planeGeometry**: Flat surfaces for lanes and grid
- **boxGeometry**: 3D obstacles
- **meshStandardMaterial**: Lit materials with emissive properties
- **meshBasicMaterial**: Unlit UI elements and wireframes
- **Light**: ambientLight, directionalLight, pointLight

## Future Enhancements

1. **Multiplayer** - Compare scores with other players
2. **Custom Songs** - Load rhythm patterns from music
3. **Different Game Modes**:
   - Survival (endless, increasing difficulty)
   - Time Attack (complete in time limit)
   - Practice (slower, focused on accuracy)
4. **Visual Effects**:
   - Particle effects on hits
   - Screen shake
   - Dynamic lighting
5. **Sound Effects**:
   - Collision sounds
   - Combo milestone sounds
   - Music-synced obstacles
6. **Leaderboards** - Track high scores

## Integration with Tuner

The game leverages the existing tuner system (`useTuner.svelte.ts`) to:

- Capture real-time audio from microphone
- Detect note frequency via autocorrelation
- Get note name and MIDI number
- Track microphone devices

The tuner provides:

```typescript
tuner.start()           // Begin audio capture
tuner.stop()            // Stop audio capture
tuner.state             // Current detected note info
tuner.onNoteDetected()  // Callback for note events
tuner.refreshDevices()  // Update available microphones
```

## Styling

Uses Tailwind CSS for UI with a dark slate theme:

- Background: `bg-slate-900` / `bg-slate-800`
- Accent colors: Indigo (`#4f46e5`), Blue (`#3b82f6`)
- Success: Green (`#10b981`)
- Error: Red (`#ef4444`)
- Warning: Amber (`#f59e0b`)
