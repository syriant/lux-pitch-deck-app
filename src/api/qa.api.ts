import { apiClient } from './client';

export type QaStatus = 'YES' | 'PARTIAL' | 'NO' | 'ERROR';

export interface QaFixOp {
  op: string;
  [key: string]: unknown;
}

export interface QaFix {
  applyable: boolean;
  summary: string;
  /** One or more concrete apply operations that together make the fix. */
  ops: QaFixOp[];
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
/** Fix-level roll-up: `partial` = some ops applied, some didn't. */
export type QaFixStatus = QaFixOutcome | 'partial';

export interface QaApplyOpResult {
  op: string;
  detail: string;
  status: QaFixOutcome;
  reason?: string;
}

export interface QaApplyFixResult {
  ruleKey: string;
  status: QaFixStatus;
  ops: QaApplyOpResult[];
  reason?: string;
}

export interface QaApplyResponse {
  runId: string;
  results: QaApplyFixResult[];
}

export type HygieneStatus = 'pass' | 'warn';

export interface HygieneCheck {
  key: string;
  name: string;
  status: HygieneStatus;
  detail: string;
}

export type ExportType = 'pptx' | 'pdf' | 'pdf_compressed' | 'salesforce';

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

export async function getHygiene(deckId: string): Promise<HygieneCheck[]> {
  const res = await apiClient.get<HygieneCheck[]>(`/decks/${deckId}/qa/hygiene`);
  return res.data;
}

export async function recordExportAck(
  deckId: string,
  body: { exportType: ExportType; warnings: HygieneCheck[] },
): Promise<{ id: string; createdAt: string }> {
  const res = await apiClient.post<{ id: string; createdAt: string }>(`/decks/${deckId}/qa/export-ack`, body);
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
