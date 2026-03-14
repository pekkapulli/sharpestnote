import { Factory, Dot, Beam, Voice, Curve, CurvePosition, BarNote, type Stave } from 'vexflow';
import type { KeySignature } from '$lib/config/keys';
import type { Clef } from '$lib/config/types';
import type { MelodyItem } from '$lib/config/melody';

const SPLIT_LENGTHS = [16, 12, 8, 6, 4, 3, 2, 1] as const;

export interface VexFlowRenderResult {
	noteXPositions: number[];
	noteYPositions: number[]; // Actual Y positions of rendered notes
	topLineY: number;
	middleLineY: number;
	bottomLineY: number;
	lineSpacing: number;
	stave: Stave;
}

export interface VexFlowLayoutOptions {
	staveInsetX?: number;
	staveY?: number;
	firstBarHeaderReserve?: number;
	subsequentBarReserve?: number;
	minNoteWidth?: number;
}

/**
 * Convert our key signature format to VexFlow format
 */
function keySignatureToVexFlow(keySignature: KeySignature): string {
	// VexFlow expects key names like "C" for major, "Am" for minor
	// Return the key with mode suffix for natural minor
	if (keySignature.mode === 'natural_minor') {
		return `${keySignature.note}m`;
	}
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

function splitLengthToChunks(length: number, maxChunk: number): number[] {
	const chunks: number[] = [];
	let remaining = length;

	while (remaining > 0) {
		const limit = Math.min(remaining, maxChunk);
		const chunk = SPLIT_LENGTHS.find((value) => value <= limit) ?? 1;
		chunks.push(chunk);
		remaining -= chunk;
	}

	return chunks;
}

/**
 * Split one phrase (`MelodyItem[]`) into bar-sized groups for display.
 */
export function splitPhraseToDisplayBars(
	phrase: MelodyItem[],
	barLengthSixteenths: number
): MelodyItem[][] {
	const safeBarLength = Math.max(1, Math.floor(barLengthSixteenths));
	if (!phrase.length) return [];

	const displayBars: MelodyItem[][] = [];
	let currentBar: MelodyItem[] = [];
	let currentFill = 0;

	for (const item of phrase) {
		let remainingLength = item.length;

		while (remainingLength > 0) {
			const remainingInBar = safeBarLength - currentFill;
			const chunkLimit = Math.min(remainingLength, remainingInBar);
			const chunks = splitLengthToChunks(remainingLength, chunkLimit);
			const nextChunk = chunks[0] ?? remainingLength;

			currentBar.push({
				...item,
				length: nextChunk as MelodyItem['length']
			});

			remainingLength -= nextChunk;
			currentFill += nextChunk;

			if (currentFill === safeBarLength) {
				displayBars.push(currentBar);
				currentBar = [];
				currentFill = 0;
			}
		}
	}

	if (currentBar.length > 0) {
		displayBars.push(currentBar);
	}

	return displayBars;
}

/**
 * Normalize phrase-oriented melody arrays to display bars.
 * Each input array is treated as a phrase, not necessarily one bar.
 */
export function splitPhrasesToDisplayBars(
	phrases: MelodyItem[][],
	barLengthSixteenths?: number
): MelodyItem[][] {
	if (!barLengthSixteenths || barLengthSixteenths <= 0) {
		return phrases;
	}

	return phrases.flatMap((phrase) => splitPhraseToDisplayBars(phrase, barLengthSixteenths));
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
	noteColors?: string[],
	layoutOptions: VexFlowLayoutOptions = {}
): VexFlowRenderResult {
	// Clear container
	container.innerHTML = '';

	const displayBars = splitPhrasesToDisplayBars(bars, barLengthSixteenths);

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
	const flatSequence = displayBars.flat();
	const totalSixteenths = flatSequence.reduce((sum, item) => sum + item.length, 0);
	const totalBeats = totalSixteenths / 4; // Convert to quarter notes

	let timeSignature = '4/4';
	if (barLengthSixteenths && barLengthSixteenths > 0) {
		// If bar length is provided, derive signature directly (sixteenths -> quarter beats)
		const beats = barLengthSixteenths / 4;
		timeSignature = `${Math.max(1, Math.round(beats))}/4`;
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

	const staveInsetX = Math.max(0, Math.floor(layoutOptions.staveInsetX ?? 10));
	const staveY = Math.max(0, Math.floor(layoutOptions.staveY ?? 20));
	const staveWidth = Math.max(60, width - staveInsetX * 2);

	// Create and configure stave
	const stave = vf.Stave({ x: staveInsetX, y: staveY, width: staveWidth });
	stave.addClef(clef).addKeySignature(keySignatureToVexFlow(keySignature));
	if (showTimeSignature) {
		stave.addTimeSignature(timeSignature);
	}

	// Build all notes from all bars
	const allNotes = [];
	const allTickables = [];
	let flatNoteIndex = 0;

	for (let barIndex = 0; barIndex < displayBars.length; barIndex++) {
		const bar = displayBars[barIndex];
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

				// Apply color to rest if provided (used for selected rest highlighting).
				if (noteColors && noteColors[flatNoteIndex]) {
					const color = noteColors[flatNoteIndex];
					rest.setStyle({ strokeStyle: color, fillStyle: color });
				}

				allNotes.push(rest);
				allTickables.push(rest);
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
				allTickables.push(staveNote);
			}
			flatNoteIndex++;
		}

		// Native internal measure separator in the tickable stream.
		if (barIndex < displayBars.length - 1) {
			allTickables.push(new BarNote());
		}
	}

	// Create voice and add notes
	const noteXPositions: number[] = [];
	const noteYPositions: number[] = [];

	if (allNotes.length > 0) {
		// Set proportional widths based on note duration within each bar
		const minWidth = Math.max(10, Math.floor(layoutOptions.minNoteWidth ?? 20));
		const assignedNoteWidths: number[] = [];
		let noteIndex = 0;
		let totalComputedWidth = 0;
		const firstBarHeaderReserve = Math.max(
			0,
			Math.floor(layoutOptions.firstBarHeaderReserve ?? 150)
		);
		const subsequentBarReserve = Math.max(0, Math.floor(layoutOptions.subsequentBarReserve ?? 20));

		for (const bar of displayBars) {
			const barSixteenths = bar.reduce((sum, item) => sum + item.length, 0);
			const reserveForClefAndKey = noteIndex === 0 ? firstBarHeaderReserve : subsequentBarReserve; // Only first bar needs full clef/key reserve
			const barAvailableWidth = (width / totalSixteenths) * barSixteenths - reserveForClefAndKey;
			const barPixelsPerSixteenth = barAvailableWidth / barSixteenths;

			for (const item of bar) {
				const noteWidth = Math.max(minWidth, item.length * barPixelsPerSixteenth);
				allNotes[noteIndex].setWidth(noteWidth);
				assignedNoteWidths[noteIndex] = noteWidth;
				totalComputedWidth += noteWidth;
				noteIndex++;
			}
		}

		// Determine available note area (stave.format() is called lazily by getNoteStartX)
		const availableNoteWidth = stave.getNoteEndX() - stave.getNoteStartX();

		// Scale note widths down if they exceed the available stave area (prevents SVG overflow in print)
		if (totalComputedWidth > availableNoteWidth) {
			const scale = (availableNoteWidth - 8) / totalComputedWidth;
			let idx = 0;
			for (const bar of displayBars) {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				for (const _item of bar) {
					const scaledWidth = Math.max(12, (assignedNoteWidths[idx] ?? minWidth) * scale);
					allNotes[idx].setWidth(scaledWidth);
					assignedNoteWidths[idx] = scaledWidth;
					idx++;
				}
			}
			totalComputedWidth = availableNoteWidth - 8;
		}

		const voice = vf.Voice({ time: { numBeats: totalBeats, beatValue: 4 } });
		voice.setMode(Voice.Mode.SOFT);
		voice.addTickables(allTickables);

		// Create beams based on manual beam markers or auto-generate
		const beams: Beam[] = [];
		let hasManualBeams = false;

		// Check if any notes have manual beam markers
		const flatSequenceWithBeams = displayBars.flat();
		for (const item of flatSequenceWithBeams) {
			if (item.beamStart || item.beamEnd) {
				hasManualBeams = true;
				break;
			}
		}

		if (hasManualBeams) {
			// Use manual beaming
			let beamStartIndex = -1;
			noteIndex = 0;

			for (const bar of displayBars) {
				for (const item of bar) {
					if (item.beamStart && item.note !== null) {
						beamStartIndex = noteIndex;
					}
					if (
						item.beamEnd &&
						beamStartIndex >= 0 &&
						beamStartIndex <= noteIndex &&
						item.note !== null
					) {
						// Create a beam from beamStartIndex to noteIndex (inclusive)
						const beamNotes = allNotes
							.slice(beamStartIndex, noteIndex + 1)
							.filter((n) => !n.isRest());
						if (beamNotes.length > 1) {
							beams.push(new Beam(beamNotes));
						}
						beamStartIndex = -1;
					}
					noteIndex++;
				}
			}
		} else {
			// Automatically beam eighth notes and shorter
			beams.push(
				...Beam.generateBeams(allNotes, {
					flatBeams: false,
					stemDirection: undefined // Auto-detect stem direction
				})
			);
		}

		// Format and draw with proportional spacing
		const formatter = vf.Formatter();

		// Pass the computed total width so formatter doesn't expand/compress our proportional widths
		// Cap formatter width to the actual note area so notes never overflow the SVG viewport
		const formatterWidth = Math.min(
			Math.max(totalComputedWidth + 40, availableNoteWidth - 5),
			availableNoteWidth - 5
		);
		formatter.joinVoices([voice]).format([voice], formatterWidth, {
			context: context
		});

		// Draw stave and voice
		stave.setContext(context).draw();
		voice.draw(context, stave);

		// Draw beams
		beams.forEach((beam) => beam.setContext(context).draw());

		// Draw slurs/curves
		const curves: Curve[] = [];
		let slurStartIndex = -1;
		noteIndex = 0;

		for (const bar of displayBars) {
			for (const item of bar) {
				if (item.slurStart) {
					slurStartIndex = noteIndex;
				}
				if (item.slurEnd && slurStartIndex >= 0 && slurStartIndex < noteIndex) {
					// Create a curve from slurStartIndex to noteIndex
					const fromNote = allNotes[slurStartIndex];
					const toNote = allNotes[noteIndex];
					if (fromNote && toNote && !fromNote.isRest() && !toNote.isRest()) {
						const fromStemDown = fromNote.getStemDirection() < 0;
						const toStemDown = toNote.getStemDirection() < 0;
						const curve = new Curve(fromNote, toNote, {
							position: fromStemDown ? CurvePosition.NEAR_HEAD : CurvePosition.NEAR_TOP,
							positionEnd: toStemDown ? CurvePosition.NEAR_HEAD : CurvePosition.NEAR_TOP,
							openingDirection: 'down',
							yShift: 10,
							cps: [
								{ x: 0, y: 18 },
								{ x: 0, y: 18 }
							]
						});
						curves.push(curve);
					}
					slurStartIndex = -1;
				}
				noteIndex++;
			}
		}

		// Draw all curves
		curves.forEach((curve) => curve.setContext(context).draw());

		// Extract note X and Y positions from rendered notes
		for (const note of allNotes) {
			// Get the actual X and Y positions from the note head for precision
			const noteHeads = note.noteHeads;
			if (noteHeads && noteHeads.length > 0) {
				// Get precise center X from note head itself (not the bounding box which includes stem)
				const noteHead = noteHeads[0];
				const headBounds = noteHead.getBoundingBox();
				noteXPositions.push(headBounds.getX() + headBounds.getW() / 2);
				noteYPositions.push(noteHead.getY());
			} else {
				// For rests or if note heads not available, fall back to bounding box
				const bounds = note.getBoundingBox();
				noteXPositions.push(bounds.getX() + bounds.getW() / 2);
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
