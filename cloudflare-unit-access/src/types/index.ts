export interface Unit {
	code: string;
}

export interface AccessStatus {
	unitCode: string;
	hasAccess: boolean;
	message: string;
}
