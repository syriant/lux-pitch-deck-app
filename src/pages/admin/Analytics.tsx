import { useState, useEffect, useCallback } from 'react';
import {
  getAnalyticsOverview, getAnalyticsTimeseries, getAnalyticsFunnel, getAnalyticsHotels,
  syncSalesforceStages,
  type PcmOverviewRow, type TimeseriesBucket, type AnalyticsFunnel, type HotelConversionRow,
} from '@/api/analytics.api';
import { PcmDetailDrawer } from '@/components/analytics/PcmDetailDrawer';
import { toCsv, downloadCsv, type CsvColumn } from '@/lib/csv';

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
}

function loadStoredRange(): StoredRange {
  const fallback: StoredRange = { range: '90d', customFrom: '', customTo: '' };
  try {
    const raw = localStorage.getItem(RANGE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredRange>;
    if (!RANGES.some((r) => r.key === parsed.range)) return fallback;
    return {
      range: parsed.range as RangeKey,
      customFrom: typeof parsed.customFrom === 'string' ? parsed.customFrom : '',
      customTo: typeof parsed.customTo === 'string' ? parsed.customTo : '',
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

const PCM_CSV_COLUMNS: Array<CsvColumn<PcmOverviewRow>> = [
  { header: 'PCM', value: (r) => r.name },
  { header: 'Email', value: (r) => r.email },
  { header: 'Region', value: (r) => r.region },
  { header: 'Pitches', value: (r) => r.decksCreated },
  { header: 'Exports PPTX', value: (r) => r.exportsPptx },
  { header: 'Exports PDF', value: (r) => r.exportsPdf },
  { header: 'Exports Salesforce', value: (r) => r.exportsSalesforce },
  { header: 'Decks exported', value: (r) => r.decksExported },
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

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function FunnelBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-40 shrink-0 text-gray-600">{label}</div>
      <div className="h-5 flex-1 rounded bg-gray-100">
        <div
          className="h-5 rounded bg-[#01B18B]"
          style={{ width: `${pct}%` }}
          title={`${label}: ${value}`}
        />
      </div>
      <div className="w-12 shrink-0 text-right font-medium text-gray-900">{value}</div>
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
  const [sfLastSyncedAt, setSfLastSyncedAt] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<TimeseriesBucket[]>([]);
  const [funnel, setFunnel] = useState<AnalyticsFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [openPcmId, setOpenPcmId] = useState<string | null>(null);

  const load = useCallback(async (selected: RangeKey, from: string, to: string) => {
    setLoading(true);
    setError('');
    try {
      const params = rangeParams(selected, from, to);
      const [overview, series, funnelData, hotelRows] = await Promise.all([
        getAnalyticsOverview(params),
        getAnalyticsTimeseries({ ...params, interval: 'week' }),
        getAnalyticsFunnel(params),
        getAnalyticsHotels(params),
      ]);
      setRows(overview.data);
      setSfLastSyncedAt(overview.sfLastSyncedAt);
      setBuckets(series);
      setFunnel(funnelData);
      setHotels(hotelRows);
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  // A half-entered custom range would query from the beginning of time on every
  // keystroke, so wait until both dates are set before reloading.
  const customReady = range !== 'custom' || (!!customFrom && !!customTo);

  useEffect(() => {
    if (!customReady) return;
    load(range, customFrom, customTo);
  }, [range, customFrom, customTo, customReady, load]);

  useEffect(() => {
    try {
      localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify({ range, customFrom, customTo }));
    } catch {
      // Private mode or a full quota — the dashboard still works, it just won't
      // remember the period.
    }
  }, [range, customFrom, customTo]);

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
      await load(range, customFrom, customTo);
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
        </div>
      </div>

      {range === 'custom' && !customReady && (
        <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
          Pick both a start and an end date to load the custom period.
        </div>
      )}

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="p-8 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Decks created" value={String(totals.decks)} />
            <StatTile label="Exports" value={String(totals.exports)} sub="PPTX + PDF + Salesforce" />
            <StatTile
              label="Linked to Salesforce"
              value={String(totals.linked)}
              sub={`${totals.sent} sent from the tool`}
            />
            <StatTile
              label="Closed won"
              value={String(totals.won)}
              sub={totals.linked > 0
                ? `${Math.round((totals.won / totals.linked) * 1000) / 10}% of linked decks`
                : 'No decks linked yet'}
            />
            <StatTile label="AI spend" value={`$${totals.aiCost.toFixed(2)}`} sub="LLM cost (USD)" />
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
                <FunnelBar label="Created" value={funnel.created} max={funnel.created} />
                <FunnelBar label="Previewed" value={funnel.previewed} max={funnel.created} />
                <FunnelBar label="Exported" value={funnel.exported} max={funnel.created} />
                <FunnelBar label="Linked to Salesforce" value={funnel.linkedToSf} max={funnel.created} />
                <FunnelBar label="Sent to Salesforce" value={funnel.sentToSf} max={funnel.created} />
                <FunnelBar label="Closed won" value={funnel.won} max={funnel.created} />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Each row counts decks created in this period. Closed won is measured against decks{' '}
                <em>linked</em> to an opportunity — an opportunity can close won whether or not the deck
                was pushed to Salesforce from here, so it can exceed the sent count.
              </p>
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
                  <th className="px-4 py-3 text-right" title="Average time from deck creation to first export">Avg time to complete</th>
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
                      <td className="px-4 py-3 text-right text-gray-700">{formatDuration(r.avgHoursToFirstExport)}</td>
                      <td className="px-4 py-3 text-right text-gray-700" title={`${r.aiCalls} AI calls`}>
                        {r.aiCalls > 0 ? `${r.aiCalls} · $${r.aiCostUsd.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {r.decksLinkedToSf} / {r.decksSentToSf}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {r.conversionRate !== null ? `${r.conversionRate}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatWhen(r.lastActiveAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">Click a PCM to see their decks, AI usage and activity.</p>

          <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">By hotel</h2>
            <button
              onClick={() => downloadCsv(
                `hotel-conversion-${rangeSlug(range, customFrom, customTo)}.csv`,
                toCsv(hotels, HOTEL_CSV_COLUMNS),
              )}
              disabled={hotels.length === 0}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Export CSV
            </button>
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
                      No hotels pitched in this period
                    </td>
                  </tr>
                )}
                {hotels.map((h) => (
                  <tr key={h.hotel} className="border-b border-gray-100 last:border-0">
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
          <p className="mt-2 text-xs text-gray-500">
            Win rate and won value come from the linked Salesforce opportunity, so they only cover decks a PCM linked.
          </p>
        </>
      )}

      {openPcmId && <PcmDetailDrawer userId={openPcmId} onClose={() => setOpenPcmId(null)} />}
    </div>
  );
}
