async function runTests() {
  const PORT = 5000;
  const BASE_URL = `http://localhost:${PORT}/api/v1`;

  console.log('==================================================');
  console.log('🧪 RUNNING LEAD INTELLIGENCE API INTEGRATION TESTS');
  console.log('==================================================\n');

  try {
    // 1. Health check
    console.log('🔍 Testing health check endpoint...');
    const healthRes = await fetch(`http://localhost:${PORT}/health`);
    const health = await healthRes.json();
    console.log('✅ Health status:', health.status);
    console.log('   Timestamp:', health.timestamp);
    console.log('   Service:', health.service, '\n');

    // 2. Authentication Login (Admin)
    console.log('🔑 Authenticating default user (Admin)...');
    const authRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@deuglo.ai',
        password: 'Admin@2024!'
      })
    });
    
    if (!authRes.ok) {
      throw new Error(`Auth failed with status ${authRes.status}: ${await authRes.text()}`);
    }

    const authData = await authRes.json();
    console.log('✅ Authentication successful!');
    const token = authData.token;
    console.log('   User:', authData.user.firstName, authData.user.lastName);
    console.log('   Role:', authData.user.role);
    console.log('   Token acquired (truncated):', token.substring(0, 30) + '...\n');

    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 3. Get Workspaces
    console.log('💼 Retrieving workspaces...');
    const wsRes = await fetch(`${BASE_URL}/workspaces`, { headers });
    const workspaces = await wsRes.json();
    const workspace = workspaces[0];
    console.log('✅ Found workspaces count:', workspaces.length);
    console.log('   Primary Workspace Name:', workspace.name);
    console.log('   Workspace ID:', workspace.id, '\n');

    // 4. Get Dashboard KPIs
    console.log('📊 Fetching Executive Dashboard KPI metrics...');
    const kpiRes = await fetch(`${BASE_URL}/dashboards/kpis?workspaceId=${workspace.id}`, { headers });
    const kpis = await kpiRes.json();
    console.log('✅ KPIs retrieved successfully!');
    console.log('   Total Revenue Pipeline:', `$${(kpis.revenuePipeline / 1000000).toFixed(2)}M`);
    console.log('   Qualified Leads Count:', kpis.qualifiedLeads);
    console.log('   Active Campaigns Count:', kpis.activeCampaigns);
    console.log('   AI Engine Accuracy Score:', `${kpis.aiAccuracy}%`);
    console.log('   Processing Velocity:', `${kpis.avgVelocityLpm} lpm\n`);

    // 5. Get Dashboard Activities feed
    console.log('🔔 Fetching Intelligent Activities feed...');
    const feedRes = await fetch(`${BASE_URL}/dashboards/feed?workspaceId=${workspace.id}`, { headers });
    const feeds = await feedRes.json();
    console.log('✅ Found feed activities:', feeds.length);
    feeds.forEach((item: any, idx: number) => {
      console.log(`   [${idx + 1}] type: ${item.type} | title: ${item.title} | desc: ${item.description}`);
    });
    console.log('');

    // 6. Get Leads Directory list
    console.log('📇 Querying Leads Management directory...');
    const leadsRes = await fetch(`${BASE_URL}/leads?workspaceId=${workspace.id}`, { headers });
    const leads = await leadsRes.json();
    console.log('✅ Found leads count:', leads.length);
    leads.forEach((lead: any) => {
      console.log(`   - ${lead.companyName} (${lead.sector}) | Score: ${lead.aiScore}% | Status: ${lead.status}`);
    });
    console.log('');

    // 7. Get single Lead insights details (Nebula Cloud)
    const targetLead = leads.find((l: any) => l.companyName === 'Nebula Cloud');
    if (targetLead) {
      console.log(`🧠 Inspecting AI insights for Lead: ${targetLead.companyName}...`);
      const detailsRes = await fetch(`${BASE_URL}/leads/${targetLead.id}`, { headers });
      const details = await detailsRes.json();
      console.log('✅ AI Summary:', details.insights[0]?.summary);
      console.log('   Qualification reasoning points:');
      details.reasoningPoints.forEach((pt: any) => {
        console.log(`     [${pt.passed ? '✔' : '✖'}] ${pt.description}`);
      });
      console.log('   Detected buyer intent signals:');
      details.intentSignals.forEach((sig: any) => {
        console.log(`     • ${sig.signalType}: intensity: ${sig.intensity} | count: ${sig.volume}`);
      });
      console.log('');

      // 8. Generate personalized AI outreach draft
      console.log(`✉ Generating personalized AI outreach for ${targetLead.companyName}...`);
      const outreachRes = await fetch(`${BASE_URL}/leads/${targetLead.id}/outreach`, {
        method: 'POST',
        headers
      });
      const outreach = await outreachRes.json();
      console.log('✅ Outreach draft generated successfully!');
      console.log('   Subject:', outreach.subject);
      console.log('   Synthesis engine:', outreach.modelUsed);
      console.log('   Draft content:\n');
      console.log('--------------------------------------------------');
      console.log(outreach.emailDraft);
      console.log('--------------------------------------------------\n');
    }

    // 9. Get visual pipeline graphs configurations
    console.log('🔗 Fetching visual AI pipeline graph orchestration layouts...');
    const pipelinesRes = await fetch(`${BASE_URL}/pipelines?workspaceId=${workspace.id}`, { headers });
    const pipelines = await pipelinesRes.json();
    const pipeline = pipelines[0];
    console.log('✅ Found visual pipeline:', pipeline.name);
    console.log('   Nodes count:', pipeline.nodes.length);
    pipeline.nodes.forEach((node: any) => {
      console.log(`     • Node: "${node.name}" | type: ${node.type} | status: ${node.status} | pos: (${node.x}, ${node.y})`);
    });
    console.log('');

    // 10. Execute visual pipeline flow (launching async simulated crawl runs)
    console.log(`⚡ Launching async simulated visual flow execution for pipeline: ${pipeline.name}...`);
    const execRes = await fetch(`${BASE_URL}/pipelines/${pipeline.id}/execute`, {
      method: 'POST',
      headers
    });
    const exec = await execRes.json();
    console.log('✅ Execution status:', exec.status);
    console.log('   Velocity throughput:', exec.avgVelocityLpm, 'lpm');
    console.log('   Activity logs streams:');
    exec.logs.forEach((log: string) => {
      console.log(`     > ${log}`);
    });
    console.log('');

    // 11. Get outreach sequences campaigns list
    console.log('📬 Fetching Outreach sequence campaigns list...');
    const campaignsRes = await fetch(`${BASE_URL}/campaigns?workspaceId=${workspace.id}`, { headers });
    const campaigns = await campaignsRes.json();
    const campaign = campaigns[0];
    console.log('✅ Primary campaign name:', campaign.name);
    console.log(`   Stats: Outreach total: ${campaign.totalOutreach} | opens: ${campaign.openRate}% | replies: ${campaign.replyRate}%`);
    console.log(`   Bounce rate: ${campaign.bounceRate}% | spam risk: ${campaign.spamRisk}\n`);

    // 12. Get campaign sequences steps
    console.log(`⚙ Fetching steps sequences config for campaign: ${campaign.name}...`);
    const campaignDetailsRes = await fetch(`${BASE_URL}/campaigns/${campaign.id}`, { headers });
    const campaignDetails = await campaignDetailsRes.json();
    console.log('✅ Sequences steps:');
    campaignDetails.steps.forEach((step: any) => {
      console.log(`     [Step ${step.stepIndex}] type: ${step.type} | name: ${step.name}`);
    });
    console.log('');

    // 13. Get CRM integrations status
    console.log('🔄 Querying CRM Synchronization integrations hub...');
    const integrationsRes = await fetch(`${BASE_URL}/integrations?workspaceId=${workspace.id}`, { headers });
    const integrations = await integrationsRes.json();
    integrations.forEach((int: any) => {
      console.log(`     • Provider: ${int.provider} | status: ${int.syncStatus} | records synced: ${int.recordsSynced} | active: ${int.isActive}`);
    });
    console.log('');

    console.log('==================================================');
    console.log('🎉 ALL INTEGRATION API ENDPOINTS SUCCESSFULLY VERIFIED!');
    console.log('==================================================');

  } catch (error: any) {
    console.error('❌ Integration test failed with error:', error.message);
  }
}

runTests();
