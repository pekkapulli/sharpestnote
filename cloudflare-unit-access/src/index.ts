import { Router } from 'itty-router';
import { handleUnitRoutes } from './routes/units';
import { handleAccessRoutes, handleAccessLookup } from './routes/access';

export default {
	fetch(request: Request): Promise<Response> {
		const router = Router();

		router.get('/units', (req) => handleUnitRoutes(req));
		router.post('/access', (req) => handleAccessRoutes(req));
		router.post('/access/lookup', (req) => handleAccessLookup(req));
		router.all('*', () => fetch(request));

		return router.handle(request);
	}
};
