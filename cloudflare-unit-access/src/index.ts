import { Router } from 'itty-router';
import { handleUnitRoutes } from './routes/units';
import { handleAccessRoutes } from './routes/access';

const router = Router();

router.get('/units', handleUnitRoutes);
router.post('/access', handleAccessRoutes);

export default {
	fetch: router.handle
};
