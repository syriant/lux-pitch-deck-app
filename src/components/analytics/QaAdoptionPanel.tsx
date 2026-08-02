import { useEffect, useState } from 'react';
import { getQaAdoption, type AnalyticsRangeParams, type QaAdoption } from '@/api/analytics.api';
import { StatTile, BarRow, PanelSection, EmptyNote } from './shared';

export function QaAdoptionPanel({ params }: { params: AnalyticsRangeParams }) {
  const [data, setData] = useState<QaAdoption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getQaAdoption(params)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError('Failed to load QA metrics'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params]);

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;
  if (error) return <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  if (!data) return null;

  const maxRuleGap = Math.max(...data.rules.map((r) => r.no + r.partial), 1);
  const maxOverride = Math.max(...data.overriddenChecks.map((c) => c.overrides), 1);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Decks QA'd"
          value={data.reviewedRate !== null ? `${data.reviewedRate}%` : '—'}
          sub={`${data.decksReviewed} of ${data.decks} decks`}
        />
        <StatTile
          label="Runs per reviewed deck"
          value={data.avgRunsPerReviewedDeck.toFixed(1)}
          sub="Average re-runs after fixes"
        />
        <StatTile
          label="AI fix acceptance"
          value={data.fixAcceptanceRate !== null ? `${data.fixAcceptanceRate}%` : '—'}
          sub={`${data.fixesAccepted} of ${data.fixesOffered} applyable fixes`}
        />
        <StatTile
          label="Exported with warnings"
          value={String(data.exportOverrides)}
          sub={`${data.decksWithOverrides} decks affected`}
        />
      </div>

      <PanelSection
        title="Where decks fall short"
        note="Scored from each deck's most recent QA run, so a deck that was fixed and re-run counts at its improved score."
      >
        {data.rules.length === 0 ? (
          <EmptyNote>No QA runs in this period.</EmptyNote>
        ) : (
          <div className="space-y-2">
            {data.rules.map((r) => (
              <BarRow
                key={r.ruleKey}
                label={r.ruleName}
                sub={`(${r.no} no, ${r.partial} partial of ${r.scored})`}
                value={r.no + r.partial}
                max={maxRuleGap}
                tone="amber"
              />
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection
        title="Most-overridden completeness warnings"
        note="Warnings PCMs export past most often — a high count usually means the rule is noisy rather than the deck is bad."
      >
        {data.overriddenChecks.length === 0 ? (
          <EmptyNote>No warnings have been overridden in this period.</EmptyNote>
        ) : (
          <div className="space-y-2">
            {data.overriddenChecks.map((c) => (
              <BarRow key={c.checkKey} label={c.checkName} value={c.overrides} max={maxOverride} tone="amber" />
            ))}
          </div>
        )}
      </PanelSection>
    </>
  );
}
