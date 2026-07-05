import React from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useWorkspaceId } from '../hooks/useWorkspaceId';

export const DashboardView: React.FC = () => {
  const defaultWorkspaceId = useWorkspaceId();
  const { kpis, loading, error } = useDashboard(defaultWorkspaceId);



  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-neutral-600">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-sans flex select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Executive Dashboard" />

        <main className="pl-64 flex-1 p-8 space-y-6 max-w-[1400px] w-full">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-500 shrink-0">
              ⚠️ Dashboard Data Fetch Failed: {error}
            </div>
          )}

          {/* 4 KPI Cards Section exactly matching reference */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
            {/* Card 1: Total Revenue Pipeline */}
            <div className="dashboard-card p-6 flex flex-col justify-between h-[160px] bg-surface border border-neutral-200/50">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-primary shadow-sm border border-blue-100 shrink-0">
                  <span className="material-symbols-outlined text-lg leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                    account_balance_wallet
                  </span>
                </div>
                <span className="text-status-success text-[10px] font-bold bg-[#E8F8F0] border border-[#10B981]/20 px-2.5 py-0.5 rounded-full">+12.4%</span>
              </div>
              <div className="mt-3">
                <p className="text-[#64748B] text-[9px] font-extrabold uppercase tracking-widest leading-none">Total Revenue Pipeline</p>
                <h3 className="text-2xl font-black text-[#0F172A] mt-1.5 leading-none">
                  ${kpis ? (kpis.revenuePipeline / 1000000).toFixed(2) : '24.85'}M
                </h3>
                <p className="text-[10px] text-neutral-400 mt-2 leading-none">vs. $21.4M last month</p>
              </div>
            </div>

            {/* Card 2: Qualified Leads */}
            <div className="dashboard-card p-6 flex flex-col justify-between h-[160px] bg-surface border border-neutral-200/50">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-primary shadow-sm border border-blue-100 shrink-0">
                  <span className="material-symbols-outlined text-lg leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                    group_add
                  </span>
                </div>
                <span className="text-status-success text-[10px] font-bold bg-[#E8F8F0] border border-[#10B981]/20 px-2.5 py-0.5 rounded-full">+5.2%</span>
              </div>
              <div className="mt-3">
                <p className="text-[#64748B] text-[9px] font-extrabold uppercase tracking-widest leading-none">Qualified Leads</p>
                <h3 className="text-2xl font-black text-[#0F172A] mt-1.5 leading-none">
                  {kpis ? kpis.qualifiedLeads.toLocaleString() : '1,284'}
                </h3>
                <p className="text-[10px] text-neutral-400 mt-2 leading-none">98 pending verification</p>
              </div>
            </div>

            {/* Card 3: Active Campaigns */}
            <div className="dashboard-card p-6 flex flex-col justify-between h-[160px] bg-surface border border-neutral-200/50">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-primary shadow-sm border border-blue-100 shrink-0">
                  <span className="material-symbols-outlined text-lg leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                    rocket_launch
                  </span>
                </div>
                <span className="text-[#475569] text-[10px] font-bold bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 rounded-full">Stable</span>
              </div>
              <div className="mt-3">
                <p className="text-[#64748B] text-[9px] font-extrabold uppercase tracking-widest leading-none">Active Campaigns</p>
                <h3 className="text-2xl font-black text-[#0F172A] mt-1.5 leading-none">
                  {kpis ? kpis.activeCampaigns : '42'}
                </h3>
                <p className="text-[10px] text-neutral-400 mt-2 leading-none">Across 12 global regions</p>
              </div>
            </div>

            {/* Card 4: AI Accuracy Score */}
            <div className="dashboard-card p-6 flex flex-col justify-between h-[160px] bg-surface border border-neutral-200/50">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-ai-purple shadow-sm border border-violet-100 shrink-0">
                  <span className="material-symbols-outlined text-lg leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome
                  </span>
                </div>
                <span className="text-ai-purple text-[10px] font-bold bg-violet-50 border border-violet-100 px-2.5 py-0.5 rounded-full">Optimized</span>
              </div>
              <div className="mt-3">
                <p className="text-[#64748B] text-[9px] font-extrabold uppercase tracking-widest leading-none">AI Accuracy Score</p>
                <h3 className="text-2xl font-black text-[#0F172A] mt-1.5 leading-none">
                  {kpis ? kpis.aiAccuracy : '98.4'}%
                </h3>
                <p className="text-[10px] text-neutral-400 mt-2 leading-none">Neural Engine v4.2 stable</p>
              </div>
            </div>
          </section>

          {/* Middle Section: Chart & Activities feed matching image structure */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
            {/* Left Card: Lead Growth & Conversion */}
            <div className="dashboard-card p-6 flex flex-col h-[400px] bg-surface border border-neutral-200/50">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">Lead Growth &amp; Conversion</h3>
                  <p className="text-[10px] text-[#64748B] mt-0.5 font-semibold">Performance metrics across the last 30 days</p>
                </div>
                <div className="flex gap-1.5">
                  <button className="px-3.5 py-2 border border-neutral-200 rounded-xl text-[10px] font-bold text-neutral-500 hover:text-[#0F172A] hover:bg-neutral-50 transition-all select-none">7D</button>
                  <button className="px-3.5 py-2 bg-[#EFF6FF] border border-blue-100 rounded-xl text-[10px] font-bold text-primary select-none">30D</button>
                </div>
              </div>
              
              {/* Dynamic SVG conversion chart precisely styled like the reference */}
              <div className="flex-1 relative flex flex-col min-h-0 mt-4">
                
                {/* Legend at the top of grid */}
                <div className="flex gap-6 justify-center items-center text-[10px] text-[#64748B] font-bold mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                    <span>New Leads</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 border-t-2 border-dashed border-ai-purple inline-block" />
                    <span>Converted Leads</span>
                  </div>
                </div>

                <div className="flex-1 flex min-h-0">
                  {/* Y-axis labels exactly as pictured */}
                  <div className="flex flex-col justify-between text-[9px] text-neutral-400 font-mono text-right pr-4 shrink-0 h-44 pb-3">
                    <span>1.5K</span>
                    <span>1.25K</span>
                    <span>1K</span>
                    <span>750</span>
                    <span>500</span>
                    <span>250</span>
                    <span>0</span>
                  </div>

                  <div className="flex-1 relative h-44 border-b border-l border-neutral-100/80">
                    <svg className="w-full h-full overflow-visible absolute inset-0" viewBox="0 0 1000 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(0, 112, 243, 0.12)" />
                          <stop offset="100%" stopColor="rgba(0, 112, 243, 0)" />
                        </linearGradient>
                      </defs>

                      {/* Solid Blue line matching reference shape */}
                      <path d="M0,120 L250,115 L500,105 L750,50 L1000,70" fill="none" stroke="#0070f3" strokeWidth="2.5" />
                      <path d="M0,120 L250,115 L500,105 L750,50 L1000,70 L1000,200 L0,200 Z" fill="url(#blue-grad)" />

                      {/* Purple Dashed line matching reference shape */}
                      <path d="M0,160 L250,165 L500,140 L750,100 T1000,125" fill="none" stroke="#7928ca" strokeDasharray="5,5" strokeWidth="2.5" />
                      
                      {/* Dots on line coordinates */}
                      <circle cx="250" cy="115" r="4.5" fill="#0070f3" stroke="#FFFFFF" strokeWidth="1.5" />
                      <circle cx="500" cy="105" r="4.5" fill="#0070f3" stroke="#FFFFFF" strokeWidth="1.5" />
                      <circle cx="750" cy="50" r="4.5" fill="#0070f3" stroke="#FFFFFF" strokeWidth="1.5" />
                      <circle cx="1000" cy="70" r="4.5" fill="#0070f3" stroke="#FFFFFF" strokeWidth="1.5" />

                      <circle cx="250" cy="165" r="4" fill="#7928ca" stroke="#FFFFFF" strokeWidth="1.5" />
                      <circle cx="500" cy="140" r="4" fill="#7928ca" stroke="#FFFFFF" strokeWidth="1.5" />
                      <circle cx="750" cy="100" r="4" fill="#7928ca" stroke="#FFFFFF" strokeWidth="1.5" />
                      <circle cx="1000" cy="125" r="4" fill="#7928ca" stroke="#FFFFFF" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>

                {/* X-axis labels exactly as pictured */}
                <div className="w-full flex justify-between text-[9px] text-neutral-400 font-mono mt-2 pl-12 pr-2 leading-none uppercase tracking-wider">
                  <span>Apr 20</span>
                  <span>Apr 27</span>
                  <span>May 04</span>
                  <span>May 11</span>
                  <span>May 18</span>
                </div>
              </div>
            </div>

            {/* Right Card: Intelligent Activity Feed exactly as pictured */}
            <div className="dashboard-card p-6 flex flex-col h-[400px] bg-surface border border-neutral-200/50">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="font-bold text-sm text-[#0F172A]">Intelligent Activity Feed</h3>
                <span className="material-symbols-outlined text-neutral-400 text-sm cursor-pointer hover:text-[#0F172A]">
                  filter_list
                </span>
              </div>

              {/* Feed items list matching reference exactly */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Item 1: LEAD ALERT */}
                <div className="p-4 bg-[#FFFFFF] border border-neutral-200/50 rounded-xl flex gap-3 cursor-pointer hover:border-neutral-300 transition-all shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-blue-100 flex items-center justify-center shrink-0 text-primary">
                    <span className="material-symbols-outlined text-sm font-semibold" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider">Lead Alert</span>
                      <span className="text-[9px] text-neutral-400 font-semibold font-mono">11:41 AM</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-normal font-semibold">
                      Global Dynamics Inc. matched "High Intent" pattern.
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-1 font-semibold font-mono">
                      Confidence Score: <span className="text-primary font-black">94/100</span>
                    </p>
                  </div>
                </div>

                {/* Item 2: AI INSIGHT */}
                <div className="p-4 bg-[#FFFFFF] border border-neutral-200/50 rounded-xl flex gap-3 cursor-pointer hover:border-neutral-300 transition-all shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0 text-ai-purple">
                    <span className="material-symbols-outlined text-sm font-semibold" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[9px] font-extrabold text-ai-purple uppercase tracking-wider">AI Insight</span>
                      <span className="text-[9px] text-neutral-400 font-semibold font-mono">11:41 AM</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-normal font-semibold">
                      Optimization complete for "Q4 Outreach Campaign".
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-1 font-semibold font-mono">
                      Performance improved by <span className="text-status-success font-black">24%</span>
                    </p>
                  </div>
                </div>

                {/* Item 3: SYSTEM */}
                <div className="p-4 bg-[#FFFFFF] border border-neutral-200/50 rounded-xl flex gap-3 cursor-pointer hover:border-neutral-300 transition-all shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0 text-neutral-500">
                    <span className="material-symbols-outlined text-sm font-semibold" style={{ fontVariationSettings: "'FILL' 1" }}>sync</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[9px] font-extrabold text-neutral-500 uppercase tracking-wider">System</span>
                      <span className="text-[9px] text-neutral-400 font-semibold font-mono">11:41 AM</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-normal font-semibold">
                      Salesforce CRM data synchronization completed.
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-1 font-semibold font-mono">
                      Records updated: <span className="text-primary font-black">1,256</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>


        </main>
      </div>
    </div>
  );
};
export default DashboardView;
