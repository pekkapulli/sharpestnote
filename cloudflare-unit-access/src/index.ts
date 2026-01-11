import { Router } from 'itty-router';
import { handleUnitRoutes } from './routes/units';
import { handleAccessRoutes, handleAccessLookup } from './routes/access';

const router = Router();

router.get('/units', handleUnitRoutes);
router.post('/access', handleAccessRoutes);
router.post('/access/lookup', handleAccessLookup);

export default {
	fetch: router.handle
};
