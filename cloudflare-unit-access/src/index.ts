import { Router } from 'itty-router';
import { handleUnitRoutes } from './routes/units';
import { handleAccessRoutes, handleAccessLookup } from './routes/access';
import { handleCreateCustomShare, handleResolveCustomShare } from './routes/share';

type KvStore = {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

export default {
	fetch(request: Request, env: { SHORT_LINKS?: KvStore }): Promise<Response> {
		const router = Router();

		router.get('/units', (req) => handleUnitRoutes(req));
		router.post('/access', (req) => handleAccessRoutes(req));
		router.post('/access/lookup', (req) => handleAccessLookup(req));
		router.post('/share/custom', (req) => handleCreateCustomShare(req, env));
		router.get('/s/:id', (req) => handleResolveCustomShare(req, env));
		router.head('/s/:id', (req) => handleResolveCustomShare(req, env));
		router.all('*', () => fetch(request));

		return router.handle(request);
	}
};
