import apiClient from '../api/client';
import { Integration } from '../api/types';

export class CRMService {
  static async listIntegrations(workspaceId: string): Promise<Integration[]> {
    const response = await apiClient.get<Integration[]>(`/integrations?workspaceId=${workspaceId}`);
    return response.data;
  }

  static async triggerSync(id: string): Promise<{
    message: string;
    integrationId: string;
    status: 'SYNCING';
    approxDurationSeconds: number;
  }> {
    const response = await apiClient.post<{
      message: string;
      integrationId: string;
      status: 'SYNCING';
      approxDurationSeconds: number;
    }>(`/integrations/${id}/sync`);
    return response.data;
  }
}
