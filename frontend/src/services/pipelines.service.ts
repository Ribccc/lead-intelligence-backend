import apiClient from '../api/client';
import { Pipeline } from '../api/types';

export interface PipelineExecutionResponse {
  message: string;
  pipelineId: string;
  taskId?: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  avgVelocityLpm: number;
  activeEnginesCount: number;
  logs: string[];
}

export interface PipelineStatusResponse {
  pipelineId: string;
  pipelineName: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'IDLE';
  crawlProgress: number;
  leadsDiscovered: number;
  logs: string[];
  nodeStates: Array<{
    id: string;
    type: string;
    name: string;
    status: string;
    processed: number;
  }>;
  effects?: any;
  error?: string;
  updatedAt: string;
}

export class PipelinesService {
  static async listPipelines(workspaceId: string): Promise<Pipeline[]> {
    const response = await apiClient.get<Pipeline[]>(`/pipelines?workspaceId=${workspaceId}`);
    return response.data;
  }

  static async createPipeline(pipelineData: Partial<Pipeline>): Promise<Pipeline> {
    const response = await apiClient.post<Pipeline>('/pipelines', pipelineData);
    return response.data;
  }

  static async saveNodeCoordinates(
    pipelineId: string,
    nodes: Array<{ id: string; x: number; y: number }>
  ): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>(
      `/pipelines/${pipelineId}/layout`,
      { nodes }
    );
    return response.data;
  }

  static async executePipeline(pipelineId: string): Promise<PipelineExecutionResponse> {
    const response = await apiClient.post<PipelineExecutionResponse>(
      `/pipelines/${pipelineId}/execute`
    );
    return response.data;
  }

  static async getPipelineStatus(pipelineId: string): Promise<PipelineStatusResponse> {
    const response = await apiClient.get<PipelineStatusResponse>(
      `/pipelines/${pipelineId}/status`
    );
    return response.data;
  }
}
