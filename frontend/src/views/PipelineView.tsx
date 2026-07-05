import React, { useState } from 'react';
import { usePipeline } from '../hooks/usePipeline';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useWorkspaceId } from '../hooks/useWorkspaceId';

export const PipelineView: React.FC = () => {
  const defaultWorkspaceId = useWorkspaceId(); 
  
  const {
    activePipeline,
    loading,
    executing,
    logs,
    error,
    updateNodePosition,
    saveLayoutCoordinates,
    executePipeline,
    refreshPipelines
  } = usePipeline(defaultWorkspaceId);

  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { pipelineEffects } = usePipeline(defaultWorkspaceId);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFBFD] text-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-3"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFD] text-slate-800 font-sans flex select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="AI Pipeline Orchestration" />

        <main className="pl-64 flex-1 p-8 space-y-6 max-w-[1400px] mx-auto w-full flex flex-col h-[calc(100vh-3.5rem)]">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              ⚠️ Visual Orchestration Failed: {error || 'No active pipeline found.'}
            </div>
          )}

          {/* Action Header controls */}
          <div className="flex justify-between items-center bg-surface border border-neutral-200/50 rounded-xl p-4 shadow-sm shrink-0">
            <div>
              <h3 className="font-bold text-xs text-slate-800">AI Crawl Flow Controller</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Drag node cards to update database markers. Click execute to test crawling queue streams.</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={refreshPipelines}
                className="px-3.5 py-2 border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-neutral-50 transition-all"
              >
                Refresh Nodes
              </button>
              
              <button
                onClick={saveLayoutCoordinates}
                className="px-3.5 py-2 border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-neutral-50 transition-all"
              >
                Save Layout
              </button>

              <button
                onClick={executePipeline}
                disabled={executing}
                className="px-4 py-2 bg-gradient-to-r from-primary to-ai-purple text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-blue-500/10 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {executing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-white"></div>
                    Executing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm font-bold">play_arrow</span>
                    Execute Flow
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pipeline Effects Dashboard */}
          <div className="grid grid-cols-4 gap-4 shrink-0">
            <div className="bg-surface border border-neutral-200/50 rounded-xl p-4 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Crawl Queue</span>
              <span className="text-2xl font-bold text-slate-800">{pipelineEffects?.crawlQueue ?? 0}</span>
            </div>
            <div className="bg-surface border border-neutral-200/50 rounded-xl p-4 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Discovered Leads</span>
              <span className="text-2xl font-bold text-slate-800">{pipelineEffects?.discoveredLeads ?? 0}</span>
            </div>
            <div className="bg-surface border border-neutral-200/50 rounded-xl p-4 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Qualified Leads</span>
              <span className="text-2xl font-bold text-slate-800">{pipelineEffects?.qualifiedLeads ?? 0}</span>
            </div>
            <div className="bg-surface border border-neutral-200/50 rounded-xl p-4 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Extracted Contacts</span>
              <span className="text-2xl font-bold text-slate-800">{pipelineEffects?.contacts ?? 0}</span>
            </div>
          </div>

          {/* Grid split: Visual canvas & Realtime Logs Console */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
            
            {/* Visual Coordinates Grid Canvas */}
            <div className="lg:col-span-3 border border-neutral-200 bg-slate-50/50 rounded-2xl relative overflow-hidden flex items-center justify-center min-h-[450px] shadow-sm">
              
              {/* Dynamic SVGs connector edges lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0070f3" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#7928ca" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#0070f3" stopOpacity="0.2" />
                  </linearGradient>
                </defs>

                {activePipeline && activePipeline.nodes.length >= 6 && (
                  <>
                    {/* Simulated visual connector wires between visual cards */}
                    <path
                       className="connection-line"
                      d={`M ${activePipeline.nodes[0].x + 180} ${activePipeline.nodes[0].y + 50} 
                          L ${activePipeline.nodes[1].x} ${activePipeline.nodes[1].y + 50}`}
                      fill="none"
                      stroke="url(#lineGrad)"
                      strokeWidth="2"
                    />
                    <path
                      className="connection-line"
                      d={`M ${activePipeline.nodes[1].x + 180} ${activePipeline.nodes[1].y + 50} 
                          L ${activePipeline.nodes[2].x} ${activePipeline.nodes[2].y + 50}`}
                      fill="none"
                      stroke="url(#lineGrad)"
                      strokeWidth="2"
                    />
                    <path
                      d={`M ${activePipeline.nodes[2].x + 180} ${activePipeline.nodes[2].y + 50} 
                          Q ${activePipeline.nodes[2].x + 230} ${activePipeline.nodes[2].y + 50} 
                            ${activePipeline.nodes[3].x} ${activePipeline.nodes[3].y + 40}`}
                      fill="none"
                      stroke="rgba(15, 23, 42, 0.06)"
                      strokeWidth="1.5"
                    />
                    <path
                      d={`M ${activePipeline.nodes[2].x + 180} ${activePipeline.nodes[2].y + 50} 
                          Q ${activePipeline.nodes[2].x + 230} ${activePipeline.nodes[2].y + 50} 
                            ${activePipeline.nodes[4].x} ${activePipeline.nodes[4].y + 40}`}
                      fill="none"
                      stroke="rgba(15, 23, 42, 0.06)"
                      strokeWidth="1.5"
                    />
                  </>
                )}
              </svg>

              <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

              {/* Node Cards draggable mapping */}
              <div className="absolute inset-0 overflow-auto z-10 p-6">
                {activePipeline && activePipeline.nodes.map((node) => (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      cursor: dragNodeId === node.id ? 'grabbing' : 'grab',
                    }}
                    onMouseDown={() => setDragNodeId(node.id)}
                    onMouseUp={() => setDragNodeId(null)}
                    onMouseMove={(e) => {
                      if (dragNodeId === node.id) {
                        const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                        if (rect) {
                          const newX = Math.max(0, Math.min(rect.width - 240, e.clientX - rect.left - 100));
                          const newY = Math.max(0, Math.min(rect.height - 150, e.clientY - rect.top - 40));
                          updateNodePosition(node.id, newX, newY);
                        }
                      }
                    }}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-52 bg-surface border rounded-2xl p-4 shadow-sm transition-all select-none duration-100 ${
                      node.status === 'RUNNING' ? 'border-primary shadow-md shadow-blue-500/5 ring-2 ring-primary/20' : 
                      selectedNodeId === node.id ? 'border-primary ring-2 ring-primary' : 'border-neutral-200/60 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2.5">
                      <span className={`text-[8px] font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        node.type === 'AI_QUALIFIER'
                          ? 'bg-violet-50 text-violet-600 border border-violet-100'
                          : 'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}>
                        {node.type}
                      </span>
                      
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        node.status === 'COMPLETED' ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' :
                        node.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' :
                        'bg-slate-300'
                      }`} />
                    </div>

                    <h3 className="font-bold text-xs text-slate-800 mb-1 leading-none">{node.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono truncate">
                      {node.type === 'SEED_SOURCE' ? 'Apollo, LinkedIn Sales' :
                       node.type === 'WEB_CRAWLER' ? 'Crawling news portals' :
                       node.type === 'AI_QUALIFIER' ? 'GPT-4o Intent checks' :
                       node.type === 'DATA_CLEANING' ? 'Deduplication active' :
                       node.type === 'DEEP_SCAN' ? 'PDF Whitepapers scraper' :
                       'Output Outreach sync'}
                    </p>

                    <div className="border-t border-neutral-100 pt-2 mt-3 flex justify-between items-center text-[9px] text-slate-400 font-mono leading-none">
                      <span>Processed: {node.processed}</span>
                      {node.throughput > 0 && (
                        <span className="text-emerald-600 font-semibold">{node.throughput} lpm</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Logs console & Node Inspection */}
            <div className="border border-neutral-200 bg-surface rounded-2xl p-5 flex flex-col min-h-[450px] shadow-sm">
              {selectedNodeId ? (() => {
                const node = activePipeline?.nodes.find(n => n.id === selectedNodeId);
                if (!node) return null;
                return (
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-xs text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        Node Inspection: {node.name}
                      </h2>
                      <button onClick={() => setSelectedNodeId(null)} className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-500 block mb-1">Status</span>
                        <span className="font-bold text-xs text-slate-800">{node.status}</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-500 block mb-1">Records Processed</span>
                        <span className="font-bold text-xs text-slate-800">{node.processed}</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-500 block mb-1">Service Endpoints Touched</span>
                        <span className="font-mono text-[10px] text-slate-600">
                          {node.type === 'WEB_CRAWLER' ? 'CrawlerRunner.run()' : 
                           node.type === 'AI_QUALIFIER' ? 'ScoringRunner.run()' : 
                           node.type === 'DEEP_SCAN' ? 'EnrichmentRunner.run()' : 'Internal System'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <>
                  <h2 className="font-bold text-xs text-slate-800 mb-4 tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                    Live Telemetry Logs
                  </h2>

                  <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-[10px] text-slate-600 space-y-2.5 leading-relaxed custom-scrollbar">
                    {logs.length === 0 ? (
                      <div className="text-slate-400 italic flex items-center justify-center h-full text-center p-4">
                        Click "Execute Flow" above to activate visual crawler pipelines and stream logger runs...
                      </div>
                    ) : (
                      logs.filter((log): log is string => typeof log === 'string').map((log, idx) => (
                        <div
                          key={idx}
                          className={
                            log.startsWith('❌') ? 'text-red-600 font-semibold' :
                            log.startsWith('✔') ? 'text-emerald-600 font-semibold' :
                            log.includes('Starting') ? 'text-blue-600 font-semibold' : 'text-slate-600'
                          }
                        >
                          <span className="text-slate-400 mr-2">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                          {log}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-neutral-100 pt-4 mt-4 text-[9px] text-slate-400 font-mono flex justify-between items-center shrink-0">
                    <span>Engines: Active</span>
                    <span>Port: 5000</span>
                  </div>
                </>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};
