import apiClient from '../api/client';
import { Lead, OutreachDraft } from '../api/types';

export interface GetLeadsParams {
  workspaceId: string;
  status?: string;
  search?: string;
}

export class LeadsService {
  static async listLeads(params: GetLeadsParams): Promise<Lead[]> {
    const { workspaceId, status, search } = params;
    let url = `/leads?workspaceId=${workspaceId}`;
    if (status) url += `&status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const response = await apiClient.get<Lead[]>(url);
    return response.data;
  }

  static async getLeadDetails(id: string): Promise<Lead> {
    const response = await apiClient.get<Lead>(`/leads/${id}`);
    return response.data;
  }

  static async createLead(leadData: Partial<Lead>): Promise<Lead> {
    const response = await apiClient.post<Lead>('/leads', leadData);
    return response.data;
  }

  static async updateLead(id: string, leadData: Partial<Lead>): Promise<Lead> {
    const response = await apiClient.put<Lead>(`/leads/${id}`, leadData);
    return response.data;
  }

  static async deleteLead(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/leads/${id}`);
    return response.data;
  }

  static async generateOutreach(id: string): Promise<OutreachDraft> {
    const response = await apiClient.post<OutreachDraft>(`/leads/${id}/outreach`);
    return response.data;
  }
}
