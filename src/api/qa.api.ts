import { apiClient } from './client';

export type QaStatus = 'YES' | 'PARTIAL' | 'NO' | 'ERROR';

export interface QaFix {
  applyable: boolean;
  summary: string;
  /** v1: always null (suggest-and-apply lands in v2). */
  target: Record<string, unknown> | null;
}

export interface QaFinding {
  key: string;
  name: string;
  status: QaStatus;
  narrative: string;
  bullets: string[];
  fix?: QaFix | null;
}

export interface QaRun {
  id: string;
  deckId: string;
  findings: QaFinding[];
  priorityFixes: string[];
  createdAt: string;
}

export type QaFixOutcome = 'applied' | 'skipped' | 'rejected';

export interface QaApplyFixResult {
  ruleKey: string;
  op: string | null;
  status: QaFixOutcome;
  reason?: string;
}

export interface QaApplyResponse {
  runId: string;
  results: QaApplyFixResult[];
}

export interface QaRule {
  key: string;
  name: string;
  prompt: string;
  active: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface UpdateQaRuleRequest {
  name?: string;
  prompt?: string;
  active?: boolean;
  sortOrder?: number;
}

// PCM — QA over a deck
export async function runQa(deckId: string): Promise<QaRun> {
  const res = await apiClient.post<QaRun>(`/decks/${deckId}/qa`);
  return res.data;
}

export async function getLatestQa(deckId: string): Promise<QaRun | null> {
  const res = await apiClient.get<QaRun | null>(`/decks/${deckId}/qa/latest`);
  return res.data;
}

export async function listQaRuns(deckId: string): Promise<QaRun[]> {
  const res = await apiClient.get<QaRun[]>(`/decks/${deckId}/qa/runs`);
  return res.data;
}

export async function applyQaFixes(
  deckId: string,
  body: { runId: string; ruleKeys: string[] },
): Promise<QaApplyResponse> {
  const res = await apiClient.post<QaApplyResponse>(`/decks/${deckId}/qa/apply`, body);
  return res.data;
}

// Admin — editable rule prompts
export async function listQaRules(): Promise<QaRule[]> {
  const res = await apiClient.get<QaRule[]>('/admin/qa/rules');
  return res.data;
}

export async function updateQaRule(key: string, data: UpdateQaRuleRequest): Promise<QaRule> {
  const res = await apiClient.patch<QaRule>(`/admin/qa/rules/${key}`, data);
  return res.data;
}
