import { Factory, Dot, Beam, type Stave } from 'vexflow';
import type { KeySignature } from '$lib/config/keys';
import type { Clef } from '$lib/config/types';
import type { MelodyItem } from '$lib/config/melody';

export interface VexFlowRenderResult {
	noteXPositions: number[];
	noteYPositions: number[]; // Actual Y positions of rendered notes
	topLineY: number;
	middleLineY: number;
	bottomLineY: number;
	lineSpacing: number;
	stave: Stave;
}

/**
 * Convert our key signature format to VexFlow format
 */
function keySignatureToVexFlow(keySignature: KeySignature): string {
	// VexFlow expects key names like "C", "D", "Bb", "F#"
	// We already have this in keySignature.note
	return keySignature.note;
}

/**
 * Convert note length in sixteenths to VexFlow duration
 */
function lengthToDurationWithDots(length: number): { duration: string; dots: number } {
	// Map sixteenth counts to VexFlow durations with dots for better proportional spacing
	switch (length) {
		case 16:
			return { duration: 'w', dots: 0 }; // whole
		case 12:
			return { duration: 'h', dots: 1 }; // dotted half
		case 8:
			return { duration: 'h', dots: 0 }; // half
		case 6:
			return { duration: 'q', dots: 1 }; // dotted quarter
		case 4:
			return { duration: 'q', dots: 0 }; // quarter
		case 3:
			return { duration: '8', dots: 1 }; // dotted eighth
		case 2:
			return { duration: '8', dots: 0 }; // eighth
		case 1:
			return { duration: '16', dots: 0 }; // sixteenth
		default:
			// Fallback: scale to nearest quarter-note multiple
			if (length > 16) return { duration: 'w', dots: 0 };
			if (length > 8) return { duration: 'h', dots: 1 }; // 12
			if (length > 6) return { duration: 'h', dots: 0 }; // 8
			if (length > 4) return { duration: 'q', dots: 1 }; // 6
			if (length > 3) return { duration: 'q', dots: 0 }; // 4
			if (length > 2) return { duration: '8', dots: 1 }; // 3
			if (length > 1) return { duration: '8', dots: 0 }; // 2
			return { duration: '16', dots: 0 }; // 1 or smaller
	}
}

/**
 * Parse VexFlow note format and determine if accidental modifier is needed
 */
