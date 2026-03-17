import { apiClient } from './client';

export interface DealTierRule {
  id: string;
  destination: string;
  subDestination: string | null;
  grade: string;
  gmThresholdLow: string | null;
  gmThresholdHigh: string | null;
  tier: number;
  examples: string | null;
  notes: string | null;
  assetEntitlements: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface LookupResult {
  destination: string;
  subDestination: string | null;
  grade: string;
  tier: number;
  examples: string | null;
  assetEntitlements: Record<string, string>;
}

export interface UploadResult {
  rulesImported: number;
}

export async function getDealTierRules(): Promise<DealTierRule[]> {
  const res = await apiClient.get<DealTierRule[]>('/deal-tiers/rules');
  return res.data;
}

export async function uploadDealTiers(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<UploadResult>('/deal-tiers/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function lookupDealTier(
  destination: string,
  subDestination: string | undefined,
  gm: number,
): Promise<LookupResult> {
  const params: Record<string, string> = { destination, gm: gm.toString() };
  if (subDestination) params.subDestination = subDestination;
  const res = await apiClient.get<LookupResult>('/deal-tiers/lookup', { params });
  return res.data;
}
