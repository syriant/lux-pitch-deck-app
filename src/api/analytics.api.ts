import { apiClient } from './client';

export interface PcmOverviewRow {
  userId: string;
  name: string;
  email: string;
  region: string | null;
  roles: string[];
  active: boolean;
  decksCreated: number;
  exportsPptx: number;
  exportsPdf: number;
  exportsSalesforce: number;
  decksExported: number;
  completedDecks: number;
  avgHoursToFirstExport: number | null;
  medianHoursToFirstExport: number | null;
  p90HoursToFirstExport: number | null;
  aiCalls: number;
  aiCostUsd: number;
  decksLinkedToSf: number;
  decksSentToSf: number;
  decksWon: number;
  conversionRate: number | null;
  lastActiveAt: string | null;
  lastDeckActivityAt: string | null;
}

export interface AnalyticsOverviewResponse {
  data: PcmOverviewRow[];
  sfLastSyncedAt: string | null;
  previousPeriod: PeriodTotals | null;
}

export interface TimeseriesBucket {
  date: string;
  decksCreated: number;
  exports: number;
  previews: number;
  logins: number;
  activeUsers: number;
}

export interface AnalyticsFunnel {
  created: number;
  previewed: number;
  exported: number;
  linkedToSf: number;
  sentToSf: number;
  won: number;
  /** When activity tracking began; null if nothing recorded yet. */
  trackingSince: string | null;
  /** Decks in range that predate tracking — preview/export state unknown. */
  untrackedDecks: number;
  /** Decks that existed under tracking with still no export recorded. */
  notExportedTracked: number;
}

export interface HotelConversionRow {
  hotel: string;
  destination: string | null;
  pitches: number;
  linked: number;
  sent: number;
  won: number;
  winRate: number | null;
  wonAmount: number;
  lastPitchedAt: string | null;
}

export interface PcmDeckRow {
  deckId: string;
  name: string;
  hotel: string | null;
  destination: string | null;
  createdAt: string;
  exports: number;
  lastExportAt: string | null;
  previewed: boolean;
  predatesTracking: boolean;
  salesforceOpportunityId: string | null;
  sfStageName: string | null;
  sfIsWon: boolean | null;
  aiCalls: number;
}

export interface PcmDetail {
  user: { id: string; name: string; email: string; region: string | null; roles: string[]; active: boolean };
  trackingSince: string | null;
  decks: PcmDeckRow[];
  aiByFeature: Array<{ feature: string; calls: number; costUsd: number }>;
  recentActivity: Array<{
    eventType: string;
    deckId: string | null;
    deckName: string | null;
    onOthersDeck: boolean;
    createdAt: string;
  }>;
}

export interface StageSyncResult {
  linkedDecks: number;
  updated: number;
  missingInSalesforce: number;
  skipped?: string;
}

export interface AnalyticsRangeParams {
  from?: string;
  to?: string;
  templateId?: string;
  locale?: string;
  region?: string;
}

export interface AnalyticsFacets {
  templates: Array<{ id: string; name: string }>;
  locales: string[];
  regions: string[];
}

export interface PeriodTotals {
  from: string;
  to: string;
  decks: number;
  exports: number;
  linked: number;
  sent: number;
  won: number;
  aiCostUsd: number;
}

export interface WizardStepFunnel {
  decksCreated: number;
  steps: Array<{ step: number; label: string; completed: number }>;
}

export interface AiUsageReport {
  features: Array<{
    feature: string;
    calls: number;
    failures: number;
    costUsd: number;
    avgLatencyMs: number;
    accepted: number;
    reverted: number;
    acceptanceRate: number | null;
  }>;
}

export interface QaAdoption {
  decks: number;
  decksReviewed: number;
  reviewedRate: number | null;
  avgRunsPerReviewedDeck: number;
  fixesOffered: number;
  fixesAccepted: number;
  fixAcceptanceRate: number | null;
  rules: Array<{
    ruleKey: string;
    ruleName: string;
    scored: number;
    yes: number;
    partial: number;
    no: number;
    fixesApplied: number;
  }>;
  exportOverrides: number;
  decksWithOverrides: number;
  overriddenChecks: Array<{ checkKey: string; checkName: string; overrides: number }>;
}

export interface ContentAnalytics {
  caseStudies: Array<{
    id: string;
    title: string;
    hotelName: string | null;
    destination: string | null;
    decks: number;
    linkedDecks: number;
    wonDecks: number;
  }>;
  objectives: Array<{ label: string; source: string | null; decks: number; primaryDecks: number }>;
  differentiators: Array<{ id: string; title: string; category: string | null; decks: number }>;
  templates: Array<{ label: string; decks: number }>;
  locales: Array<{ locale: string; decks: number; translatedDecks: number }>;
}

export interface InactiveUser {
  userId: string;
  name: string;
  email: string;
  region: string | null;
  roles: string[];
  active: boolean;
  decks: number;
  lastActiveAt: string | null;
  lastLoginAt: string | null;
  lastDeckActivityAt: string | null;
  dormant: boolean;
}

export interface InactiveUsersReport {
  sinceDays: number;
  dormant: InactiveUser[];
  neverCreatedADeck: InactiveUser[];
}

