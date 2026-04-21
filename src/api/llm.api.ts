import { apiClient } from './client';

export interface LlmSetting {
  key: string;
  description: string | null;
  provider: string;
  model: string;
  temperature: string;
  maxTokens: number;
  systemPrompt: string;
  userPromptTemplate: string;
  inputCostPerMtok: string | null;
  outputCostPerMtok: string | null;
  updatedAt: string;
}

export interface UpdateLlmSettingRequest {
  description?: string | null;
  provider?: 'anthropic' | 'openai';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  userPromptTemplate?: string;
  inputCostPerMtok?: number | null;
  outputCostPerMtok?: number | null;
}

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
