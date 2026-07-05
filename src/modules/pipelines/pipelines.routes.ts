import { Router } from 'express';
import { listPipelines, createPipeline, updateNodeCoordinates, executePipeline } from './pipelines.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.get('/', authenticate, listPipelines);
router.post('/', authenticate, createPipeline);
router.put('/:id/layout', authenticate, updateNodeCoordinates);
router.post('/:id/execute', authenticate, executePipeline);

export default router;
