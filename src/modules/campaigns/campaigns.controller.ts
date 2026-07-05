import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../core/middleware/auth';
import prisma from '../../core/prisma';

export async function listCampaigns(req: AuthenticatedRequest, res: Response) {
  const { workspaceId } = req.query;

  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }

  try {
    const campaigns = await prisma.campaign.findMany({
      where: { workspaceId: workspaceId as string },
      include: {
        steps: true
      }
    });

    const formatted = campaigns.map(c => ({
      id: c.id,
      name: c.name,
      totalOutreach: c.totalOutreach,
      openRate: c.openRate,
      replyRate: c.replyRate,
      bounceRate: c.bounceRate,
      spamRisk: c.spamRisk,
      creditsUsed: c.creditsUsed,
      creditsTotal: c.creditsTotal,
      isActive: c.isActive,
      stepsCount: c.steps.length,
      createdAt: c.createdAt
    }));

    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getCampaignDetails(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        steps: true,
        leads: {
          include: { lead: true }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const formattedSteps = campaign.steps.map(s => ({
      id: s.id,
      stepIndex: s.stepIndex,
      type: s.type, // "EMAIL", "LINKEDIN_CONNECT", etc.
      name: s.name,
      config: s.config ? JSON.parse(s.config) : {}
    })).sort((a, b) => a.stepIndex - b.stepIndex);

    return res.json({
      id: campaign.id,
      name: campaign.name,
      totalOutreach: campaign.totalOutreach,
      openRate: campaign.openRate,
      replyRate: campaign.replyRate,
      bounceRate: campaign.bounceRate,
      spamRisk: campaign.spamRisk,
      creditsUsed: campaign.creditsUsed,
      creditsTotal: campaign.creditsTotal,
      isActive: campaign.isActive,
      steps: formattedSteps,
      leads: campaign.leads.map(cl => ({
        leadId: cl.lead.id,
        companyName: cl.lead.companyName,
        currentStep: cl.currentStep,
        lastStatus: cl.lastStatus,
        updatedAt: cl.updatedAt
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createCampaign(req: AuthenticatedRequest, res: Response) {
  const { workspaceId, name, steps } = req.body;

  if (!workspaceId || !name) {
    return res.status(400).json({ error: 'Workspace ID and campaign name are required' });
  }

  try {
    const campaign = await prisma.campaign.create({
      data: {
        workspaceId,
        name,
        totalOutreach: 0,
        openRate: 0.0,
        replyRate: 0.0,
        bounceRate: 0.0,
        spamRisk: 'VERY LOW',
        creditsUsed: 0,
        creditsTotal: 10000,
        isActive: true
      }
    });

    if (steps && Array.isArray(steps)) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await prisma.campaignStep.create({
          data: {
            campaignId: campaign.id,
            stepIndex: i + 1,
            type: step.type,
            name: step.name || `Step ${i + 1}: ${step.type}`,
            config: JSON.stringify(step.config || {})
          }
        });
      }
    }

    return res.status(201).json(campaign);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function saveCampaignSteps(req: AuthenticatedRequest, res: Response) {
  const { id: campaignId } = req.params;
  const { steps } = req.body; // Array of steps { type, name, config, stepIndex }

  if (!steps || !Array.isArray(steps)) {
    return res.status(400).json({ error: 'Campaign steps array is required' });
  }

  try {
    // Delete existing steps
    await prisma.campaignStep.deleteMany({ where: { campaignId } });

    // Insert new steps
    for (const step of steps) {
      await prisma.campaignStep.create({
        data: {
          campaignId,
          stepIndex: step.stepIndex,
          type: step.type,
          name: step.name,
          config: JSON.stringify(step.config || {})
        }
      });
    }

    return res.json({ message: 'Campaign sequence steps updated successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function toggleCampaignState(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { isActive: !campaign.isActive }
    });

    return res.json({
      message: `Campaign successfully ${updated.isActive ? 'activated' : 'paused'}.`,
      isActive: updated.isActive
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
