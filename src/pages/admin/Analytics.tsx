import { useState, useEffect, useCallback } from 'react';
import {
  getAnalyticsOverview, getAnalyticsTimeseries, getAnalyticsFunnel, syncSalesforceStages,
  type PcmOverviewRow, type TimeseriesBucket, type AnalyticsFunnel,
} from '@/api/analytics.api';

type RangeKey = '30d' | '90d' | 'all';

const RANGES: Array<{ key: RangeKey; label: string; days: number | null }> = [
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
];

function rangeParams(key: RangeKey): { from?: string } {
  const range = RANGES.find((r) => r.key === key)!;
  if (!range.days) return {};
  const from = new Date();
  from.setDate(from.getDate() - range.days);
  return { from: from.toISOString() };
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

function MiniBarChart({ title, buckets, pick }: {
  title: string;
  buckets: TimeseriesBucket[];
  pick: (b: TimeseriesBucket) => number;
}) {
  const max = Math.max(...buckets.map(pick), 1);
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-medium text-gray-900">{title}</div>
      {buckets.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-xs text-gray-400">No data yet</div>
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
      {buckets.length > 0 && (
        <div className="mt-1 flex justify-between text-[10px] text-gray-400">
          <span>{new Date(buckets[0].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
          <span>{new Date(buckets[buckets.length - 1].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
        </div>
      )}
    </div>
  );
}

export function Analytics() {
  const [range, setRange] = useState<RangeKey>('90d');
  const [rows, setRows] = useState<PcmOverviewRow[]>([]);
  const [sfLastSyncedAt, setSfLastSyncedAt] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<TimeseriesBucket[]>([]);
  const [funnel, setFunnel] = useState<AnalyticsFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const load = useCallback(async (selected: RangeKey) => {
    setLoading(true);
    setError('');
    try {
      const params = rangeParams(selected);
      const [overview, series, funnelData] = await Promise.all([
        getAnalyticsOverview(params),
        getAnalyticsTimeseries({ ...params, interval: 'week' }),
        getAnalyticsFunnel(params),
      ]);
      setRows(overview.data);
      setSfLastSyncedAt(overview.sfLastSyncedAt);
      setBuckets(series);
      setFunnel(funnelData);
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, [range, load]);

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
      await load(range);
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
      sent: acc.sent + r.decksSentToSf,
      won: acc.won + r.decksWon,
      aiCost: acc.aiCost + r.aiCostUsd,
    }),
    { decks: 0, exports: 0, sent: 0, won: 0, aiCost: 0 },
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
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="p-8 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Decks created" value={String(totals.decks)} />
            <StatTile label="Exports" value={String(totals.exports)} sub="PPTX + PDF + Salesforce" />
            <StatTile label="Sent to Salesforce" value={String(totals.sent)} />
            <StatTile
              label="Closed won"
              value={String(totals.won)}
              sub={totals.sent > 0 ? `${Math.round((totals.won / totals.sent) * 1000) / 10}% conversion` : 'No decks sent yet'}
            />
            <StatTile label="AI spend" value={`$${totals.aiCost.toFixed(2)}`} sub="LLM cost (USD)" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <MiniBarChart title="Decks created per week" buckets={buckets} pick={(b) => b.decksCreated} />
            <MiniBarChart title="Exports per week" buckets={buckets} pick={(b) => b.exports} />
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
            </div>
          )}

          <div className="mb-3 flex items-center justify-between">
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
                  <th className="px-4 py-3 text-right" title="Closed-won decks as a share of decks sent to Salesforce">Conversion</th>
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
                    <tr key={r.userId} className="border-b border-gray-100 last:border-0">
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
        </>
      )}
    </div>
  );
}
