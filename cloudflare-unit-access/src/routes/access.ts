import type { IRequest } from 'itty-router';
import type { AccessStatus } from '../types';
import { unitDatabase } from './units';

export const handleAccessRoutes = async (request: IRequest): Promise<Response> => {
	const { unitCode, keyCode } = (await request.json()) as { unitCode?: string; keyCode?: string };

	if (!unitCode || !keyCode) {
		return new Response(
			JSON.stringify({
				error: 'Missing unitCode or keyCode',
				message: 'Both unitCode and keyCode are required'
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const unit = unitDatabase[unitCode];

	if (!unit) {
		return new Response(
			JSON.stringify({ error: 'Unit not found', message: 'The requested unit does not exist' }),
			{
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const hasAccess = keyCode.trim().toUpperCase() === unit.keyCode.trim().toUpperCase();

	const response: AccessStatus = {
		unitCode,
		hasAccess,
		message: hasAccess ? 'Access granted' : 'Invalid key code'
	};

	return new Response(JSON.stringify(response), {
		headers: { 'Content-Type': 'application/json' }
	});
};
