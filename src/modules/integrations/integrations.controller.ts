import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../core/middleware/auth';
import prisma from '../../core/prisma';

export async function listIntegrations(req: AuthenticatedRequest, res: Response) {
  const { workspaceId } = req.query;

  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }

  try {
    const integrations = await prisma.integration.findMany({
      where: { workspaceId: workspaceId as string }
    });

    return res.json(integrations);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function triggerCRMSync(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const integration = await prisma.integration.findUnique({ where: { id } });
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Set status to SYNCING
    await prisma.integration.update({
      where: { id },
      data: { syncStatus: 'SYNCING' }
    });

    // Simulate async sync loop updates!
    setTimeout(async () => {
      try {
        await prisma.integration.update({
          where: { id },
          data: {
            syncStatus: 'SUCCESS',
            recordsSynced: integration.recordsSynced + 120,
            lastSyncedAt: new Date()
          }
        });
        console.log(`CRM Sync for integration ${id} completed successfully.`);
      } catch (err) {
        console.error('Async CRM Sync database update failed:', err);
      }
    }, 5000);

    return res.json({
      message: `${integration.provider} synchronization triggered successfully.`,
      integrationId: id,
      status: 'SYNCING',
      approxDurationSeconds: 5
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
