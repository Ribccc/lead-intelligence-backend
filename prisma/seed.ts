import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with high-fidelity Stitch UI values...');

  // 1. Clear database
  await prisma.auditLog.deleteMany();
  await prisma.activityFeed.deleteMany();
  await prisma.analyticsMetric.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.campaignLead.deleteMany();
  await prisma.campaignStep.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.pipelineEdge.deleteMany();
  await prisma.pipelineNode.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.qualificationReason.deleteMany();
  await prisma.intentSignal.deleteMany();
  await prisma.aIInsight.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create default user (Admin - Platform Administrator)
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'admin@deuglo.ai',
      passwordHash,
      firstName: 'Admin',
      lastName: '',
      role: 'Administrator',
      avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKE2QW7kt-xYauoqKx8T8JtQ_DRKjBWW8ger-UuPnyPuxuuhh0XRf4IefQNqQ3vIU6IReSbpfwnVMaBn2jgPZuuZdpsavfpCDQHJ-NxFhgWbXQJ_Ol7cCplVHTJW1YOgkKO8Ml8XQx7bk2sAP0lGSraY2qNwxkTllqBCLtaJ-SQKRmf1srZp1v8ub-7Vs5un_O8_tRWHiZsT4LMBjxs5Jblfs7TGW69Q0lOKZcSaAyiEU4VKDEP1lnIL8YZ-UsYMeLN2gD36aDz1Qv'
    }
  });

  // 3. Create default workspace (Global Enterprise)
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Global Enterprise',
      logoUrl: null
    }
  });

  // 4. Link User to Workspace
  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'Administrator'
    }
  });

  // 5. Create Leads (matching Leads Management Center and Top Leads Opportunities)
  const nebulaCloud = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      companyName: 'Nebula Cloud',
      sector: 'Enterprise SaaS',
      industry: 'Cloud Infrastructure',
      employees: 1240,
      funding: '$82M (Series C)',
      hiringStatus: 'HIGH_VOLUME',
      conversionProb: 94.0,
      aiScore: 98,
      status: 'QUALIFIED'
    }
  });

  const quantumLabs = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      companyName: 'Quantum Labs',
      sector: 'Cybersecurity',
      industry: 'SaaS / DevOps',
      employees: 450,
      funding: '$15M (Series A)',
      hiringStatus: 'STABLE',
      conversionProb: 85.0,
      aiScore: 92,
      status: 'QUALIFIED'
    }
  });

  const vertexHealth = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      companyName: 'Vertex Health',
      sector: 'HealthTech',
      industry: 'Healthcare / Biotech',
      employees: 2800,
      funding: 'Public (VHX)',
      hiringStatus: 'HIGH_VOLUME',
      conversionProb: 65.0,
      aiScore: 76,
      status: 'NURTURE'
    }
  });

  const omniLogistics = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      companyName: 'OmniLogistics',
      sector: 'Supply Chain',
      industry: 'Logistics / Global',
      employees: 9400,
      funding: 'Private Equity',
      hiringStatus: 'EXECUTIVE_SEARCH',
      conversionProb: 70.0,
      aiScore: 84,
      status: 'NURTURE'
    }
  });

  const stellarSystems = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      companyName: 'Stellar Systems',
      sector: 'Financial Technology',
      industry: 'FinTech / Series C',
      employees: 620,
      funding: '$45M (Series C)',
      hiringStatus: 'HIGH_VOLUME',
      conversionProb: 98.2,
      aiScore: 98,
      status: 'QUALIFIED'
    }
  });

  const apexLogix = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      companyName: 'Apex Logix',
      sector: 'Supply Chain',
      industry: 'Logistics / Global',
      employees: 340,
      funding: '$22M (Series B)',
      hiringStatus: 'STABLE',
      conversionProb: 94.1,
      aiScore: 94,
      status: 'QUALIFIED'
    }
  });

  const snowflake = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      companyName: 'Snowflake',
      sector: 'Enterprise SaaS',
      industry: 'Data Cloud / Analytics',
      employees: 7200,
      funding: 'Public (SNOW)',
      hiringStatus: 'HIGH_VOLUME',
      conversionProb: 92.5,
      aiScore: 95,
      status: 'QUALIFIED'
    }
  });

  const cloudflare = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      companyName: 'Cloudflare',
      sector: 'Cybersecurity',
      industry: 'CDN / Edge Network',
      employees: 3400,
      funding: 'Public (NET)',
      hiringStatus: 'STABLE',
      conversionProb: 88.0,
      aiScore: 91,
      status: 'QUALIFIED'
    }
  });

  const datadog = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      companyName: 'Datadog',
      sector: 'DevOps / Observability',
      industry: 'Cloud Monitoring',
      employees: 4800,
      funding: 'Public (DDOG)',
      hiringStatus: 'HIGH_VOLUME',
      conversionProb: 95.0,
      aiScore: 97,
      status: 'QUALIFIED'
    }
  });

  const elastic = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      companyName: 'Elastic',
      sector: 'Enterprise Search',
      industry: 'Search AI / Public',
      employees: 3100,
      funding: 'Public (ESTC)',
      hiringStatus: 'STABLE',
      conversionProb: 78.5,
      aiScore: 82,
      status: 'NURTURE'
    }
  });

  const hashicorp = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      companyName: 'HashiCorp',
      sector: 'DevOps / Infrastructure',
      industry: 'Cloud Security / IAC',
      employees: 2200,
      funding: 'Public (HCP)',
      hiringStatus: 'STABLE',
      conversionProb: 82.0,
      aiScore: 86,
      status: 'QUALIFIED'
    }
  });

  const pagerduty = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      companyName: 'PagerDuty',
      sector: 'DevOps / Incident Management',
      industry: 'Incident Response',
      employees: 1100,
      funding: 'Public (PD)',
      hiringStatus: 'STABLE',
      conversionProb: 72.0,
      aiScore: 78,
      status: 'NURTURE'
    }
  });

  // 6. Create AI Insights, Intent Signals, and Reasons for leads
  await prisma.aIInsight.create({
    data: {
      leadId: nebulaCloud.id,
      summary: 'Target is experiencing rapid regional growth in Southeast Asia. AI detected internal reorganization favoring infrastructure modernization.',
      sourceType: 'APAC Expansion'
    }
  });

  await prisma.aIInsight.create({
    data: {
      leadId: quantumLabs.id,
      summary: 'New CTO appointed 12 days ago. Indicated immediate focus on security posture remediation in public cloud footprints.',
      sourceType: 'CTO Hire'
    }
  });

  await prisma.aIInsight.create({
    data: {
      leadId: datadog.id,
      summary: 'Aggressive expansion of cloud metrics integrations detected. Internal team shifting to OpenTelemetry standards.',
      sourceType: 'OTel Migration'
    }
  });

  await prisma.aIInsight.create({
    data: {
      leadId: snowflake.id,
      summary: 'Strong data sharing footprint expansion. Shifting workloads away from legacy databases to enterprise analytics layers.',
      sourceType: 'Data Modernization'
    }
  });

  await prisma.intentSignal.createMany({
    data: [
      { leadId: nebulaCloud.id, signalType: 'Case Study Downloads', volume: 4, intensity: 'High' },
      { leadId: nebulaCloud.id, signalType: 'Pricing Page Views', volume: 12, intensity: 'High' },
      { leadId: quantumLabs.id, signalType: 'Compliance Whitepaper Downloads', volume: 2, intensity: 'Medium' },
      { leadId: datadog.id, signalType: 'Enterprise Integration Guide Clicks', volume: 8, intensity: 'High' },
      { leadId: snowflake.id, signalType: 'Analytics Whitepaper Downloads', volume: 5, intensity: 'High' },
      { leadId: cloudflare.id, signalType: 'WAF Setup Guide Views', volume: 6, intensity: 'Medium' },
      { leadId: hashicorp.id, signalType: 'Secrets Management Whitepaper Downloads', volume: 3, intensity: 'Medium' }
    ]
  });

  await prisma.qualificationReason.createMany({
    data: [
      { leadId: nebulaCloud.id, description: 'High hiring activity in Data Eng roles', passed: true },
      { leadId: nebulaCloud.id, description: 'Competitor contract expiring in Q3', passed: true },
      { leadId: nebulaCloud.id, description: 'CTO active engagement on LinkedIn', passed: true },
      
      { leadId: datadog.id, description: 'Observability spend optimizations active', passed: true },
      { leadId: datadog.id, description: 'Active VP of Engineering search', passed: true },
      
      { leadId: snowflake.id, description: 'Increased query processing scale requirements', passed: true },
      { leadId: snowflake.id, description: 'Cloud budget expansion verified', passed: true }
    ]
  });

  // 7. Create Visual Pipeline (AI Pipeline Orchestration)
  const pipeline = await prisma.pipeline.create({
    data: {
      workspaceId: workspace.id,
      name: 'AI Lead Pipeline',
      isActive: true
    }
  });

  const node1 = await prisma.pipelineNode.create({
    data: {
      pipelineId: pipeline.id,
      type: 'SEED_SOURCE',
      name: 'Seed Sources',
      config: JSON.stringify({ sources: ['Apollo', 'LinkedIn Sales Nav'] }),
      status: 'COMPLETED',
      processed: 4281,
      x: 0,
      y: 350
    }
  });

  const node2 = await prisma.pipelineNode.create({
    data: {
      pipelineId: pipeline.id,
      type: 'WEB_CRAWLER',
      name: 'Web Crawling',
      config: JSON.stringify({ targets: ['Company News'], speedLimit: 100 }),
      status: 'RUNNING',
      throughput: 82.0,
      processed: 2780,
      x: 300,
      y: 350
    }
  });

  const node3 = await prisma.pipelineNode.create({
    data: {
      pipelineId: pipeline.id,
      type: 'AI_QUALIFIER',
      name: 'AI Qualification',
      config: JSON.stringify({ model: 'gpt-4o', threshold: 0.85, prompt: 'You are an expert sales analyst...' }),
      status: 'RUNNING',
      processed: 1102,
      x: 600,
      y: 320
    }
  });

  const node4 = await prisma.pipelineNode.create({
    data: {
      pipelineId: pipeline.id,
      type: 'DATA_CLEANING',
      name: 'Data Cleaning',
      config: JSON.stringify({ deduplication: true }),
      status: 'IDLE',
      x: 850,
      y: 150
    }
  });

  const node5 = await prisma.pipelineNode.create({
    data: {
      pipelineId: pipeline.id,
      type: 'DEEP_SCAN',
      name: 'Deep Scan',
      config: JSON.stringify({ pdfParsing: true }),
      status: 'IDLE',
      x: 850,
      y: 550
    }
  });

  const node6 = await prisma.pipelineNode.create({
    data: {
      pipelineId: pipeline.id,
      type: 'OUTREACH',
      name: 'Outreach',
      config: JSON.stringify({ platforms: ['Instantly', 'Smartlead'] }),
      status: 'IDLE',
      x: 1150,
      y: 350
    }
  });

  await prisma.pipelineEdge.createMany({
    data: [
      { pipelineId: pipeline.id, sourceNodeId: node1.id, targetNodeId: node2.id },
      { pipelineId: pipeline.id, sourceNodeId: node2.id, targetNodeId: node3.id },
      { pipelineId: pipeline.id, sourceNodeId: node3.id, targetNodeId: node4.id },
      { pipelineId: pipeline.id, sourceNodeId: node3.id, targetNodeId: node5.id },
      { pipelineId: pipeline.id, sourceNodeId: node4.id, targetNodeId: node6.id },
      { pipelineId: pipeline.id, sourceNodeId: node5.id, targetNodeId: node6.id }
    ]
  });

  // 8. Create Outreach Campaigns (matching Outreach Automation workflow editor)
  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      name: 'Q4 Enterprise Growth',
      totalOutreach: 12482,
      openRate: 64.2,
      replyRate: 18.5,
      bounceRate: 0.4,
      spamRisk: 'VERY LOW',
      creditsUsed: 2400,
      creditsTotal: 10000,
      isActive: true
    }
  });

  await prisma.campaignStep.createMany({
    data: [
      {
        campaignId: campaign.id,
        stepIndex: 1,
        type: 'EMAIL',
        name: 'Step 1: AI-Generated Email',
        config: JSON.stringify({
          subject: '{{Lead.Company}} + Deuglo AI: Security Alignment',
          body: "Hi {{Lead.FirstName}}, I noticed you were looking into our Q4 Security Compliance framework. Given your role at {{Lead.Company}}, I thought you'd appreciate our latest analysis on..."
        })
      },
      {
        campaignId: campaign.id,
        stepIndex: 2,
        type: 'LINKEDIN_CONNECT',
        name: 'Step 2: LinkedIn Connection',
        config: JSON.stringify({ autoConnect: true, message: 'Hi {{Lead.FirstName}}, I would love to connect!' })
      },
      {
        campaignId: campaign.id,
        stepIndex: 3,
        type: 'EMAIL',
        name: 'Step 3: AI Follow-up (Persistence)',
        config: JSON.stringify({
          subject: 'Quick question about {{Lead.Company}} roadmap',
          body: "Hi {{Lead.FirstName}}, following up on my email regarding compliance stack optimizations..."
        })
      }
    ]
  });

  // 9. Add Campaign Leads linking leads to campaign
  await prisma.campaignLead.createMany({
    data: [
      { campaignId: campaign.id, leadId: nebulaCloud.id, currentStep: 1, lastStatus: 'OPENED' },
      { campaignId: campaign.id, leadId: quantumLabs.id, currentStep: 2, lastStatus: 'SENT' }
    ]
  });

  // 10. Create Integration Hub (CRM Sync UI screen links)
  await prisma.integration.createMany({
    data: [
      { workspaceId: workspace.id, provider: 'Salesforce', isActive: true, syncStatus: 'SUCCESS', recordsSynced: 1240, lastSyncedAt: new Date(Date.now() - 3600000) },
      { workspaceId: workspace.id, provider: 'HubSpot', isActive: false, syncStatus: 'SUCCESS', recordsSynced: 0 }
    ]
  });

  // 11. Create Executive Dashboard Metrics (dashboard KPI cards)
  await prisma.analyticsMetric.createMany({
    data: [
      { workspaceId: workspace.id, metricName: 'revenue_pipeline', value: 24850000 },
      { workspaceId: workspace.id, metricName: 'qualified_leads', value: 1284 },
      { workspaceId: workspace.id, metricName: 'active_campaigns', value: 42 },
      { workspaceId: workspace.id, metricName: 'ai_accuracy', value: 98.4 },
      { workspaceId: workspace.id, metricName: 'avg_velocity', value: 142 }
    ]
  });

  // 12. Create Dashboard Activity Feeds (matching Activity Feed / Intelligent Feed UI)
  await prisma.activityFeed.createMany({
    data: [
      {
        workspaceId: workspace.id,
        type: 'LEAD_ALERT',
        title: 'Lead Alert',
        description: 'Global Dynamics Inc. matched "High Intent" pattern.',
        score: 94,
        meta: JSON.stringify({ qualified: true, score: 94 })
      },
      {
        workspaceId: workspace.id,
        type: 'AI_INSIGHT',
        title: 'AI Insight',
        description: 'Optimization complete for "Q4 Outreach" campaign.',
        meta: JSON.stringify({ tag: 'AUTOMATED' })
      },
      {
        workspaceId: workspace.id,
        type: 'SYSTEM',
        title: 'System',
        description: 'Salesforce CRM data synchronization successful. 1,240 records updated.'
      }
    ]
  });

  console.log('Database successfully seeded!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
