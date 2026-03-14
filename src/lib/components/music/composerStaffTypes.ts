export type ComposerStaffContextMenuAnchor = {
	index: number;
	x: number;
	y: number;
};

export type ComposerStaffInteraction =
	| {
			type: 'note-select';
			index: number;
	  }
	| ({
			type: 'note-activate';
			trigger: 'tap' | 'long-press' | 'context-menu';
			note?: string;
	  } & ComposerStaffContextMenuAnchor)
	| {
			type: 'note-drag';
			index: number;
			note: string;
	  }
	| {
			type: 'add-note';
			note: string;
	  }
	| {
			type: 'interaction-end';
	  };
