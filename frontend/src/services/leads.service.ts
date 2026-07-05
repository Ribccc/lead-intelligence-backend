import apiClient from '../api/client';
import { Lead, OutreachDraft, CrawlJob } from '../api/types';

export interface GetLeadsParams {
  workspaceId: string;
  status?: string;
  search?: string;
  country?: string;
  state?: string;
  city?: string;
  industry?: string;
  hiringDepartment?: string;
  fundingStage?: string;
  revenueRange?: string;
  minEmployees?: number;
  maxEmployees?: number;
  hiringStatus?: string;
  subIndustry?: string;
  technology?: string;
  minScore?: number;
  maxScore?: number;
}

export class LeadsService {
  static async listLeads(params: GetLeadsParams): Promise<Lead[]> {
    const { workspaceId, status, search, country, state, city, industry, subIndustry, technology, minScore, maxScore, hiringDepartment, fundingStage, revenueRange, minEmployees, maxEmployees, hiringStatus } = params;
    let url = `/leads?workspaceId=${workspaceId}`;
    if (status) url += `&status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (country) url += `&country=${encodeURIComponent(country)}`;
    if (state) url += `&state=${encodeURIComponent(state)}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    if (industry) url += `&industry=${encodeURIComponent(industry)}`;
    if (hiringDepartment) url += `&hiringDepartment=${encodeURIComponent(hiringDepartment)}`;
    if (subIndustry) url += `&subIndustry=${encodeURIComponent(subIndustry)}`;
    if (technology) url += `&technology=${encodeURIComponent(technology)}`;
    if (minScore !== undefined) url += `&minScore=${minScore}`;
    if (maxScore !== undefined) url += `&maxScore=${maxScore}`;
    if (fundingStage) url += `&fundingStage=${encodeURIComponent(fundingStage)}`;
    if (revenueRange) url += `&revenueRange=${encodeURIComponent(revenueRange)}`;
    if (minEmployees !== undefined) url += `&minEmployees=${minEmployees}`;
    if (maxEmployees !== undefined) url += `&maxEmployees=${maxEmployees}`;
    if (hiringStatus) url += `&hiringStatus=${encodeURIComponent(hiringStatus)}`;

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

  static async enrichLead(id: string): Promise<Lead> {
    const response = await apiClient.post<Lead>(`/leads/${id}/enrich`);
    return response.data;
  }

  static async discoverLeads(filters: any): Promise<any> {
    const response = await apiClient.post<any>('/leads/discover', filters);
    return response.data;
  }

  static async getDiscoveryStats(workspaceId: string): Promise<any> {
    const response = await apiClient.get<any>(`/leads/discovery/stats?workspaceId=${workspaceId}`);
    return response.data;
  }

  static async bulkQualify(leadIds: string[]): Promise<any> {
    const response = await apiClient.post<any>('/leads/bulk-qualify', { leadIds });
    return response.data;
  }

  static async bulkReject(leadIds: string[]): Promise<any> {
    const response = await apiClient.post<any>('/leads/bulk-reject', { leadIds });
    return response.data;
  }

  static async cleanAndRecrawl(workspaceId: string): Promise<any> {
    const response = await apiClient.post<any>('/leads/clean-and-recrawl', { workspaceId });
    return response.data;
  }

  static async startCrawl(url: string, workspaceId: string): Promise<CrawlJob> {
    const response = await apiClient.post<CrawlJob>('/leads/crawl', { url, workspaceId });
    return response.data;
  }

  static async getCrawlStatus(jobId: string): Promise<CrawlJob> {
    const response = await apiClient.get<CrawlJob>(`/leads/crawl/${jobId}`);
    return response.data;
  }

  static async getCrawlResults(jobId: string): Promise<Lead> {
    const response = await apiClient.get<Lead>(`/leads/crawl/${jobId}/results`);
    return response.data;
  }

  static async getCountries(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/leads/locations/countries');
    return response.data;
  }

  static async getStates(country: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/leads/locations/states?country=${encodeURIComponent(country)}`);
    return response.data;
  }

  static async getCities(country: string, state: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/leads/locations/cities?country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`);
    return response.data;
  }

  static async discoverByLocation(params: { country: string; state: string; city: string; workspaceId: string }): Promise<{ status: string; existingCount: number; triggeredJobs: any[] }> {
    const response = await apiClient.post<{ status: string; existingCount: number; triggeredJobs: any[] }>('/leads/discover/location', params);
    return response.data;
  }

  static async getIndustries(workspaceId: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/leads/filters/industries?workspaceId=${workspaceId}`);
    return response.data;
  }

  static async getSubIndustries(workspaceId: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/leads/filters/sub-industries?workspaceId=${workspaceId}`);
    return response.data;
  }

  static async getFundingStages(workspaceId: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/leads/filters/funding-stages?workspaceId=${workspaceId}`);
    return response.data;
  }

  static async getRevenueRanges(workspaceId: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/leads/filters/revenue-ranges?workspaceId=${workspaceId}`);
    return response.data;
  }

  static async getHiringStatuses(workspaceId: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/leads/filters/hiring-statuses?workspaceId=${workspaceId}`);
    return response.data;
  }

  static async getTechnologies(workspaceId: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/leads/filters/technologies?workspaceId=${workspaceId}`);
    return response.data;
  }

  static async getDepartments(workspaceId: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/leads/filters/departments?workspaceId=${workspaceId}`);
    return response.data;
  }
}

