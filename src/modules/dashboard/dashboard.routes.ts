import { Router } from 'express';
import { getKPIs, getConversionChart, getActivityFeed } from './dashboard.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.get('/kpis', authenticate, getKPIs);
router.get('/conversion-chart', authenticate, getConversionChart);
router.get('/feed', authenticate, getActivityFeed);

export default router;
