import apiClient from '../api/client';
import { Campaign, CampaignStep } from '../api/types';

export interface CampaignDetailsResponse extends Campaign {
  steps: CampaignStep[];
  leads: Array<{
    leadId: string;
    companyName: string;
    currentStep: number;
    lastStatus: string;
    updatedAt: string;
  }>;
}

export class OutreachService {
  static async listCampaigns(workspaceId: string): Promise<Campaign[]> {
    const response = await apiClient.get<Campaign[]>(`/campaigns?workspaceId=${workspaceId}`);
    return response.data;
  }

  static async getCampaignDetails(id: string): Promise<CampaignDetailsResponse> {
    const response = await apiClient.get<CampaignDetailsResponse>(`/campaigns/${id}`);
    return response.data;
  }

  static async createCampaign(campaignData: {
    workspaceId: string;
    name: string;
    steps?: Array<Partial<CampaignStep>>;
  }): Promise<Campaign> {
    const response = await apiClient.post<Campaign>('/campaigns', campaignData);
    return response.data;
  }

  static async saveCampaignSteps(
    campaignId: string,
    steps: Array<{
      stepIndex: number;
      type: string;
      name: string;
      config: any;
    }>
  ): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>(
      `/campaigns/${campaignId}/steps`,
      { steps }
    );
    return response.data;
  }

  static async toggleCampaign(id: string): Promise<{ message: string; isActive: boolean }> {
    const response = await apiClient.post<{ message: string; isActive: boolean }>(
      `/campaigns/${id}/toggle`
    );
    return response.data;
  }
}
