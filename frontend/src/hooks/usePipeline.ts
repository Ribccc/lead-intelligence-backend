import { useState, useEffect, useCallback, useRef } from 'react';
import { PipelinesService, PipelineExecutionResponse } from '../services/pipelines.service';
import { Pipeline, PipelineNodeStatus } from '../api/types';

export function usePipeline(workspaceId: string) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [execResult, setExecResult] = useState<PipelineExecutionResponse | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pipelineEffects, setPipelineEffects] = useState<any>(null);

  // Polling ref — cleared when pipeline reaches terminal state
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPipelineIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const fetchPipelines = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await PipelinesService.listPipelines(workspaceId);
      setPipelines(data);
      if (data.length > 0) {
        setActivePipeline(data[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error fetching visual pipelines');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  /**
   * Poll GET /pipelines/{id}/status every 3 seconds while QUEUED or RUNNING.
   * Updates logs, node states, and executing flag from real backend data.
   */
  const startPolling = useCallback((pipelineId: string) => {
    stopPolling();
    currentPipelineIdRef.current = pipelineId;

    const poll = async () => {
      if (currentPipelineIdRef.current !== pipelineId) return;
      try {
        const statusData = await PipelinesService.getPipelineStatus(pipelineId);

        // Update logs from real Redis data
        if (statusData.logs && statusData.logs.length > 0) {
          setLogs(statusData.logs.filter((l: any): l is string => typeof l === 'string'));
        }

        if (statusData.effects) {
          setPipelineEffects(statusData.effects);
        }

        // Update node statuses in the active pipeline graph
        if (statusData.nodeStates && activePipeline) {
          setActivePipeline(prev => {
            if (!prev) return prev;
            const updatedNodes = prev.nodes.map(node => {
              const liveState = statusData.nodeStates.find((ns: any) => ns.id === node.id);
              if (liveState) {
                return { ...node, status: liveState.status as PipelineNodeStatus, processed: liveState.processed };
              }
              return node;
            });
            return { ...prev, nodes: updatedNodes };
          });
        }

        // Stop polling on terminal states
        if (statusData.status === 'COMPLETED' || statusData.status === 'FAILED') {
          stopPolling();
          setExecuting(false);

          if (statusData.status === 'COMPLETED') {
            setLogs(prev => {
              const last = `✔ Pipeline complete — ${statusData.leadsDiscovered || 0} signals/leads discovered.`;
              return prev.includes(last) ? prev : [...prev, last];
            });
            // Refresh pipeline to get final node states
            fetchPipelines();
          }

          if (statusData.status === 'FAILED') {
            setError(statusData.error || 'Pipeline execution failed');
          }
        }
      } catch (err: any) {
        // Don't crash polling on transient errors — just log
        console.warn('[usePipeline] Status poll error:', err.message);
      }
    };

    // Immediate first poll
    poll();
    pollIntervalRef.current = setInterval(poll, 3000);
  }, [activePipeline, stopPolling, fetchPipelines]);

  const updateNodePosition = (nodeId: string, x: number, y: number) => {
    if (!activePipeline) return;
    const updatedNodes = activePipeline.nodes.map(n =>
      n.id === nodeId ? { ...n, x, y } : n
    );
    setActivePipeline({ ...activePipeline, nodes: updatedNodes });
  };

  const saveLayoutCoordinates = async () => {
    if (!activePipeline) return;
    try {
      const coords = activePipeline.nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
      await PipelinesService.saveNodeCoordinates(activePipeline.id, coords);
    } catch (err) {
      console.error('Error saving pipeline visual layout coordinates:', err);
    }
  };

  const executePipeline = async () => {
    if (!activePipeline) return;
    setExecuting(true);
    setLogs([]);
    setExecResult(null);
    setError(null);

    try {
      const result = await PipelinesService.executePipeline(activePipeline.id);
      setExecResult(result);

      // Show the initial QUEUED logs immediately
      if (result.logs && result.logs.length > 0) {
        setLogs(result.logs.filter((l: any): l is string => typeof l === 'string'));
      }

      // Set all nodes to RUNNING in the UI immediately
      const runningNodes = activePipeline.nodes.map(n => ({ ...n, status: 'RUNNING' as const }));
      setActivePipeline({ ...activePipeline, nodes: runningNodes });

      // Start real polling against /status
      startPolling(activePipeline.id);

    } catch (err: any) {
      console.error('Error launching visual flow execution:', err);
      const msg = err.response?.data?.detail || err.message || 'Execution failed';
      setLogs([`❌ Error: ${msg}`]);
      setExecuting(false);
    }
  };

  return {
    pipelines,
    activePipeline,
    loading,
    executing,
    execResult,
    logs,
    error,
    pipelineEffects,
    updateNodePosition,
    saveLayoutCoordinates,
    executePipeline,
    refreshPipelines: fetchPipelines
  };
}
