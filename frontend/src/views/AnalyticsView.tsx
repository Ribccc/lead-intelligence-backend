import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useDashboard } from '../hooks/useDashboard';
import { useWorkspaceId } from '../hooks/useWorkspaceId';

export const AnalyticsView: React.FC = () => {
  const defaultWorkspaceId = useWorkspaceId();
  const { kpis, loading, error } = useDashboard(defaultWorkspaceId);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFBFD] text-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mr-3"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFD] text-slate-800 font-sans flex select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Analytics & System Insights" />

        <main className="pl-64 flex-1 p-8 space-y-6 max-w-[1400px] mx-auto w-full">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              ⚠️ Telemetry Error: {error}
            </div>
          )}

          {/* Metric grids */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-surface border border-neutral-200/50 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pipeline Density</p>
              <p className="text-2xl font-black text-slate-800 font-mono mt-1">
                ${kpis ? (kpis.revenuePipeline / 1000000).toFixed(2) : '24.85'}M
              </p>
            </div>

            <div className="bg-surface border border-neutral-200/50 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Qualified Nodes</p>
              <p className="text-2xl font-black text-slate-800 font-mono mt-1">
                {kpis ? kpis.qualifiedLeads : '1,284'}
              </p>
            </div>

            <div className="bg-surface border border-neutral-200/50 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AI Match Confidence</p>
              <p className="text-2xl font-black text-slate-800 font-mono mt-1">
                {kpis ? kpis.aiAccuracy : '98.4'}%
              </p>
            </div>

            <div className="bg-surface border border-neutral-200/50 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Queue Velocity</p>
              <p className="text-2xl font-black text-slate-800 font-mono mt-1">
                {kpis ? kpis.avgVelocityLpm : '142'} lpm
              </p>
            </div>
          </section>

          {/* Interactive Chart Section */}
          <div className="bg-surface border border-neutral-200/50 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Conversion Probability Trajectory</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">WEEKLY INTENT FOOTPRINTS</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 font-mono">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> Qualified</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-violet-500 rounded-full" /> Nurture</span>
              </div>
            </div>

            {/* Modular SVG Chart */}
            <div className="h-64 relative flex items-center justify-center bg-slate-50/50 border border-slate-200/60 rounded-xl overflow-hidden p-4">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                {/* Horizontal reference grids */}
                <line x1="0" y1="50" x2="500" y2="50" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="150" x2="500" y2="150" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />

                {/* Primary blue curve path */}
                <path
                  d="M 0 150 Q 100 120 200 90 T 400 40 T 500 20"
                  fill="none"
                  stroke="#0070f3"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Secondary violet dashed curve path */}
                <path
                  d="M 0 180 Q 100 160 200 120 T 400 80 T 500 70"
                  fill="none"
                  stroke="#7928ca"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            
            <div className="pt-4 border-t border-slate-100 mt-4 flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest leading-none">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
export default AnalyticsView;
