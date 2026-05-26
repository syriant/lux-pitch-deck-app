import { apiClient } from './client';

export interface SalesforceStatus {
  configured: boolean;
}

export interface OpportunitySummary {
  id: string;
  opportunityName: string | null;
  hotelName: string | null;
  destination: string | null;
  hotelIntroduction: string | null;
  recordUrl: string | null;
}

export async function getSalesforceStatus(): Promise<SalesforceStatus> {
  const res = await apiClient.get<SalesforceStatus>('/salesforce/status');
  return res.data;
}

export async function fetchSalesforceOpportunity(id: string): Promise<OpportunitySummary> {
  const res = await apiClient.get<OpportunitySummary>(`/salesforce/opportunity/${encodeURIComponent(id)}`);
  return res.data;
}
