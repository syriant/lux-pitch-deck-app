import { apiClient } from './client';

export interface PcmOverviewRow {
  userId: string;
  name: string;
  email: string;
  region: string | null;
  roles: string[];
  active: boolean;
  decksCreated: number;
  exportsPptx: number;
  exportsPdf: number;
  exportsSalesforce: number;
  decksExported: number;
  avgHoursToFirstExport: number | null;
  aiCalls: number;
  aiCostUsd: number;
  decksLinkedToSf: number;
  decksSentToSf: number;
  decksWon: number;
  conversionRate: number | null;
  lastActiveAt: string | null;
}

export interface AnalyticsOverviewResponse {
  data: PcmOverviewRow[];
  sfLastSyncedAt: string | null;
}

export interface TimeseriesBucket {
  date: string;
  decksCreated: number;
  exports: number;
  previews: number;
  logins: number;
  activeUsers: number;
}

export interface AnalyticsFunnel {
  created: number;
  previewed: number;
  exported: number;
  linkedToSf: number;
  sentToSf: number;
  won: number;
}

export interface StageSyncResult {
  linkedDecks: number;
  updated: number;
  missingInSalesforce: number;
  skipped?: string;
}

export interface AnalyticsRangeParams {
  from?: string;
  to?: string;
}

export async function getAnalyticsOverview(params?: AnalyticsRangeParams): Promise<AnalyticsOverviewResponse> {
  const res = await apiClient.get<AnalyticsOverviewResponse>('/admin/analytics/overview', { params });
  return res.data;
}

export async function getAnalyticsTimeseries(
  params?: AnalyticsRangeParams & { interval?: 'day' | 'week' | 'month' },
): Promise<TimeseriesBucket[]> {
  const res = await apiClient.get<TimeseriesBucket[]>('/admin/analytics/timeseries', { params });
  return res.data;
}

export async function getAnalyticsFunnel(params?: AnalyticsRangeParams): Promise<AnalyticsFunnel> {
  const res = await apiClient.get<AnalyticsFunnel>('/admin/analytics/funnel', { params });
  return res.data;
}

export async function syncSalesforceStages(): Promise<StageSyncResult> {
  const res = await apiClient.post<StageSyncResult>('/admin/analytics/salesforce/sync');
  return res.data;
}

// Fire-and-forget: analytics must never disturb the preview flow.
export async function recordPreviewEvent(deckId: string): Promise<void> {
  try {
    await apiClient.post('/analytics/events', { eventType: 'deck_previewed', deckId });
  } catch {
    // Ignore — never surface analytics failures to the PCM.
  }
}