export type DeckDrillStage =
  | 'created'
  | 'previewed'
  | 'exported'
  | 'not_exported'
  | 'linked_to_sf'
  | 'not_linked_to_sf'
  | 'sent_to_sf'
  | 'linked_not_sent'
  | 'won';

export interface DeckDrillRow {
  deckId: string;
  name: string;
  hotel: string | null;
  destination: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
  updatedAt: string;
  exports: number;
  lastExportAt: string | null;
  previewed: boolean;
  predatesTracking: boolean;
  salesforceOpportunityId: string | null;
  sentToSf: boolean;
  sfStageName: string | null;
  sfIsWon: boolean | null;
}

export interface DeckDrillResult {
  trackingSince: string | null;
  excludedUntracked: boolean;
  decks: DeckDrillRow[];
}

export interface WeeklyDigest {
  periodFrom: string;
  periodTo: string;
  headline: Array<{ label: string; value: string; change?: string | null }>;
  topPcms: Array<{ name: string; pitches: number; exports: number }>;
  topHotels: Array<{ hotel: string; pitches: number; won: number }>;
  dormantPcms: string[];
  text: string;
}

export async function getAnalyticsOverview(params?: AnalyticsRangeParams): Promise<AnalyticsOverviewResponse> {
  const res = await apiClient.get<AnalyticsOverviewResponse>('/admin/analytics/overview', { params });
  return res.data;
}

export async function getAnalyticsTimeseries(
  params?: AnalyticsRangeParams & { interval?: 'day' | 'week' | 'month' },
): Promise<TimeseriesBucket[]> {
  const res = await apiClient.get<TimeseriesBucket[]>('/admin/analytics/timeseries', { params });
  return res.data;
}

export async function getAnalyticsFunnel(params?: AnalyticsRangeParams): Promise<AnalyticsFunnel> {
  const res = await apiClient.get<AnalyticsFunnel>('/admin/analytics/funnel', { params });
  return res.data;
}

export interface HotelConversionResponse {
  data: HotelConversionRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function getAnalyticsHotels(
  params?: AnalyticsRangeParams & { search?: string; page?: number; limit?: number; all?: boolean },
): Promise<HotelConversionResponse> {
  const res = await apiClient.get<HotelConversionResponse>('/admin/analytics/hotels', { params });
  return res.data;
}

export async function getPcmDetail(userId: string): Promise<PcmDetail> {
  const res = await apiClient.get<PcmDetail>(`/admin/analytics/pcm/${userId}`);
  return res.data;
}

export async function syncSalesforceStages(): Promise<StageSyncResult> {
  const res = await apiClient.post<StageSyncResult>('/admin/analytics/salesforce/sync');
  return res.data;
}

export async function getAnalyticsFacets(): Promise<AnalyticsFacets> {
  const res = await apiClient.get<AnalyticsFacets>('/admin/analytics/facets');
  return res.data;
}

export async function getQaAdoption(params?: AnalyticsRangeParams): Promise<QaAdoption> {
  const res = await apiClient.get<QaAdoption>('/admin/analytics/qa', { params });
  return res.data;
}

export async function getContentAnalytics(params?: AnalyticsRangeParams): Promise<ContentAnalytics> {
  const res = await apiClient.get<ContentAnalytics>('/admin/analytics/content', { params });
  return res.data;
}

export async function getWizardSteps(params?: AnalyticsRangeParams): Promise<WizardStepFunnel> {
  const res = await apiClient.get<WizardStepFunnel>('/admin/analytics/wizard-steps', { params });
  return res.data;
}

export async function getAiUsage(params?: AnalyticsRangeParams): Promise<AiUsageReport> {
  const res = await apiClient.get<AiUsageReport>('/admin/analytics/ai', { params });
  return res.data;
}

export async function getInactiveUsers(sinceDays = 30): Promise<InactiveUsersReport> {
  const res = await apiClient.get<InactiveUsersReport>('/admin/analytics/inactive-users', {
    params: { sinceDays },
  });
  return res.data;
}

export async function getDeckDrill(
  params: AnalyticsRangeParams & {
    hotel?: string;
    stage?: DeckDrillStage;
    includeUntracked?: boolean;
  },
): Promise<DeckDrillResult> {
  const res = await apiClient.get<DeckDrillResult>('/admin/analytics/decks', { params });
  return res.data;
}

export async function getWeeklyDigest(): Promise<WeeklyDigest> {
  const res = await apiClient.get<WeeklyDigest>('/admin/analytics/digest');
  return res.data;
}

// Fire-and-forget: analytics must never disturb the flow being measured, so
// every recorder below swallows its errors.
async function postEvent(body: Record<string, unknown>): Promise<void> {
  try {
    await apiClient.post('/analytics/events', body);
  } catch {
    // Ignore — never surface analytics failures to the PCM.
  }
}

export async function recordPreviewEvent(deckId: string): Promise<void> {
  return postEvent({ eventType: 'deck_previewed', deckId });
}

export async function recordWizardStep(deckId: string, step: number): Promise<void> {
  return postEvent({ eventType: 'wizard_step_completed', deckId, step });
}

export async function recordAiDecision(
  deckId: string,
  accepted: boolean,
  feature: string,
  fieldKey?: string,
): Promise<void> {
  return postEvent({
    eventType: accepted ? 'ai_accepted' : 'ai_reverted',
    deckId,
    feature,
    fieldKey,
  });
}
