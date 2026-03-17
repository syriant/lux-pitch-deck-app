import { apiClient } from './client';

export interface Differentiator {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  locale: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDifferentiatorRequest {
  title: string;
  description?: string;
  category?: string;
  sortOrder?: number;
}

export interface UpdateDifferentiatorRequest {
  title?: string;
  description?: string | null;
  category?: string | null;
  active?: boolean;
  sortOrder?: number;
}

export async function getDifferentiators(): Promise<Differentiator[]> {
  const res = await apiClient.get<Differentiator[]>('/differentiators');
  return res.data;
}

export async function createDifferentiator(data: CreateDifferentiatorRequest): Promise<Differentiator> {
  const res = await apiClient.post<Differentiator>('/differentiators', data);
  return res.data;
}

export async function updateDifferentiator(id: string, data: UpdateDifferentiatorRequest): Promise<Differentiator> {
  const res = await apiClient.patch<Differentiator>(`/differentiators/${id}`, data);
  return res.data;
}

export async function deactivateDifferentiator(id: string): Promise<void> {
  await apiClient.delete(`/differentiators/${id}`);
}
