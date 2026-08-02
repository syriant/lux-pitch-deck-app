import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAnalyticsOverview, getAnalyticsTimeseries, getAnalyticsFunnel, getAnalyticsHotels,
  getAnalyticsFacets, syncSalesforceStages,
  type PcmOverviewRow, type TimeseriesBucket, type AnalyticsFunnel, type HotelConversionRow,
  type AnalyticsFacets, type PeriodTotals, type AnalyticsRangeParams,
} from '@/api/analytics.api';
import { PcmDetailDrawer } from '@/components/analytics/PcmDetailDrawer';
import { DeckListDrawer, type DeckDrillTarget } from '@/components/analytics/DeckListDrawer';
import { QaAdoptionPanel } from '@/components/analytics/QaAdoptionPanel';
import { ContentPanel } from '@/components/analytics/ContentPanel';
import { AdoptionPanel } from '@/components/analytics/AdoptionPanel';
import { DigestPanel } from '@/components/analytics/DigestPanel';
import { StatTile, deltaOf } from '@/components/analytics/shared';
import { toCsv, downloadCsv, type CsvColumn } from '@/lib/csv';

type TabKey = 'overview' | 'adoption' | 'content' | 'qa' | 'digest';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'adoption', label: 'Adoption' },
  { key: 'content', label: 'Content' },
  { key: 'qa', label: 'QA' },
  { key: 'digest', label: 'Digest' },
];

type RangeKey = '30d' | '90d' | 'all' | 'custom';

const RANGES: Array<{ key: RangeKey; label: string; days: number | null }> = [
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
  { key: 'custom', label: 'Custom', days: null },
];

// The admin's chosen period survives reloads — they tend to work in one window
// (a quarter, a campaign) across several visits.
const RANGE_STORAGE_KEY = 'lux-analytics-range';

interface StoredRange {
  range: RangeKey;
  customFrom: string;
  customTo: string;
  templateId: string;
  locale: string;
  region: string;
}

