import React, { useState } from 'react';
import { usePipeline } from '../hooks/usePipeline';
import { useAuth } from '../hooks/useAuth';

export const PipelineCanvas: React.FC = () => {
  // 1. Grab logged user state and active session
  const { user } = useAuth();
  
  // 2. Default workspace id scoped dynamically (would typically pull from workspace settings context)
  const defaultWorkspaceId = "bc3d7162-9760-4f5a-b4ec-a0f899daf00b"; 
  
  // 3. Harness the stateful visual pipeline hook
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-950 text-white font-medium">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-3"></div>
        Loading AI Orchestrator visual layouts...
      </div>
    );
  }

  if (error || !activePipeline) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-xl text-red-400">
        ⚠️ Failed to load visual pipeline graphs config. Error: {error || 'No active pipeline found.'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-8 selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="flex justify-between items-center border-b border-white/5 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            {activePipeline.name} Orchestration
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Scoped under Global Enterprise workspace • Active operator: {user ? `${user.firstName} ${user.lastName}` : 'Admin'}
          </p>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={refreshPipelines}
            className="px-4 py-2 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Refresh Nodes
          </button>
          
          <button
            onClick={saveLayoutCoordinates}
            className="px-4 py-2 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Save Layout Coordinates
          </button>

          <button
            onClick={executePipeline}
            disabled={executing}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {executing ? 'Running Flow...' : 'Execute Flow'}
          </button>
        </div>
      </header>

      {/* Main Grid split: Visual Grid Canvas & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* visual Graph Coordinates Grid (3/4 layout) */}
        <div className="lg:col-span-3 border border-white/5 bg-neutral-900/50 rounded-2xl h-[550px] relative overflow-hidden flex items-center justify-center">
          
          {/* Subtle Grid backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-70 pointer-events-none" />

          {/* Canvas Nodes Container */}
          <div className="absolute inset-0">
            {activePipeline.nodes.map((node) => (
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
                // Dynamic mouse movement binding (simplified for visual representation)
                onMouseMove={(e) => {
                  if (dragNodeId === node.id) {
                    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                    if (rect) {
                      const newX = Math.max(0, Math.min(rect.width - 220, e.clientX - rect.left - 100));
                      const newY = Math.max(0, Math.min(rect.height - 180, e.clientY - rect.top - 50));
                      updateNodePosition(node.id, newX, newY);
                    }
                  }
                }}
                className={`w-56 bg-neutral-900 border rounded-2xl p-4 shadow-2xl transition-shadow select-none ${
                  node.status === 'RUNNING'
                    ? 'border-blue-500/80 shadow-blue-500/5'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${
                    node.type === 'AI_QUALIFIER'
                      ? 'bg-violet-950/40 text-violet-400 border border-violet-500/20'
                      : 'bg-white/5 text-neutral-400'
                  }`}>
                    {node.type}
                  </span>
                  
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    node.status === 'COMPLETED' ? 'bg-emerald-500' :
                    node.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' :
                    'bg-neutral-600'
                  }`} />
                </div>

                <h3 className="font-semibold text-sm leading-tight text-white mb-1">
                  {node.name}
                </h3>
                <p className="text-[11px] text-neutral-400 mb-3">
                  Config: {JSON.stringify(node.config)}
                </p>

                <div className="border-t border-white/5 pt-2 flex justify-between items-center text-[10px] text-neutral-500 font-mono">
                  <span>Processed: {node.processed}</span>
                  {node.throughput > 0 && (
                    <span className="text-emerald-500 font-semibold">{node.throughput} lpm</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-4 left-4 bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-neutral-400 font-medium backdrop-blur-md">
            🖱️ Click and drag node cards around the grid to visually customize layout coordinates
          </div>
        </div>

        {/* Live System execution logs streams (1/4 layout) */}
        <div className="border border-white/5 bg-neutral-900/40 rounded-2xl p-6 h-[550px] flex flex-col backdrop-blur-sm">
          <h2 className="font-bold text-sm text-white mb-4 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
            AI Pipeline Execution Telemetry Logs
          </h2>

          <div className="flex-1 overflow-y-auto bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-xs text-neutral-400 space-y-2.5 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="text-neutral-600 italic flex items-center justify-center h-full text-center">
                Click "Execute Flow" above to activate crawler pipelines and stream telemetry metrics...
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed ${
                    log.startsWith('❌') ? 'text-red-400' :
                    log.startsWith('✔') ? 'text-emerald-400' :
                    log.includes('Starting') ? 'text-blue-400 font-semibold' : 'text-neutral-400'
                  }`}
                >
                  <span className="text-neutral-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                  {log}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-white/5 pt-4 mt-4 text-[10px] text-neutral-500 font-mono flex justify-between items-center">
            <span>Server status: Operational</span>
            <span>API Port: 5000</span>
          </div>
        </div>

      </div>
    </div>
  );
};
