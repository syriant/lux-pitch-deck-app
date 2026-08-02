import { useEffect, useState } from 'react';
import { getContentAnalytics, type AnalyticsRangeParams, type ContentAnalytics } from '@/api/analytics.api';
import { BarRow, PanelSection, EmptyNote } from './shared';
import { toCsv, downloadCsv, type CsvColumn } from '@/lib/csv';

const CASE_STUDY_CSV: Array<CsvColumn<ContentAnalytics['caseStudies'][number]>> = [
  { header: 'Case study', value: (r) => r.title },
  { header: 'Hotel', value: (r) => r.hotelName },
  { header: 'Destination', value: (r) => r.destination },
  { header: 'Decks', value: (r) => r.decks },
  { header: 'Linked to SF', value: (r) => r.linkedDecks },
  { header: 'Won decks', value: (r) => r.wonDecks },
];

export function ContentPanel({ params }: { params: AnalyticsRangeParams }) {
  const [data, setData] = useState<ContentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getContentAnalytics(params)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError('Failed to load content analytics'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params]);

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;
  if (error) return <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  if (!data) return null;

  const maxDiff = Math.max(...data.differentiators.map((d) => d.decks), 1);
  const maxObjective = Math.max(...data.objectives.map((o) => o.decks), 1);
  const maxTemplate = Math.max(...data.templates.map((t) => t.decks), 1);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Case studies</h2>
        <button
          onClick={() => downloadCsv('case-study-usage.csv', toCsv(data.caseStudies, CASE_STUDY_CSV))}
          disabled={data.caseStudies.length === 0}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>
      <div className="mb-2 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Case study</th>
              <th className="px-4 py-3 text-right">Decks</th>
              <th className="px-4 py-3 text-right">Linked to SF</th>
              <th className="px-4 py-3 text-right">On won decks</th>
            </tr>
          </thead>
          <tbody>
            {data.caseStudies.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No case studies used in this period
                </td>
              </tr>
            )}
            {data.caseStudies.map((cs) => (
              <tr key={cs.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{cs.title}</div>
                  <div className="text-xs text-gray-500">
                    {cs.hotelName ?? '—'}
                    {cs.destination ? ` · ${cs.destination}` : ''}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">{cs.decks}</td>
                <td className="px-4 py-3 text-right text-gray-700">{cs.linkedDecks}</td>
                <td className="px-4 py-3 text-right text-gray-700">{cs.wonDecks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mb-6 text-xs text-gray-500">
        &ldquo;On won decks&rdquo; counts appearances on decks whose opportunity closed won. Treat it as a
        signal, not proof — deck counts here are small, and a case study doesn&rsquo;t win a deal on its own.
      </p>

      <PanelSection title="Most-used differentiators">
        {data.differentiators.length === 0 ? (
          <EmptyNote>No differentiators selected in this period.</EmptyNote>
        ) : (
          <div className="space-y-2">
            {data.differentiators.slice(0, 15).map((d) => (
              <BarRow
                key={d.id}
                label={d.title}
                sub={d.category ? `(${d.category})` : undefined}
                value={d.decks}
                max={maxDiff}
              />
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection
        title="Most-used objectives"
        note="Grouped by exact wording, so hand-typed variants of the same idea appear separately."
      >
        {data.objectives.length === 0 ? (
          <EmptyNote>No objectives set in this period.</EmptyNote>
        ) : (
          <div className="space-y-2">
            {data.objectives.slice(0, 15).map((o) => (
              <BarRow
                key={`${o.label}-${o.source ?? ''}`}
                label={o.label}
                sub={o.primaryDecks > 0 ? `(${o.primaryDecks} primary)` : undefined}
                value={o.decks}
                max={maxObjective}
              />
            ))}
          </div>
        )}
      </PanelSection>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PanelSection title="Template mix">
          {data.templates.length === 0 ? (
            <EmptyNote>No decks in this period.</EmptyNote>
          ) : (
            <div className="space-y-2">
              {data.templates.map((t) => (
                <BarRow key={t.label} label={t.label} value={t.decks} max={maxTemplate} />
              ))}
            </div>
          )}
        </PanelSection>

        <PanelSection
          title="Language mix"
          note="Decks available in each language. English is the canonical base; other languages come from translated variants stored on the same deck, so a deck counts under every language it exists in."
        >
          {data.locales.length === 0 ? (
            <EmptyNote>No decks in this period.</EmptyNote>
          ) : (
            <div className="space-y-2">
              {data.locales.map((l) => (
                <BarRow
                  key={l.locale}
                  label={l.locale.toUpperCase()}
                  sub={l.translatedDecks > 0 ? `(${l.translatedDecks} translated)` : '(base)'}
                  value={l.decks}
                  max={Math.max(...data.locales.map((x) => x.decks), 1)}
                />
              ))}
            </div>
          )}
        </PanelSection>
      </div>
    </>
  );
}
