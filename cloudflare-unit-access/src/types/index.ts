export interface Unit {
	code: string;
	backendCode: string;
	keyCode: string;
}

export interface AccessStatus {
	unitCode: string;
	hasAccess: boolean;
	message: string;
}
