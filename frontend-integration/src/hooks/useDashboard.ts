import { useState, useEffect, useCallback } from 'react';
import { DashboardService } from '../services/dashboard.service';
import { KPIs, ChartCoordinate, ActivityFeedItem } from '../api/types';

export function useDashboard(workspaceId: string) {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [chartData, setChartData] = useState<ChartCoordinate[]>([]);
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const [kpiData, chartDataResponse, feedData] = await Promise.all([
        DashboardService.getKPIs(workspaceId),
        DashboardService.getConversionChart(),
        DashboardService.getActivitiesFeed(workspaceId)
      ]);

      setKpis(kpiData);
      setChartData(chartDataResponse.growthSeries);
      setActivities(feedData);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error fetching dashboard stats');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    kpis,
    chartData,
    activities,
    loading,
    error,
    refreshDashboard: fetchDashboardData
  };
}
