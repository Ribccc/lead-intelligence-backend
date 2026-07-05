import { Router } from 'express';
import { listIntegrations, triggerCRMSync } from './integrations.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.get('/', authenticate, listIntegrations);
router.post('/:id/sync', authenticate, triggerCRMSync);

export default router;
