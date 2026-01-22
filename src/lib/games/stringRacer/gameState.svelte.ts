import { writable } from 'svelte/store';
import { instrumentConfigs } from '$lib/config/instruments';

export interface Obstacle {
	id: number;
	lane: number; // 0-5 for open strings
	position: number; // z position (distance from player)
	width: number; // how close to perfect timing
	hit: boolean;
	missed: boolean;
}

export interface GameStateType {
	isPlaying: boolean;
	score: number;
	combo: number;
	maxCombo: number;
	health: number;
	speed: number; // speed of obstacles
	obstacles: Obstacle[];
	detectedNote: string | null;
	detectedLane: number | null;
	nextObstacleId: number;
}

function createGameState() {
	const state = writable<GameStateType>({
		isPlaying: false,
		score: 0,
		combo: 0,
		maxCombo: 0,
		health: 100,
		speed: 0.15,
		obstacles: [],
		detectedNote: null,
		detectedLane: null,
		nextObstacleId: 0
	});

	return {
		subscribe: state.subscribe,
		reset: () => {
			state.set({
				isPlaying: false,
				score: 0,
				combo: 0,
				maxCombo: 0,
				health: 100,
				speed: 0.15,
				obstacles: [],
				detectedNote: null,
				detectedLane: null,
				nextObstacleId: 0
			});
		},
		start: () => {
			state.update((s) => ({ ...s, isPlaying: true }));
		},
		stop: () => {
			state.update((s) => ({ ...s, isPlaying: false }));
		},
		addObstacle: (lane: number, position: number = 50) => {
			state.update((s) => {
				const newObstacle: Obstacle = {
					id: s.nextObstacleId,
					lane,
					position,
					width: 2, // tolerance window
					hit: false,
					missed: false
				};
				return {
					...s,
					obstacles: [...s.obstacles, newObstacle],
					nextObstacleId: s.nextObstacleId + 1
				};
			});
		},
		removeObstacle: (id: number) => {
			state.update((s) => ({
				...s,
				obstacles: s.obstacles.filter((o) => o.id !== id)
			}));
		},
		updateObstacle: (id: number, updates: Partial<Obstacle>) => {
			state.update((s) => ({
				...s,
				obstacles: s.obstacles.map((o) => (o.id === id ? { ...o, ...updates } : o))
			}));
		},
		setDetectedNote: (note: string | null, lane: number | null) => {
			state.update((s) => ({ ...s, detectedNote: note, detectedLane: lane }));
		},
		addScore: (points: number) => {
			state.update((s) => {
				const newCombo = s.combo + 1;
				const newMaxCombo = Math.max(s.maxCombo, newCombo);
				return {
					...s,
					score: s.score + points + newCombo * 5, // combo bonus
					combo: newCombo,
					maxCombo: newMaxCombo
				};
			});
		},
		missNote: () => {
			state.update((s) => ({
				...s,
				combo: 0,
				health: Math.max(0, s.health - 10)
			}));
		},
		increaseSpeed: () => {
			state.update((s) => ({
				...s,
				speed: Math.min(1.0, s.speed + 0.05)
			}));
		}
	};
}

export const gameState = createGameState();

// Get open strings from instrument config
export function getOpenStringsForInstrument(instrumentId: string): number[] {
	const config = instrumentConfigs.find((i) => i.id === instrumentId);
	return config?.openStrings || [];
}

// Lane to open string mapping
export function getLaneForNote(note: number, instrument: string): number | null {
	const config = getOpenStringsForInstrument(instrument);
	if (!config || config.length === 0) return null;

	// Find the closest open string
	let closestLane = 0;
	let closestDistance = Math.abs(note - config[0]);

	for (let i = 1; i < config.length; i++) {
		const distance = Math.abs(note - config[i]);
		if (distance < closestDistance) {
			closestDistance = distance;
			closestLane = i;
		}
	}

	// Only register if within 50 cents
	if (closestDistance <= 0.5) {
		return closestLane;
	}

	return null;
}

export function getNoteNameForLane(lane: number, instrument: string): string {
	const config = getOpenStringsForInstrument(instrument);
	if (!config || !config[lane]) return '';

	const noteNumber = config[lane];
	const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
	const octave = Math.floor(noteNumber / 12);
	const noteName = notes[noteNumber % 12];

	return `${noteName}${octave}`;
}
