import apiClient from '../api/client';
import { KPIs, ChartCoordinate, ActivityFeedItem } from '../api/types';

export class DashboardService {
  static async getKPIs(workspaceId: string): Promise<KPIs> {
    const response = await apiClient.get<KPIs>(`/dashboards/kpis?workspaceId=${workspaceId}`);
    return response.data;
  }

  static async getConversionChart(): Promise<{ growthSeries: ChartCoordinate[]; summary: string }> {
    const response = await apiClient.get<{ growthSeries: ChartCoordinate[]; summary: string }>('/dashboards/conversion-chart');
    return response.data;
  }

  static async getActivitiesFeed(workspaceId: string): Promise<ActivityFeedItem[]> {
    const response = await apiClient.get<ActivityFeedItem[]>(`/dashboards/feed?workspaceId=${workspaceId}`);
    return response.data;
  }
}
