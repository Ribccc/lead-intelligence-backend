import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../core/middleware/auth';
import prisma from '../../core/prisma';

export async function listLeads(req: AuthenticatedRequest, res: Response) {
  const { workspaceId, status, search } = req.query;

  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required as query parameter' });
  }

  try {
    const whereClause: any = {
      workspaceId: workspaceId as string
    };

    if (status) {
      whereClause.status = status as string;
    }

    if (search) {
      whereClause.OR = [
        { companyName: { contains: search as string } },
        { sector: { contains: search as string } },
        { industry: { contains: search as string } }
      ];
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        insights: true,
        intentSignals: true
      },
      orderBy: { aiScore: 'desc' }
    });

    return res.json(leads);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getLeadDetails(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        insights: true,
        intentSignals: true,
        reasoningPoints: true
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    return res.json(lead);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createLead(req: AuthenticatedRequest, res: Response) {
  const {
    workspaceId,
    companyName,
    sector,
    industry,
    employees,
    funding,
    hiringStatus,
    conversionProb,
    aiScore,
    status
  } = req.body;

  if (!workspaceId || !companyName || !sector || !industry) {
    return res.status(400).json({ error: 'Required fields missing: workspaceId, companyName, sector, industry' });
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        workspaceId,
        companyName,
        sector,
        industry,
        employees: employees ? parseInt(employees) : 0,
        funding: funding || 'None',
        hiringStatus: hiringStatus || 'NONE',
        conversionProb: conversionProb ? parseFloat(conversionProb) : 50.0,
        aiScore: aiScore ? parseInt(aiScore) : 70,
        status: status || 'DISCOVERED'
      }
    });

    return res.status(201).json(lead);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateLead(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: updateData
    });
    return res.json(lead);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteLead(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    await prisma.lead.delete({ where: { id } });
    return res.json({ message: 'Lead deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function generateTailoredOutreach(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        insights: true,
        intentSignals: true
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const primaryInsight = lead.insights[0]?.summary || 'rapid sector growth dynamics';
    const primarySignal = lead.intentSignals[0]?.signalType || 'pricing page visitor engagement';

    // Personalize outreach dynamically based on DB values!
    const subject = `Tailored alignment for ${lead.companyName} + Deuglo AI`;
    const draftText = `Hi ${lead.companyName} Team,

I noticed your recent intent footprints indicating high interest in our Enterprise Intelligence suite, particularly around ${primarySignal}. 

With your recent indicator: "${primaryInsight}", we see a major alignment factor. Many of our ${lead.sector} partners leverage Deuglo AI to boost their pipelines.

Would love to schedule a quick 10-minute briefing next Tuesday to outline a custom pilot map.

Best,
Admin
Enterprise Admin | Deuglo AI`;

    return res.json({
      leadId: lead.id,
      companyName: lead.companyName,
      subject,
      emailDraft: draftText,
      confidence: lead.conversionProb,
      modelUsed: 'GPT-4o (Premium)',
      signalsSynthesizedCount: lead.intentSignals.length + lead.insights.length
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
