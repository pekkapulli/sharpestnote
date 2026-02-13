export interface Unit {
	code: string;
	keyCode: string;
}

export interface AccessStatus {
	unitCode: string;
	hasAccess: boolean;
	message: string;
}
