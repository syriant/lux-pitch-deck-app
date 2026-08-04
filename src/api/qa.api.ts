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

export type HygieneSeverity = 'warn' | 'info';
export type HygieneStatus = 'pass' | HygieneSeverity;

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

export interface CreateQaRuleRequest {
  key: string;
  name: string;
  prompt: string;
  sortOrder?: number;
}

/** Admin view of one hygiene check: registry metadata + stored overrides. */
export interface HygieneCheckConfig {
  key: string;
  defaultName: string;
  description: string;
  hasThreshold: boolean;
  thresholdLabel: string | null;
  defaultThreshold: number | null;
  /** Display name override; null = registry default. */
  name: string | null;
  enabled: boolean;
  severity: HygieneSeverity;
  /** Threshold override; null = registry default. */
  threshold: number | null;
  updatedAt: string | null;
}

export interface UpdateHygieneCheckRequest {
  name?: string | null;
  enabled?: boolean;
  severity?: HygieneSeverity;
  threshold?: number | null;
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

export async function createQaRule(data: CreateQaRuleRequest): Promise<QaRule> {
  const res = await apiClient.post<QaRule>('/admin/qa/rules', data);
  return res.data;
}

export async function deleteQaRule(key: string): Promise<void> {
  await apiClient.delete(`/admin/qa/rules/${key}`);
}

// Admin — hygiene check configuration
export async function listHygieneChecks(): Promise<HygieneCheckConfig[]> {
  const res = await apiClient.get<HygieneCheckConfig[]>('/admin/qa/hygiene');
  return res.data;
}

export async function updateHygieneCheck(
  key: string,
  data: UpdateHygieneCheckRequest,
): Promise<HygieneCheckConfig> {
  const res = await apiClient.patch<HygieneCheckConfig>(`/admin/qa/hygiene/${key}`, data);
  return res.data;
}
