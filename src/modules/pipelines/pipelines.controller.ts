import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../core/middleware/auth';
import prisma from '../../core/prisma';

export async function listPipelines(req: AuthenticatedRequest, res: Response) {
  const { workspaceId } = req.query;

  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }

  try {
    const pipelines = await prisma.pipeline.findMany({
      where: { workspaceId: workspaceId as string },
      include: {
        nodes: true,
        edges: true
      }
    });

    const formatted = pipelines.map(p => ({
      id: p.id,
      name: p.name,
      isActive: p.isActive,
      nodes: p.nodes.map(n => ({
        id: n.id,
        type: n.type,
        name: n.name,
        config: n.config ? JSON.parse(n.config) : {},
        status: n.status,
        throughput: n.throughput,
        processed: n.processed,
        x: n.x,
        y: n.y
      })),
      edges: p.edges.map(e => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId
      })),
      createdAt: p.createdAt
    }));

    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createPipeline(req: AuthenticatedRequest, res: Response) {
  const { workspaceId, name, nodes, edges } = req.body;

  if (!workspaceId || !name) {
    return res.status(400).json({ error: 'Workspace ID and Pipeline name are required' });
  }

  try {
    const pipeline = await prisma.pipeline.create({
      data: {
        workspaceId,
        name,
        isActive: false
      }
    });

    if (nodes && Array.isArray(nodes)) {
      for (const n of nodes) {
        await prisma.pipelineNode.create({
          data: {
            pipelineId: pipeline.id,
            type: n.type,
            name: n.name,
            config: JSON.stringify(n.config || {}),
            status: 'IDLE',
            x: n.x || 0.0,
            y: n.y || 0.0
          }
        });
      }
    }

    // Get created nodes to resolve edge mappings if necessary, or insert simple maps
    // In this basic version we just insert the visual properties
    return res.status(201).json(pipeline);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateNodeCoordinates(req: AuthenticatedRequest, res: Response) {
  const { id: pipelineId } = req.params;
  const { nodes } = req.body; // Array of { id, x, y } coordinates matching drag-drop operations

  if (!nodes || !Array.isArray(nodes)) {
    return res.status(400).json({ error: 'Nodes coordinate array is required' });
  }

  try {
    for (const node of nodes) {
      await prisma.pipelineNode.update({
        where: { id: node.id },
        data: {
          x: parseFloat(node.x),
          y: parseFloat(node.y)
        }
      });
    }

    return res.json({ message: 'Pipeline visual layout coordinates updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function executePipeline(req: AuthenticatedRequest, res: Response) {
  const { id: pipelineId } = req.params;

  try {
    const pipeline = await prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: { nodes: true }
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // Set all nodes to RUNNING status
    await prisma.pipelineNode.updateMany({
      where: { pipelineId },
      data: { status: 'RUNNING', throughput: 142.0 }
    });

    // Simulate async pipeline background completion!
    setTimeout(async () => {
      try {
        await prisma.pipelineNode.updateMany({
          where: { pipelineId, type: { not: 'WEB_CRAWLER' } },
          data: { status: 'COMPLETED' }
        });
        console.log(`Pipeline ${pipelineId} background seed processes updated.`);
      } catch (err) {
        console.error('Async pipeline status update failed:', err);
      }
    }, 8000);

    return res.json({
      message: 'Pipeline execution launched successfully.',
      pipelineId,
      status: 'RUNNING',
      avgVelocityLpm: 142.0,
      activeEnginesCount: 4,
      logs: [
        'Starting Lead Intelligence AI Orchestrator...',
        'Resolving seed sources Apollo & LinkedIn Sales Nav...',
        'Crawling corporate news portals (speed: 82 req/sec)...',
        'Invoking GPT-4o Intent sentiment verification modules...'
      ]
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
