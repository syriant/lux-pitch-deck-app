import { useEffect, useState } from 'react';
import {
  getDeckDrill,
  type AnalyticsRangeParams, type DeckDrillRow, type DeckDrillStage,
} from '@/api/analytics.api';
import { toCsv, downloadCsv, type CsvColumn } from '@/lib/csv';

export interface DeckDrillTarget {
  title: string;
  /** Explains what the list contains — these slices aren't self-evident. */
  description?: string;
  hotel?: string;
  stage?: DeckDrillStage;
}

const CSV_COLUMNS: Array<CsvColumn<DeckDrillRow>> = [
  { header: 'Deck', value: (d) => d.name },
  { header: 'Hotel', value: (d) => d.hotel },
  { header: 'Destination', value: (d) => d.destination },
  { header: 'PCM', value: (d) => d.ownerName },
  { header: 'Created', value: (d) => d.createdAt },
  { header: 'Last updated', value: (d) => d.updatedAt },
  { header: 'Previewed', value: (d) => (d.predatesTracking && !d.previewed ? 'unknown' : d.previewed ? 'yes' : 'no') },
  { header: 'Exports', value: (d) => d.exports },
  { header: 'Last export', value: (d) => d.lastExportAt },
  { header: 'Predates tracking', value: (d) => (d.predatesTracking ? 'yes' : 'no') },
  { header: 'SF opportunity', value: (d) => d.salesforceOpportunityId },
  { header: 'Sent to SF', value: (d) => (d.sentToSf ? 'yes' : 'no') },
  { header: 'SF stage', value: (d) => d.sfStageName },
  { header: 'SF won', value: (d) => (d.sfIsWon === null ? '' : d.sfIsWon ? 'yes' : 'no') },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTrackingDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DeckListDrawer({ target, params, onClose }: {
  target: DeckDrillTarget;
  params: AnalyticsRangeParams;
  onClose: () => void;
}) {
  const [decks, setDecks] = useState<DeckDrillRow[]>([]);
  const [trackingSince, setTrackingSince] = useState<string | null>(null);
  const [excludedUntracked, setExcludedUntracked] = useState(false);
  const [includeUntracked, setIncludeUntracked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getDeckDrill({ ...params, hotel: target.hotel, stage: target.stage, includeUntracked })
      .then((res) => {
        if (cancelled) return;
        setDecks(res.decks);
        setTrackingSince(res.trackingSince);
        setExcludedUntracked(res.excludedUntracked);
      })
      .catch(() => { if (!cancelled) setError('Failed to load decks'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params, target.hotel, target.stage, includeUntracked]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const slug = target.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-3xl flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{target.title}</h2>
            <p className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${decks.length} ${decks.length === 1 ? 'deck' : 'decks'}`}
              {target.description ? ` · ${target.description}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {decks.length > 0 && (
              <button
                onClick={() => downloadCsv(`decks-${slug}.csv`, toCsv(decks, CSV_COLUMNS))}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Export CSV
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {excludedUntracked && trackingSince && (
            <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
              Limited to decks created since activity tracking began on{' '}
              {formatTrackingDate(trackingSince)}. Older decks may well have been exported before then —
              there&rsquo;s no record either way, so they&rsquo;d be a false chase list.
              <button
                onClick={() => setIncludeUntracked(true)}
                className="ml-2 font-medium underline hover:no-underline"
              >
                Include them anyway
              </button>
            </div>
          )}

          {includeUntracked && trackingSince && (
            <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              Including decks that predate tracking (marked <em>unknown</em>). For those, no recorded export
              doesn&rsquo;t mean it never happened.
              <button
                onClick={() => setIncludeUntracked(false)}
                className="ml-2 font-medium underline hover:no-underline"
              >
                Hide them
              </button>
            </div>
          )}

          {!loading && !error && decks.length === 0 && (
            <p className="text-sm text-gray-500">No decks match this slice.</p>
          )}

          {decks.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2">Deck / hotel</th>
                      <th className="px-3 py-2">PCM</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2 text-right">Exports</th>
                      <th className="px-3 py-2 text-center">Previewed</th>
                      <th className="px-3 py-2">Salesforce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decks.map((d) => (
                      <tr key={d.deckId} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2">
                          <a
                            href={`/decks/${d.deckId}/preview`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-[#01B18B] hover:underline"
                          >
                            {d.name}
                          </a>
                          <div className="text-xs text-gray-500">
                            {d.hotel ?? 'No hotel set'}
                            {d.destination ? ` · ${d.destination}` : ''}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{d.ownerName ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {formatDate(d.createdAt)}
                          {d.predatesTracking && (
                            <div
                              className="text-xs text-amber-600"
                              title={trackingSince
                                ? `Created before activity tracking began on ${formatTrackingDate(trackingSince)} — earlier exports and previews weren't recorded`
                                : undefined}
                            >
                              predates tracking
                            </div>
                          )}
                        </td>
                        <td
                          className="px-3 py-2 text-right"
                          title={d.lastExportAt
                            ? `Last export ${formatDate(d.lastExportAt)}`
                            : d.predatesTracking
                              ? 'No export recorded — but this deck predates tracking, so earlier exports are unknown'
                              : 'Never exported'}
                        >
                          {d.exports > 0 ? (
                            <span className="text-gray-700">{d.exports}</span>
                          ) : d.predatesTracking ? (
                            <span className="text-gray-400">unknown</span>
                          ) : (
                            <span className="text-gray-700">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-xs">
                          {d.previewed ? (
                            <span className="text-[#01B18B]">yes</span>
                          ) : d.predatesTracking ? (
                            <span className="text-gray-400">unknown</span>
                          ) : (
                            <span className="text-gray-500">no</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {d.salesforceOpportunityId ? (
                            <div className="text-xs">
                              <span className={d.sfIsWon ? 'font-medium text-[#01B18B]' : 'text-gray-700'}>
                                {d.sfStageName ?? 'Not synced yet'}
                              </span>
                              <div className="text-gray-400">
                                {d.sentToSf ? 'Sent from tool' : 'Linked, not sent'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Not linked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {decks.length === 200 && (
                <p className="mt-2 text-xs text-amber-700">
                  Showing the 200 most recent decks — export the CSV or narrow the date range to see the rest.
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Deck names open the live preview in a new tab, where edits save to the deck. Opening
                someone else&rsquo;s deck from here won&rsquo;t mark it as previewed — only the deck&rsquo;s
                own PCM counts.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
