import { apiClient } from './client';

export interface TemplateSlide {
  type: string;
  label: string;
  required?: boolean;
  perProperty?: boolean;
  removable?: boolean;
  config?: Record<string, unknown>;
}

export interface DeckTemplate {
  id: string;
  name: string;
  description: string | null;
  slides: TemplateSlide[];
  defaults: Record<string, string>;
  active: boolean;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  slides: TemplateSlide[];
  defaults?: Record<string, string>;
  sortOrder?: number;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string | null;
  slides?: TemplateSlide[];
  defaults?: Record<string, string> | null;
  active?: boolean;
  sortOrder?: number;
}

export async function getTemplates(): Promise<DeckTemplate[]> {
  const res = await apiClient.get<DeckTemplate[]>('/templates');
  return res.data;
}

export async function getAllTemplates(): Promise<DeckTemplate[]> {
  const res = await apiClient.get<DeckTemplate[]>('/templates/all');
  return res.data;
}

export async function getTemplate(id: string): Promise<DeckTemplate> {
  const res = await apiClient.get<DeckTemplate>(`/templates/${id}`);
  return res.data;
}

export async function createTemplate(data: CreateTemplateRequest): Promise<DeckTemplate> {
  const res = await apiClient.post<DeckTemplate>('/templates', data);
  return res.data;
}

export async function updateTemplate(id: string, data: UpdateTemplateRequest): Promise<DeckTemplate> {
  const res = await apiClient.patch<DeckTemplate>(`/templates/${id}`, data);
  return res.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`/templates/${id}`);
}
