import type { Clef, StaffLayout } from './types';

const trebleBasePositions: Record<string, number> = {
	C: -1,
	D: -0.5,
	E: 0,
	F: 0.5,
	G: 1,
	A: 1.5,
	B: 2
};

const trebleStaffLines = [
	{ position: 4, label: 'F5' },
	{ position: 3, label: 'D5' },
	{ position: 2, label: 'B4' },
	{ position: 1, label: 'G4' },
	{ position: 0, label: 'E4' }
];

// Alto clef (C clef on middle line, C4 is line 3)
const altoBasePositions: Record<string, number> = {
	C: -1.5,
	D: -1,
	E: -0.5,
	F: 0,
	G: 0.5,
	A: 1,
	B: 1.5
};

const altoStaffLines = [
	{ position: 4, label: 'G5' },
	{ position: 3, label: 'E5' },
	{ position: 2, label: 'C5' },
	{ position: 1, label: 'A4' },
	{ position: 0, label: 'F4' }
];

// Bass clef (F clef on 4th line, F3 is line 4; we keep E3 as line 0)
const bassBasePositions: Record<string, number> = {
	C: -2,
	D: -1.5,
	E: -1,
	F: -0.5,
	G: 0,
	A: 0.5,
	B: 1
};

const bassStaffLines = [
	{ position: 4, label: 'A3' },
	{ position: 3, label: 'F3' },
	{ position: 2, label: 'D3' },
	{ position: 1, label: 'B2' },
	{ position: 0, label: 'G2' }
];

export const staffLayouts: Record<Clef, StaffLayout> = {
	treble: {
		clef: 'treble',
		basePositions: trebleBasePositions,
		staffLines: trebleStaffLines
	},
	alto: {
		clef: 'alto',
		basePositions: altoBasePositions,
		staffLines: altoStaffLines
	},
	bass: {
		clef: 'bass',
		basePositions: bassBasePositions,
		staffLines: bassStaffLines
	}
};