function loadStoredRange(): StoredRange {
  const fallback: StoredRange = {
    range: '90d', customFrom: '', customTo: '', templateId: '', locale: '', region: '',
  };
  try {
    const raw = localStorage.getItem(RANGE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredRange>;
    if (!RANGES.some((r) => r.key === parsed.range)) return fallback;
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    return {
      range: parsed.range as RangeKey,
      customFrom: str(parsed.customFrom),
      customTo: str(parsed.customTo),
      templateId: str(parsed.templateId),
      locale: str(parsed.locale),
      region: str(parsed.region),
    };
  } catch {
    return fallback;
  }
}

function rangeParams(key: RangeKey, customFrom: string, customTo: string): { from?: string; to?: string } {
  if (key === 'custom') {
    return {
      ...(customFrom ? { from: new Date(`${customFrom}T00:00:00`).toISOString() } : {}),
      // Inclusive of the end date the admin picked, not midnight at its start.
      ...(customTo ? { to: new Date(`${customTo}T23:59:59.999`).toISOString() } : {}),
    };
  }
  const range = RANGES.find((r) => r.key === key)!;
  if (!range.days) return {};
  const from = new Date();
  from.setDate(from.getDate() - range.days);
  return { from: from.toISOString() };
}

function rangeSlug(key: RangeKey, customFrom: string, customTo: string): string {
  if (key !== 'custom') return key;
  return `${customFrom || 'start'}_${customTo || 'today'}`;
}

function formatDuration(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Tracked activity where we have it, otherwise the deck history — a PCM who was
 * busy before activity tracking existed shouldn't read as "Never".
 */
function lastSeenCell(row: PcmOverviewRow): { text: string; title: string } {
  if (row.lastActiveAt) {
    return { text: formatWhen(row.lastActiveAt), title: 'Last tracked activity in the tool' };
  }
  if (row.lastDeckActivityAt) {
    return {
      text: formatWhen(row.lastDeckActivityAt),
      title: 'No tracked activity — showing when they last touched one of their decks',
    };
  }
  return { text: 'Never', title: 'No tracked activity and no decks' };
}

const PCM_CSV_COLUMNS: Array<CsvColumn<PcmOverviewRow>> = [
  { header: 'PCM', value: (r) => r.name },
  { header: 'Email', value: (r) => r.email },
  { header: 'Region', value: (r) => r.region },
  { header: 'Pitches', value: (r) => r.decksCreated },
  { header: 'Exports PPTX', value: (r) => r.exportsPptx },
  { header: 'Exports PDF', value: (r) => r.exportsPdf },
  { header: 'Exports Salesforce', value: (r) => r.exportsSalesforce },
  { header: 'Decks exported', value: (r) => r.decksExported },
  { header: 'Decks exported (timing sample)', value: (r) => r.completedDecks },
  { header: 'Median hours to first export', value: (r) => r.medianHoursToFirstExport },
  { header: 'p90 hours to first export', value: (r) => r.p90HoursToFirstExport },
  { header: 'Avg hours to first export', value: (r) => r.avgHoursToFirstExport },
  { header: 'AI calls', value: (r) => r.aiCalls },
  { header: 'AI cost USD', value: (r) => r.aiCostUsd },
  { header: 'Decks linked to SF', value: (r) => r.decksLinkedToSf },
  { header: 'Decks sent to SF', value: (r) => r.decksSentToSf },
  { header: 'Closed won', value: (r) => r.decksWon },
  { header: 'Conversion %', value: (r) => r.conversionRate },
  { header: 'Last active', value: (r) => r.lastActiveAt },
];

const HOTEL_CSV_COLUMNS: Array<CsvColumn<HotelConversionRow>> = [
  { header: 'Hotel', value: (r) => r.hotel },
  { header: 'Destination', value: (r) => r.destination },
  { header: 'Pitches', value: (r) => r.pitches },
  { header: 'Linked to SF', value: (r) => r.linked },
  { header: 'Sent to SF', value: (r) => r.sent },
  { header: 'Closed won', value: (r) => r.won },
  { header: 'Win rate %', value: (r) => r.winRate },
  { header: 'Won amount', value: (r) => r.wonAmount },
  { header: 'Last pitched', value: (r) => r.lastPitchedAt },
];

function FunnelBar({ label, value, max, onDrill, gap }: {
  label: string;
  value: number;
  max: number;
  onDrill?: () => void;
  /** The "didn't get here" count, offered as its own chase list. */
  gap?: { label: string; count: number; onDrill: () => void };
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-40 shrink-0 text-gray-600">{label}</div>
      <button
        type="button"
        onClick={onDrill}
        disabled={!onDrill || value === 0}
        className="h-5 flex-1 rounded bg-gray-100 disabled:cursor-default"
        title={onDrill && value > 0 ? `${label}: ${value} — click to list these decks` : `${label}: ${value}`}
      >
        <div className="h-5 rounded bg-[#01B18B]" style={{ width: `${pct}%` }} />
      </button>
      <div className="w-12 shrink-0 text-right font-medium text-gray-900">{value}</div>
      <div className="w-28 shrink-0 text-right">
        {gap && gap.count > 0 && (
          <button
            type="button"
            onClick={gap.onDrill}
            className="text-xs text-[#01B18B] hover:underline"
            title={`List the ${gap.count} decks that ${gap.label}`}
          >
            {gap.count} {gap.label}
          </button>
        )}
      </div>
    </div>
  );
}

function MiniBarChart({ title, buckets, pick, emptyLabel }: {
  title: string;
  buckets: TimeseriesBucket[];
  pick: (b: TimeseriesBucket) => number;
  emptyLabel: string;
}) {
  const max = Math.max(...buckets.map(pick), 1);
  // All-zero buckets would render an empty plot area with axis labels, which
  // reads as broken rather than "nothing yet".
  const isEmpty = buckets.length === 0 || buckets.every((b) => pick(b) === 0);
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-medium text-gray-900">{title}</div>
      {isEmpty ? (
        <div className="flex h-24 items-center justify-center text-xs text-gray-400">{emptyLabel}</div>
      ) : (
        <div className="flex h-24 items-end gap-1">
          {buckets.map((b) => {
            const value = pick(b);
            const week = new Date(b.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
            return (
              <div
                key={b.date}
                className="group relative flex-1 self-stretch flex items-end"
                title={`Week of ${week}: ${value}`}
              >
                <div
                  className="w-full rounded-t bg-[#01B18B] transition-opacity group-hover:opacity-75"
                  style={{ height: `${(value / max) * 100}%`, minHeight: value > 0 ? '3px' : '0' }}
                />
              </div>
            );
          })}
        </div>
      )}
      {!isEmpty && (
        <div className="mt-1 flex justify-between text-[10px] text-gray-400">
          <span>{new Date(buckets[0].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
          <span>{new Date(buckets[buckets.length - 1].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
        </div>
      )}
    </div>
  );
}

export function Analytics() {
  const stored = loadStoredRange();
  const [range, setRange] = useState<RangeKey>(stored.range);
  const [customFrom, setCustomFrom] = useState(stored.customFrom);
  const [customTo, setCustomTo] = useState(stored.customTo);
  const [rows, setRows] = useState<PcmOverviewRow[]>([]);
  const [hotels, setHotels] = useState<HotelConversionRow[]>([]);
  const [hotelMeta, setHotelMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [hotelPage, setHotelPage] = useState(1);
  const [hotelSearch, setHotelSearch] = useState('');
  const [hotelSearchInput, setHotelSearchInput] = useState('');
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [exportingHotels, setExportingHotels] = useState(false);
  const [sfLastSyncedAt, setSfLastSyncedAt] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<TimeseriesBucket[]>([]);
  const [funnel, setFunnel] = useState<AnalyticsFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [openPcmId, setOpenPcmId] = useState<string | null>(null);
  const [deckTarget, setDeckTarget] = useState<DeckDrillTarget | null>(null);
  const [tab, setTab] = useState<TabKey>('overview');
  const [templateId, setTemplateId] = useState(stored.templateId);
  const [locale, setLocale] = useState(stored.locale);
  const [region, setRegion] = useState(stored.region);
  const [facets, setFacets] = useState<AnalyticsFacets | null>(null);
  const [previousPeriod, setPreviousPeriod] = useState<PeriodTotals | null>(null);

  // A half-entered custom range would query from the beginning of time on every
  // keystroke, so wait until both dates are set before reloading.
  const customReady = range !== 'custom' || (!!customFrom && !!customTo);

  // Memoised so the child panels' effects don't refire on every render.
  const params: AnalyticsRangeParams = useMemo(() => ({
    ...rangeParams(range, customFrom, customTo),
    ...(templateId ? { templateId } : {}),
    ...(locale ? { locale } : {}),
    ...(region ? { region } : {}),
  }), [range, customFrom, customTo, templateId, locale, region]);

  const load = useCallback(async (query: AnalyticsRangeParams) => {
    setLoading(true);
    setError('');
    try {
      const [overview, series, funnelData] = await Promise.all([
        getAnalyticsOverview(query),
        getAnalyticsTimeseries({ ...query, interval: 'week' }),
        getAnalyticsFunnel(query),
      ]);
      setRows(overview.data);
      setSfLastSyncedAt(overview.sfLastSyncedAt);
      setPreviousPeriod(overview.previousPeriod);
      setBuckets(series);
      setFunnel(funnelData);
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!customReady) return;
    load(params);
  }, [params, customReady, load]);

  useEffect(() => {
    getAnalyticsFacets().then(setFacets).catch(() => setFacets(null));
  }, []);

  // By-hotel pages independently of the rest of the tab, so turning a page or
  // searching doesn't refetch the tiles, charts and funnel.
  useEffect(() => {
    if (!customReady || tab !== 'overview') return;
    let cancelled = false;
    setHotelsLoading(true);
    getAnalyticsHotels({ ...params, search: hotelSearch || undefined, page: hotelPage, limit: 25 })
      .then((res) => {
        if (cancelled) return;
        setHotels(res.data);
        setHotelMeta({ page: res.meta.page, totalPages: res.meta.totalPages, total: res.meta.total });
      })
      .catch(() => { if (!cancelled) setHotels([]); })
      .finally(() => { if (!cancelled) setHotelsLoading(false); });
    return () => { cancelled = true; };
  }, [params, hotelPage, hotelSearch, customReady, tab]);

  // Debounce the search box so each keystroke isn't a query.
  useEffect(() => {
    const timer = setTimeout(() => {
      setHotelSearch(hotelSearchInput.trim());
      setHotelPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [hotelSearchInput]);

  // A new period or filter invalidates the page number.
  useEffect(() => { setHotelPage(1); }, [params]);

  useEffect(() => {
    try {
      localStorage.setItem(
        RANGE_STORAGE_KEY,
        JSON.stringify({ range, customFrom, customTo, templateId, locale, region }),
      );
    } catch {
      // Private mode or a full quota — the dashboard still works, it just won't
      // remember the period.
    }
  }, [range, customFrom, customTo, templateId, locale, region]);

  // Exports the whole filtered set, not the visible page — a partial CSV that
  // looks complete is worse than no CSV.
  async function handleExportHotels(): Promise<void> {
    setExportingHotels(true);
    try {
      const res = await getAnalyticsHotels({
        ...params,
        search: hotelSearch || undefined,
        all: true,
      });
      downloadCsv(
        `hotel-conversion-${rangeSlug(range, customFrom, customTo)}.csv`,
        toCsv(res.data, HOTEL_CSV_COLUMNS),
      );
    } catch {
      setError('Failed to export hotels');
    } finally {
      setExportingHotels(false);
    }
  }

  async function handleSync(): Promise<void> {
    setSyncing(true);
    setSyncMessage('');
    try {
      const result = await syncSalesforceStages();
      setSyncMessage(
        result.skipped
          ? result.skipped
          : `Synced ${result.updated} of ${result.linkedDecks} linked decks`,
      );
      await load(params);
    } catch {
      setSyncMessage('Salesforce sync failed');
    } finally {
      setSyncing(false);
    }
  }

  const activeRows = rows.filter((r) => r.decksCreated > 0 || r.aiCalls > 0 || r.lastActiveAt)
    .sort((a, b) => b.decksCreated - a.decksCreated);
  const totals = rows.reduce(
    (acc, r) => ({
      decks: acc.decks + r.decksCreated,
      exports: acc.exports + r.exportsPptx + r.exportsPdf + r.exportsSalesforce,
      linked: acc.linked + r.decksLinkedToSf,
      sent: acc.sent + r.decksSentToSf,
      won: acc.won + r.decksWon,
      aiCost: acc.aiCost + r.aiCostUsd,
    }),
    { decks: 0, exports: 0, linked: 0, sent: 0, won: 0, aiCost: 0 },
  );

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            PCM usage, exports and Salesforce conversion. Activity is recorded from{' '}
            release 1.1.18 onward — earlier exports and logins aren't counted.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  range === r.key
                    ? 'bg-[#01B18B] text-white'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="flex items-center gap-2 text-sm">
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                aria-label="From date"
                className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                aria-label="To date"
                className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
              />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              aria-label="Filter by template"
              className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
            >
              <option value="">All templates</option>
              {(facets?.templates ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              aria-label="Filter by language"
              className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
            >
              <option value="">All languages</option>
              {(facets?.locales ?? []).map((l) => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label="Filter by region"
              disabled={(facets?.regions ?? []).length === 0}
              title={(facets?.regions ?? []).length === 0
                ? 'No regions set on any user yet — set them in Users to filter by region'
                : undefined}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B] disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">All regions</option>
              {(facets?.regions ?? []).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {(templateId || locale || region) && (
              <button
                onClick={() => { setTemplateId(''); setLocale(''); setRegion(''); }}
                className="text-xs text-[#01B18B] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              tab === t.key
                ? 'border-[#01B18B] font-medium text-[#01B18B]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {range === 'custom' && !customReady && (
        <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
          Pick both a start and an end date to load the custom period.
        </div>
      )}

      {(templateId || locale) && (
        <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          Filtered to {templateId ? 'one template' : ''}{templateId && locale ? ' and ' : ''}
          {locale ? `${locale.toUpperCase()} decks` : ''}. Activity that isn&rsquo;t tied to a specific deck
          is excluded while this filter is on — logins, and AI work done in the case-study library rather
          than inside a deck — so totals here read lower than the unfiltered view.
        </div>
      )}

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {tab === 'adoption' && <AdoptionPanel params={params} onOpenPcm={setOpenPcmId} />}
      {tab === 'content' && <ContentPanel params={params} />}
      {tab === 'qa' && <QaAdoptionPanel params={params} />}
      {tab === 'digest' && <DigestPanel />}

      {tab === 'overview' && (loading ? (
        <div className="p-8 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile
              label="Decks created"
              value={String(totals.decks)}
              change={deltaOf(totals.decks, previousPeriod?.decks)}
            />
            <StatTile
              label="Exports"
              value={String(totals.exports)}
              sub="PPTX + PDF + Salesforce"
              change={deltaOf(totals.exports, previousPeriod?.exports)}
            />
            <StatTile
              label="Linked to Salesforce"
              value={String(totals.linked)}
              sub={`${totals.sent} sent from the tool`}
              change={deltaOf(totals.linked, previousPeriod?.linked)}
            />
            <StatTile
              label="Closed won"
              value={String(totals.won)}
              sub={totals.linked > 0
                ? `${Math.round((totals.won / totals.linked) * 1000) / 10}% of linked decks`
                : 'No decks linked yet'}
              change={deltaOf(totals.won, previousPeriod?.won)}
            />
            <StatTile
              label="AI spend"
              value={`$${totals.aiCost.toFixed(2)}`}
              sub="LLM cost (USD)"
              change={deltaOf(totals.aiCost, previousPeriod?.aiCostUsd)}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <MiniBarChart
              title="Decks created per week"
              buckets={buckets}
              pick={(b) => b.decksCreated}
              emptyLabel="No decks created in this period"
            />
            <MiniBarChart
              title="Exports per week"
              buckets={buckets}
              pick={(b) => b.exports}
              emptyLabel="No exports recorded yet"
            />
          </div>

          {funnel && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 text-sm font-medium text-gray-900">Deck funnel</div>
              <div className="space-y-2">
                <FunnelBar
                  label="Created"
                  value={funnel.created}
                  max={funnel.created}
                  onDrill={() => setDeckTarget({ title: 'Decks created', stage: 'created' })}
                />
                <FunnelBar
                  label="Previewed"
                  value={funnel.previewed}
                  max={funnel.created}
                  onDrill={() => setDeckTarget({ title: 'Decks previewed', stage: 'previewed' })}
                />
                <FunnelBar
                  label="Exported"
                  value={funnel.exported}
                  max={funnel.created}
                  onDrill={() => setDeckTarget({ title: 'Decks exported', stage: 'exported' })}
                  gap={{
                    label: 'never exported',
                    // Tracked decks only — a deck created before tracking may
                    // well have been exported, so counting it here would make
                    // the chase list wrong.
                    count: funnel.notExportedTracked,
                    onDrill: () => setDeckTarget({
                      title: 'Decks never exported',
                      description: 'Created since tracking began with no export recorded',
                      stage: 'not_exported',
                    }),
                  }}
                />
                <FunnelBar
                  label="Linked to Salesforce"
                  value={funnel.linkedToSf}
                  max={funnel.created}
                  onDrill={() => setDeckTarget({ title: 'Decks linked to Salesforce', stage: 'linked_to_sf' })}
                  gap={{
                    label: 'not linked',
                    count: funnel.created - funnel.linkedToSf,
                    onDrill: () => setDeckTarget({
                      title: 'Decks with no Salesforce opportunity',
                      description: 'Invisible to conversion reporting until a PCM links them',
                      stage: 'not_linked_to_sf',
                    }),
                  }}
                />
                <FunnelBar
                  label="Sent to Salesforce"
                  value={funnel.sentToSf}
                  max={funnel.created}
                  onDrill={() => setDeckTarget({ title: 'Decks sent to Salesforce', stage: 'sent_to_sf' })}
                  gap={{
                    label: 'linked, not sent',
                    count: funnel.linkedToSf - funnel.sentToSf,
                    onDrill: () => setDeckTarget({
                      title: 'Linked but never sent',
                      description: 'An opportunity is attached but the deck was never pushed to Salesforce',
                      stage: 'linked_not_sent',
                    }),
                  }}
                />
                <FunnelBar
                  label="Closed won"
                  value={funnel.won}
                  max={funnel.created}
                  onDrill={() => setDeckTarget({ title: 'Closed-won decks', stage: 'won' })}
                />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Each row counts decks created in this period, and every bar is clickable. Closed won is
                measured against decks <em>linked</em> to an opportunity — an opportunity can close won
                whether or not the deck was pushed to Salesforce from here, so it can exceed the sent count.
              </p>
              {funnel.untrackedDecks > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  {funnel.untrackedDecks} of these {funnel.created} decks predate activity tracking
                  {funnel.trackingSince
                    ? ` (started ${new Date(funnel.trackingSince).toLocaleDateString()})`
                    : ''}
                  , so <strong>Previewed</strong> and <strong>Exported</strong> undercount them — their earlier
                  activity was never recorded. The Salesforce rows are unaffected, and the &ldquo;never
                  exported&rdquo; list excludes them.
                </p>
              )}
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">By PCM</h2>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                Salesforce stages synced: {sfLastSyncedAt ? formatWhen(sfLastSyncedAt) : 'never'}
                {syncMessage && <span className="ml-2 text-[#01B18B]">{syncMessage}</span>}
              </span>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="rounded-md bg-[#01B18B] px-3 py-1.5 text-xs text-white hover:bg-[#009977] disabled:opacity-40"
              >
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                onClick={() => downloadCsv(
                  `pcm-usage-${rangeSlug(range, customFrom, customTo)}.csv`,
                  toCsv(activeRows, PCM_CSV_COLUMNS),
                )}
                disabled={activeRows.length === 0}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">PCM</th>
                  <th className="px-4 py-3 text-right">Pitches</th>
                  <th className="px-4 py-3 text-right">Exports</th>
                  <th
                    className="px-4 py-3 text-right"
                    title="Median time from deck creation to first export, with the 90th percentile beneath. Covers only decks that were exported."
                  >
                    Time to complete
                  </th>
                  <th className="px-4 py-3 text-right">AI usage</th>
                  <th className="px-4 py-3 text-right" title="Decks linked to a Salesforce opportunity / sent to Salesforce">SF linked / sent</th>
                  <th className="px-4 py-3 text-right" title="Closed-won decks as a share of decks linked to a Salesforce opportunity">Conversion</th>
                  <th className="px-4 py-3 text-right">Last active</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No activity in this period
                    </td>
                  </tr>
                )}
                {activeRows.map((r) => {
                  const exports = r.exportsPptx + r.exportsPdf + r.exportsSalesforce;
                  return (
                    <tr
                      key={r.userId}
                      onClick={() => setOpenPcmId(r.userId)}
                      className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50"
                      title={`View ${r.name}'s decks and activity`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {r.name}
                          {r.roles.includes('admin') && (
                            <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">admin</span>
                          )}
                          {!r.active && (
                            <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-500">inactive</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{r.region ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{r.decksCreated}</td>
                      <td className="px-4 py-3 text-right text-gray-700" title={`${r.exportsPptx} PPTX · ${r.exportsPdf} PDF · ${r.exportsSalesforce} Salesforce`}>
                        {exports}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        <div title={`Mean ${formatDuration(r.avgHoursToFirstExport)} over ${r.completedDecks} exported ${r.completedDecks === 1 ? 'deck' : 'decks'}`}>
                          {formatDuration(r.medianHoursToFirstExport)}
                        </div>
                        {r.p90HoursToFirstExport !== null && (
                          <div className="text-xs text-gray-400" title="90th percentile — the slow tail">
                            p90 {formatDuration(r.p90HoursToFirstExport)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700" title={`${r.aiCalls} AI calls`}>
                        {r.aiCalls > 0 ? `${r.aiCalls} · $${r.aiCostUsd.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {r.decksLinkedToSf} / {r.decksSentToSf}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {r.conversionRate !== null ? `${r.conversionRate}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500" title={lastSeenCell(r).title}>
                        {lastSeenCell(r).text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">Click a PCM to see their decks, AI usage and activity.</p>

          <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              By hotel
              {hotelMeta.total > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {hotelMeta.total} {hotelMeta.total === 1 ? 'hotel' : 'hotels'}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={hotelSearchInput}
                onChange={(e) => setHotelSearchInput(e.target.value)}
                placeholder="Search hotel or destination"
                aria-label="Search hotels"
                className="w-56 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
              />
              <button
                onClick={handleExportHotels}
                disabled={hotelMeta.total === 0 || exportingHotels}
                title="Exports every hotel in the current period and filters, not just this page"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                {exportingHotels ? 'Preparing…' : 'Export CSV'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Hotel</th>
                  <th className="px-4 py-3 text-right">Pitches</th>
                  <th className="px-4 py-3 text-right" title="Decks linked to a Salesforce opportunity / sent to Salesforce">SF linked / sent</th>
                  <th className="px-4 py-3 text-right">Closed won</th>
                  <th className="px-4 py-3 text-right" title="Closed-won decks as a share of decks linked to a Salesforce opportunity">Win rate</th>
                  <th className="px-4 py-3 text-right" title="Sum of Amount on won opportunities">Won value</th>
                  <th className="px-4 py-3 text-right">Last pitched</th>
                </tr>
              </thead>
              <tbody>
                {hotels.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      {hotelsLoading
                        ? 'Loading…'
                        : hotelSearch
                          ? `No hotels matching “${hotelSearch}” in this period`
                          : 'No hotels pitched in this period'}
                    </td>
                  </tr>
                )}
                {hotels.map((h) => (
                  <tr
                    key={h.hotel}
                    onClick={() => setDeckTarget({
                      title: h.hotel,
                      description: 'Every deck pitched at this hotel',
                      hotel: h.hotel,
                    })}
                    className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    title={`View the decks pitched at ${h.hotel}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{h.hotel}</div>
                      <div className="text-xs text-gray-500">{h.destination ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{h.pitches}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{h.linked} / {h.sent}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{h.won}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {h.winRate !== null ? `${h.winRate}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {h.wonAmount > 0 ? `$${h.wonAmount.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {h.lastPitchedAt ? formatWhen(h.lastPitchedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hotelMeta.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Page {hotelMeta.page} of {hotelMeta.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHotelPage((p) => Math.max(1, p - 1))}
                  disabled={hotelMeta.page <= 1 || hotelsLoading}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setHotelPage((p) => Math.min(hotelMeta.totalPages, p + 1))}
                  disabled={hotelMeta.page >= hotelMeta.totalPages || hotelsLoading}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Win rate and won value come from the linked Salesforce opportunity, so they only cover decks a PCM
            linked. Click a hotel to see its decks.
          </p>
        </>
      ))}

      {openPcmId && <PcmDetailDrawer userId={openPcmId} onClose={() => setOpenPcmId(null)} />}
      {deckTarget && (
        <DeckListDrawer target={deckTarget} params={params} onClose={() => setDeckTarget(null)} />
      )}
    </div>
  );
}
