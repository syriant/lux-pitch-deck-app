import { apiClient } from './client';

export type LlmProvider = 'anthropic' | 'openai' | 'google';

export interface LlmProviderModel {
  id: string;
  provider: LlmProvider;
  modelId: string;
  displayName: string;
  inputCostPerMtok: string | null;
  outputCostPerMtok: string | null;
  cacheReadCostPerMtok: string | null;
  notes: string | null;
  lastValidatedAt: string | null;
  lastValidationSuccess: boolean | null;
  lastValidationError: string | null;
  lastValidationLatencyMs: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LlmSetting {
  key: string;
  description: string | null;
  primaryModelId: string;
  fallbackModelId: string | null;
  temperature: string;
  maxTokens: number;
  systemPrompt: string;
  userPromptTemplate: string;
  updatedAt: string;
  primaryModel: LlmProviderModel | null;
  fallbackModel: LlmProviderModel | null;
}

export interface UpdateLlmSettingRequest {
  description?: string | null;
  primaryModelId?: string;
  fallbackModelId?: string | null;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  userPromptTemplate?: string;
}

export interface CreateProviderModelRequest {
  provider: LlmProvider;
  modelId: string;
  displayName: string;
  inputCostPerMtok?: number | null;
  outputCostPerMtok?: number | null;
  cacheReadCostPerMtok?: number | null;
  notes?: string | null;
}

export type UpdateProviderModelRequest = Partial<CreateProviderModelRequest>;

export interface LlmUsageRow {
  id: string;
  settingKey: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: string | null;
  latencyMs: number | null;
  success: number;
  errorMessage: string | null;
  context: Record<string, unknown> | null;
  userId: string | null;
  createdAt: string;
}

export interface LlmUsageResponse {
  data: LlmUsageRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totals: {
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      cacheCreationTokens: number;
      costUsd: number;
    };
  };
}

// Settings
export async function listLlmSettings(): Promise<LlmSetting[]> {
  const res = await apiClient.get<LlmSetting[]>('/admin/llm/settings');
  return res.data;
}

export async function getLlmSetting(key: string): Promise<LlmSetting> {
  const res = await apiClient.get<LlmSetting>(`/admin/llm/settings/${key}`);
  return res.data;
}

export async function updateLlmSetting(key: string, data: UpdateLlmSettingRequest): Promise<LlmSetting> {
  const res = await apiClient.patch<LlmSetting>(`/admin/llm/settings/${key}`, data);
  return res.data;
}

// Provider models
export async function listLlmProviderModels(provider?: string): Promise<LlmProviderModel[]> {
  const res = await apiClient.get<LlmProviderModel[]>('/admin/llm/models', {
    params: provider ? { provider } : undefined,
  });
  return res.data;
}

export async function createLlmProviderModel(data: CreateProviderModelRequest): Promise<LlmProviderModel> {
  const res = await apiClient.post<LlmProviderModel>('/admin/llm/models', data);
  return res.data;
}

export async function updateLlmProviderModel(id: string, data: UpdateProviderModelRequest): Promise<LlmProviderModel> {
  const res = await apiClient.patch<LlmProviderModel>(`/admin/llm/models/${id}`, data);
  return res.data;
}

export async function deleteLlmProviderModel(id: string): Promise<void> {
  await apiClient.delete(`/admin/llm/models/${id}`);
}

export async function pingLlmProviderModel(id: string): Promise<LlmProviderModel> {
  const res = await apiClient.post<LlmProviderModel>(`/admin/llm/models/${id}/ping`);
  return res.data;
}

// Usage
export async function listLlmUsage(params?: {
  settingKey?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<LlmUsageResponse> {
  const res = await apiClient.get<LlmUsageResponse>('/admin/llm/usage', { params });
  return res.data;
}