function noteToVexFlow(
	note: string,
	keySignature: KeySignature
): { keys: string[]; accidentals?: string[] } {
	// Parse note in VexFlow format: "c/4", "d#/5", "bb/3"
	const match = note.match(/^([a-g])([#b]?)\/(\d+)$/);
	if (!match) {
		throw new Error(`Invalid note format: ${note}`);
	}

	const [, noteLetter, accidental] = match;

	// Check what accidental (if any) the key signature implies for this note
	const upperLetter = noteLetter.toUpperCase();
	const hasSharpInKey = keySignature.sharps.some((s) => s.startsWith(upperLetter));
	const hasFlatInKey = keySignature.flats.some((f) => f.startsWith(upperLetter));

	const keyExpects = hasSharpInKey ? '#' : hasFlatInKey ? 'b' : '';

	// Only add accidental modifier if the note differs from key signature
	const accidentals: string[] = [];
	if (accidental !== keyExpects) {
		if (accidental === '#') {
			accidentals.push('#');
		} else if (accidental === 'b') {
			accidentals.push('b');
		} else if (accidental === '' && keyExpects) {
			// Note is natural but key expects sharp/flat - show natural sign
			accidentals.push('n');
		}
	}

	return {
		keys: [note], // Full note with accidental for pitch
		accidentals: accidentals.length > 0 ? accidentals : undefined
	};
}

/**
 * Render melody bars using VexFlow with proportional note widths within each bar
 */
export function renderVexFlowStaff(
	container: HTMLDivElement,
	bars: MelodyItem[][],
	clef: Clef,
	keySignature: KeySignature,
	width: number,
	barLengthSixteenths?: number,
	showTimeSignature: boolean = true,
	noteColors?: string[]
): VexFlowRenderResult {
	// Clear container
	container.innerHTML = '';

	const height = 150;

	// Create a temporary div for VexFlow to initialize into
	const tempDiv = document.createElement('div');
	tempDiv.id = `vexflow-temp-${Math.random().toString(36).substr(2, 9)}`;
	container.appendChild(tempDiv);

	// Create factory with the temp div
	const vf = new Factory({
		renderer: {
			elementId: tempDiv.id,
			backend: 2, // SVG
			width: width,
			height: height
		}
	});

	const context = vf.getContext();

	// Flatten bars for computing total sixteenths
	const flatSequence = bars.flat();
	const totalSixteenths = flatSequence.reduce((sum, item) => sum + item.length, 0);
	const totalBeats = totalSixteenths / 4; // Convert to quarter notes

	let timeSignature = '4/4';
	if (barLengthSixteenths && barLengthSixteenths > 0) {
		// If bar length is provided, derive signature directly
		const beats = barLengthSixteenths / 4;
		// Handle common 6/8 case (12 sixteenths)
		if (barLengthSixteenths === 12) {
			timeSignature = '6/8';
		} else {
			timeSignature = `${Math.max(1, Math.round(beats))}/4`;
		}
	} else {
		// Guess time signature - prefer common time signatures
		if (totalBeats % 3 === 0) {
			timeSignature = '3/4';
		} else if (totalBeats % 6 === 0 && totalBeats / 6 <= 2) {
			timeSignature = '6/8';
		} else if (totalBeats % 2 === 0) {
			timeSignature = '4/4';
		} else {
			// For odd lengths, try to fit to nearest common signature
			timeSignature = `${Math.ceil(totalBeats)}/4`;
		}
	}

	// Create and configure stave
	const stave = vf.Stave({ x: 10, y: 20, width: width - 20 });
	stave.addClef(clef).addKeySignature(keySignatureToVexFlow(keySignature));
	if (showTimeSignature) {
		stave.addTimeSignature(timeSignature);
	}

	// Build all notes from all bars
	const allNotes = [];
	let flatNoteIndex = 0;

	for (const bar of bars) {
		for (const item of bar) {
			const { duration, dots } = lengthToDurationWithDots(item.length);
			if (item.note === null) {
				// Rest
				const rest = vf.StaveNote({
					keys: ['b/4'],
					duration: `${duration}r`,
					clef: clef
				});
				rest.setStave(stave);
				// Pin rests to the middle line; let formatter know we don't want vertical tweaks
				rest.setKeyLine(0, 3);
				for (let d = 0; d < dots; d++) {
					Dot.buildAndAttach([rest], { all: true });
				}
				allNotes.push(rest);
			} else {
				// Note
				const { keys, accidentals } = noteToVexFlow(item.note, keySignature);
				const staveNote = vf.StaveNote({
					keys,
					duration,
					clef: clef
				});
				staveNote.setStave(stave);

				// Add accidentals if needed
				if (accidentals && accidentals.length > 0) {
					staveNote.addModifier(vf.Accidental({ type: accidentals[0] }), 0);
				}
				for (let d = 0; d < dots; d++) {
					Dot.buildAndAttach([staveNote], { all: true });
				}

				// Apply color to note if provided
				if (noteColors && noteColors[flatNoteIndex]) {
					const color = noteColors[flatNoteIndex];
					staveNote.setStyle({ strokeStyle: color, fillStyle: color });
				}

				allNotes.push(staveNote);
			}
			flatNoteIndex++;
		}
	}

	// Create voice and add notes
	const noteXPositions: number[] = [];
	const noteYPositions: number[] = [];

	if (allNotes.length > 0) {
		// Set proportional widths based on note duration within each bar
		const minWidth = 20; // Minimum width for any note
		let noteIndex = 0;
		let totalComputedWidth = 0;

		for (const bar of bars) {
			const barSixteenths = bar.reduce((sum, item) => sum + item.length, 0);
			const reserveForClefAndKey = noteIndex === 0 ? 150 : 20; // Only first bar needs space for clef/key
			const barAvailableWidth = (width / totalSixteenths) * barSixteenths - reserveForClefAndKey;
			const barPixelsPerSixteenth = barAvailableWidth / barSixteenths;

			for (const item of bar) {
				const noteWidth = Math.max(minWidth, item.length * barPixelsPerSixteenth);
				allNotes[noteIndex].setWidth(noteWidth);
				totalComputedWidth += noteWidth;
				noteIndex++;
			}
		}

		const voice = vf.Voice({ time: { numBeats: totalBeats, beatValue: 4 } });
		voice.addTickables(allNotes);

		// Automatically beam eighth notes and shorter
		const beams = Beam.generateBeams(allNotes, {
			flatBeams: false,
			stemDirection: undefined // Auto-detect stem direction
		});

		// Format and draw with proportional spacing
		const formatter = vf.Formatter();

		// Pass the computed total width so formatter doesn't expand/compress our proportional widths
		formatter.joinVoices([voice]).format([voice], Math.max(totalComputedWidth + 100, width - 100), {
			context: context
		});

		// Draw stave and voice
		stave.setContext(context).draw();
		voice.draw(context, stave);

		// Draw beams
		beams.forEach((beam) => beam.setContext(context).draw());

		// Extract note X and Y positions from rendered notes
		for (const note of allNotes) {
			const bounds = note.getBoundingBox();
			noteXPositions.push(bounds.getX() + bounds.getW() / 2);

			// Get the actual Y position from the note head
			const noteHeads = note.noteHeads;
			if (noteHeads && noteHeads.length > 0) {
				noteYPositions.push(noteHeads[0].getY());
			} else {
				// For rests or if note heads not available, use the note's Y position
				noteYPositions.push(bounds.getY() + bounds.getH() / 2);
			}
		}
	} else {
		// Just draw empty stave
		stave.setContext(context).draw();
	}

	return {
		noteXPositions,
		noteYPositions,
		topLineY: stave.getYForLine(0), // Top line of staff
		middleLineY: stave.getYForLine(2), // Middle line of staff (B4 in treble, D3 in bass)
		bottomLineY: stave.getYForLine(4), // Bottom line of staff
		lineSpacing: stave.getSpacingBetweenLines(),
		stave: stave // Return stave for note positioning
	};
}

/**
 * Get Y position for a note using VexFlow's note positioning system.
 * Creates and formats a temporary note to extract its exact Y position,
 * matching the same process used for rendering notes in the sequence.
 */
export function getNoteYPosition(note: string, clef: Clef, stave: Stave): number {
	try {
		// Create a temporary div for rendering (won't be added to DOM)
		const tempDiv = document.createElement('div');
		tempDiv.style.position = 'absolute';
		tempDiv.style.visibility = 'hidden';
		tempDiv.id = `vexflow-ghost-${Math.random().toString(36).substr(2, 9)}`;
		document.body.appendChild(tempDiv);

		try {
			// Create factory with the temp div
			const vf = new Factory({
				renderer: {
					elementId: tempDiv.id,
					backend: 2,
					width: 200,
					height: 150
				}
			});

			const context = vf.getContext();

			// Create the note
			const staveNote = vf.StaveNote({
				keys: [note],
				duration: 'q',
				clef: clef
			});
			staveNote.setStave(stave);

			// Create voice and add the note
			const voice = vf.Voice({ time: { numBeats: 1, beatValue: 4 } });
			voice.addTickables([staveNote]);

			// Format the voice (this applies VexFlow's positioning logic)
			const formatter = vf.Formatter();
			formatter.joinVoices([voice]).format([voice], 100);

			// Draw the voice to finalize positioning (but it's hidden)
			voice.draw(context, stave);

			// Extract Y position from note head (same as rendered notes)
			const noteHeads = staveNote.noteHeads;
			if (noteHeads && noteHeads.length > 0) {
				return noteHeads[0].getY();
			}

			return stave.getYForLine(2);
		} finally {
			// Clean up temp div
			document.body.removeChild(tempDiv);
		}
	} catch (error) {
		console.error('Error getting note Y position:', error, 'for note:', note);
		return stave.getYForLine(2);
	}
}
