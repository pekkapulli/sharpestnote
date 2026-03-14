import type { KeySignature } from '$lib/config/keys';
import type { MelodyItem, NoteLength } from '$lib/config/melody';
import type { Clef, InstrumentId } from '$lib/config/types';

export type ComposerMelodyMode = 'edit' | 'technique' | 'test';

export const COMPOSER_MELODY_MODE_OPTIONS: Array<{
	value: ComposerMelodyMode;
	label: string;
}> = [
	{ value: 'edit', label: 'Edit' },
	{ value: 'technique', label: 'Technique' }
	// { value: 'test', label: 'Test' }
];

export interface ComposerMelodyPanelProps {
	clef: Clef;
	melody: MelodyItem[][];
	instrumentId: InstrumentId;
	keySignature: KeySignature;
	barLength: number;
	availablePitches: string[];
	isPlayingMelodyPreview: boolean;
	isMelodyPreviewMuted: boolean;
	melodyPlayheadPosition?: number | null;
	lengthOptions: NoteLength[];
	onToggleMelodyPlayback: (startIndex?: number) => void;
	onPlayMelodyFromStart: () => void;
	onToggleMelodyMute: () => void;
	onPreviewItem?: (item: MelodyItem) => void | Promise<void>;
	onEdit?: () => void;
}
