import { apiClient } from './client';

export interface ObjectiveTemplate {
  id: string;
  text: string;
  category: string | null;
  locale: string;
  active: boolean;
  sortOrder: number;
  differentiatorIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateObjectiveTemplateRequest {
  text: string;
  category?: string;
  sortOrder?: number;
}

export interface UpdateObjectiveTemplateRequest {
  text?: string;
  category?: string | null;
  active?: boolean;
  sortOrder?: number;
}

export async function getObjectiveTemplates(): Promise<ObjectiveTemplate[]> {
  const res = await apiClient.get<ObjectiveTemplate[]>('/objective-templates');
  return res.data;
}

export async function createObjectiveTemplate(data: CreateObjectiveTemplateRequest): Promise<ObjectiveTemplate> {
  const res = await apiClient.post<ObjectiveTemplate>('/objective-templates', data);
  return res.data;
}

export async function updateObjectiveTemplate(id: string, data: UpdateObjectiveTemplateRequest): Promise<ObjectiveTemplate> {
  const res = await apiClient.patch<ObjectiveTemplate>(`/objective-templates/${id}`, data);
  return res.data;
}

export async function deactivateObjectiveTemplate(id: string): Promise<void> {
  await apiClient.delete(`/objective-templates/${id}`);
}

export async function setObjectiveDifferentiators(id: string, differentiatorIds: string[]): Promise<void> {
  await apiClient.put(`/objective-templates/${id}/differentiators`, { differentiatorIds });
}
