import { apiClient } from './client';

export interface ReachStat {
  region: string;
  label: string;
  displayOrder: number;
  updatedAt: string;
}

export interface UpdateReachStatRequest {
  label: string;
  displayOrder?: number;
}

export async function getReachStats(): Promise<ReachStat[]> {
  const res = await apiClient.get<ReachStat[]>('/reach-stats');
  return res.data;
}

export async function updateReachStat(region: string, data: UpdateReachStatRequest): Promise<ReachStat> {
  const res = await apiClient.put<ReachStat>(`/reach-stats/${encodeURIComponent(region)}`, data);
  return res.data;
}
