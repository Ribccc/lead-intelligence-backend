import { Router } from 'express';
import { listWorkspaces, createWorkspace, listMembers } from './workspaces.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.get('/', authenticate, listWorkspaces);
router.post('/', authenticate, createWorkspace);
router.get('/:id/members', authenticate, listMembers);

export default router;
