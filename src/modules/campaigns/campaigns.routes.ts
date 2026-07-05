import { Router } from 'express';
import { listCampaigns, getCampaignDetails, createCampaign, saveCampaignSteps, toggleCampaignState } from './campaigns.controller';
import { authenticate } from '../../core/middleware/auth';

const router = Router();

router.get('/', authenticate, listCampaigns);
router.get('/:id', authenticate, getCampaignDetails);
router.post('/', authenticate, createCampaign);
router.put('/:id/steps', authenticate, saveCampaignSteps);
router.post('/:id/toggle', authenticate, toggleCampaignState);

export default router;
