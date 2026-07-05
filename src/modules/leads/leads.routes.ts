import { Router } from 'express';
import {
  listLeads,
  getLeadDetails,
  createLead,
  updateLead,
  deleteLead,
  generateTailoredOutreach
} from './leads.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.get('/', authenticate, listLeads);
router.get('/:id', authenticate, getLeadDetails);
router.post('/', authenticate, createLead);
router.put('/:id', authenticate, updateLead);
router.delete('/:id', authenticate, deleteLead);
router.post('/:id/outreach', authenticate, generateTailoredOutreach);

export default router;
