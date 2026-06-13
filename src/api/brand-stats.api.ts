import { apiClient } from './client';

export interface BrandStat {
  key: string;
  label: string;
  value: string;
  displayOrder: number;
  updatedAt: string;
}

export interface UpdateBrandStatRequest {
  value: string;
  label?: string;
  displayOrder?: number;
}

export async function getBrandStats(): Promise<BrandStat[]> {
  const res = await apiClient.get<BrandStat[]>('/brand-stats');
  return res.data;
}

export async function updateBrandStat(key: string, data: UpdateBrandStatRequest): Promise<BrandStat> {
  const res = await apiClient.put<BrandStat>(`/brand-stats/${encodeURIComponent(key)}`, data);
  return res.data;
}
