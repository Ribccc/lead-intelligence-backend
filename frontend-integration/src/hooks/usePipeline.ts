import { useState, useEffect, useCallback } from 'react';
import { PipelinesService, PipelineExecutionResponse } from '../services/pipelines.service';
import { Pipeline, PipelineNode } from '../api/types';

export function usePipeline(workspaceId: string) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [execResult, setExecResult] = useState<PipelineExecutionResponse | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      setError(err.response?.data?.error || err.message || 'Error fetching visual pipelines');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  // Handle local node coordinates dragging mapping immediately, saving debounced values
  const updateNodePosition = (nodeId: string, x: number, y: number) => {
    if (!activePipeline) return;

    // Local state updates instantly to render 60fps animations
    const updatedNodes = activePipeline.nodes.map(n => 
      n.id === nodeId ? { ...n, x, y } : n
    );
    setActivePipeline({ ...activePipeline, nodes: updatedNodes });
  };

  // Persists visual drag positioning coords to database
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
    try {
      const result = await PipelinesService.executePipeline(activePipeline.id);
      setExecResult(result);
      
      // Stream pipeline execution log details step by step
      let logIndex = 0;
      const interval = setInterval(() => {
        if (logIndex < result.logs.length) {
          setLogs(prev => [...prev, result.logs[logIndex]]);
          logIndex++;
        } else {
          clearInterval(interval);
        }
      }, 800);
      
      // Update local nodes state status to RUNNING
      const runningNodes = activePipeline.nodes.map(n => ({ ...n, status: 'RUNNING' as const }));
      setActivePipeline({ ...activePipeline, nodes: runningNodes });

    } catch (err: any) {
      console.error('Error launching visual flow execution:', err);
      setLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    } finally {
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
    updateNodePosition,
    saveLayoutCoordinates,
    executePipeline,
    refreshPipelines: fetchPipelines
  };
}
