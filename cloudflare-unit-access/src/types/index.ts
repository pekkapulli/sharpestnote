/** Branded type to ensure KeyCode uniqueness at compile time */
export type KeyCode = string & { readonly __brand: 'KeyCode' };

export function createKeyCode(value: string): KeyCode {
	return value as KeyCode;
}

export interface Unit {
	code: string;
	keyCode: KeyCode;
}

export interface AccessStatus {
	unitCode: string;
	hasAccess: boolean;
	message: string;
}
