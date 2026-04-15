import { apiClient } from './client';

export interface TableauDealMetrics {
  revenue?: number;
  adr?: number;
  roomNights?: number;
  bookings?: number;
  alos?: number;
  leadTime?: number;
  packagesSold?: number;
  upgradePercentage?: number;
  roomTypeBreakdowns?: { roomType: string; count: number; percentage: number }[];
  customerRegions?: { region: string; percentage: number }[];
}

export async function fetchTableauMetrics(dealId: string): Promise<TableauDealMetrics> {
  const res = await apiClient.get<{ dealId: string; metrics: TableauDealMetrics }>(
    `/tableau/metrics/${encodeURIComponent(dealId)}`,
  );
  return res.data.metrics;
}

export async function refreshCaseStudyMetrics(caseStudyId: string): Promise<void> {
  await apiClient.post(`/tableau/refresh/${caseStudyId}`);
}
