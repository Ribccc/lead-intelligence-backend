import { Response } from 'express';
import { AuthenticatedRequest } from '../../core/middleware/auth';
import prisma from '../../core/prisma';

export async function listWorkspaces(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.userId;

  try {
    const memberRecords = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true }
    });

    const workspaces = memberRecords.map(m => m.workspace);
    return res.json(workspaces);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createWorkspace(req: AuthenticatedRequest, res: Response) {
  const { name } = req.body;
  const userId = req.user?.userId;

  if (!name) {
    return res.status(400).json({ error: 'Workspace name is required' });
  }

  try {
    const existing = await prisma.workspace.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Workspace name already exists' });
    }

    const workspace = await prisma.workspace.create({
      data: { name }
    });

    // Add creator as workspace owner
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: userId!,
        role: 'SUPER_ADMIN'
      }
    });

    return res.status(201).json(workspace);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function listMembers(req: AuthenticatedRequest, res: Response) {
  const { id: workspaceId } = req.params;

  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      }
    });

    return res.json(members);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
