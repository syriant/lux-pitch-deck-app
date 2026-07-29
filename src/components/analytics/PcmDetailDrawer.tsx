import { useEffect, useState } from 'react';
import { getPcmDetail, type PcmDetail } from '@/api/analytics.api';
import { toCsv, downloadCsv, type CsvColumn } from '@/lib/csv';

const EVENT_LABELS: Record<string, string> = {
  login: 'Logged in',
  deck_created: 'Created deck',
  deck_deleted: 'Deleted deck',
  deck_previewed: 'Opened preview',
  export_pptx: 'Exported PPTX',
  export_pdf: 'Exported PDF',
  export_salesforce: 'Sent to Salesforce',
};

const AI_FEATURE_LABELS: Record<string, string> = {
  lux_voice_rewrite: 'LUX voice rewrite',
  lux_translate: 'Translation',
  qa_evaluate: 'QA review',
  case_study_narrative: 'Case study narrative',
  case_study_from_pdf: 'Case study from PDF',
  case_study_summary_from_pdf: 'Case study summary from PDF',
  case_study_from_pdf_auto: 'Case study from PDF (auto)',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const DECK_CSV_COLUMNS: Array<CsvColumn<PcmDetail['decks'][number]>> = [
  { header: 'Deck', value: (d) => d.name },
  { header: 'Hotel', value: (d) => d.hotel },
  { header: 'Destination', value: (d) => d.destination },
  { header: 'Created', value: (d) => d.createdAt },
  { header: 'Previewed', value: (d) => (d.previewed ? 'yes' : 'no') },
  { header: 'Exports', value: (d) => d.exports },
  { header: 'Last export', value: (d) => d.lastExportAt },
  { header: 'AI calls', value: (d) => d.aiCalls },
  { header: 'SF opportunity', value: (d) => d.salesforceOpportunityId },
  { header: 'SF stage', value: (d) => d.sfStageName },
  { header: 'SF won', value: (d) => (d.sfIsWon === null ? '' : d.sfIsWon ? 'yes' : 'no') },
];

export function PcmDetailDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<PcmDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getPcmDetail(userId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) setError('Failed to load PCM detail'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleExport(): void {
    if (!detail) return;
    const slug = detail.user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    downloadCsv(`pcm-${slug}-decks.csv`, toCsv(detail.decks, DECK_CSV_COLUMNS));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-3xl flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {detail ? detail.user.name : 'Loading…'}
            </h2>
            {detail && (
              <p className="text-sm text-gray-500">
                {detail.user.email}
                {detail.user.region ? ` · ${detail.user.region}` : ''}
                {!detail.user.active && ' · inactive'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {detail && detail.decks.length > 0 && (
              <button
                onClick={handleExport}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Export decks CSV
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
          {loading && <div className="text-sm text-gray-500">Loading…</div>}
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {detail && !loading && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Decks ({detail.decks.length})
              </h3>
              {detail.decks.length === 0 ? (
                <p className="mb-6 text-sm text-gray-500">This PCM hasn&rsquo;t created any decks.</p>
              ) : (
                <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-2">Deck / hotel</th>
                        <th className="px-3 py-2">Created</th>
                        <th className="px-3 py-2 text-right">Exports</th>
                        <th className="px-3 py-2 text-right">AI</th>
                        <th className="px-3 py-2">Salesforce</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.decks.map((d) => (
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
                          <td className="px-3 py-2 text-gray-600">{formatDate(d.createdAt)}</td>
                          <td className="px-3 py-2 text-right text-gray-700" title={d.lastExportAt ? `Last export ${formatDateTime(d.lastExportAt)}` : 'Never exported'}>
                            {d.exports > 0 ? d.exports : d.previewed ? 'previewed' : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">{d.aiCalls > 0 ? d.aiCalls : '—'}</td>
                          <td className="px-3 py-2">
                            {d.salesforceOpportunityId ? (
                              <div className="text-xs">
                                <span className={d.sfIsWon ? 'font-medium text-[#01B18B]' : 'text-gray-700'}>
                                  {d.sfStageName ?? 'Not synced yet'}
                                </span>
                                <div className="text-gray-400">{d.salesforceOpportunityId}</div>
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
              )}

              <h3 className="mb-2 text-sm font-semibold text-gray-900">AI usage by feature</h3>
              {detail.aiByFeature.length === 0 ? (
                <p className="mb-6 text-sm text-gray-500">No AI features used.</p>
              ) : (
                <div className="mb-6 space-y-1.5">
                  {detail.aiByFeature.map((f) => (
                    <div key={f.feature} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                      <span className="text-gray-700">{AI_FEATURE_LABELS[f.feature] ?? f.feature}</span>
                      <span className="text-gray-500">
                        {f.calls} {f.calls === 1 ? 'call' : 'calls'} · ${f.costUsd.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-gray-500">
                    Counts AI runs, not whether the PCM kept the result — a rewrite that was reverted still counts here.
                  </p>
                </div>
              )}

              <h3 className="mb-2 text-sm font-semibold text-gray-900">Recent activity</h3>
              {detail.recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No activity recorded. Tracking started in release 1.1.18 — earlier work doesn&rsquo;t appear here.
                </p>
              ) : (
                <ol className="space-y-1.5">
                  {detail.recentActivity.map((a, i) => (
                    <li key={`${a.createdAt}-${i}`} className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="text-gray-700">
                        {EVENT_LABELS[a.eventType] ?? a.eventType}
                        {a.deckName && <span className="text-gray-500"> — {a.deckName}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400">{formatDateTime(a.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
