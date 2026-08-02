import { useEffect, useState } from 'react';
import {
  getWizardSteps, getAiUsage, getInactiveUsers,
  type AnalyticsRangeParams, type WizardStepFunnel, type AiUsageReport, type InactiveUsersReport,
  type InactiveUser,
} from '@/api/analytics.api';
import { BarRow, PanelSection, EmptyNote } from './shared';

const AI_FEATURE_LABELS: Record<string, string> = {
  lux_voice_rewrite: 'LUX voice rewrite',
  lux_translate: 'Translation',
  qa_evaluate: 'QA review',
  case_study_narrative: 'Case study narrative',
  case_study_from_pdf: 'Case study from PDF',
  case_study_summary_from_pdf: 'Case study summary from PDF',
  case_study_from_pdf_auto: 'Case study from PDF (auto)',
};

function formatWhen(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * "Never" is only honest for someone with no events and no decks. A user who
 * was active before activity tracking existed has no events but does have
 * decks, so fall back to their deck history rather than calling them a non-user.
 */
function lastSeenLabel(user: InactiveUser): string {
  if (user.lastActiveAt) return `Last seen ${formatWhen(user.lastActiveAt)}`;
  if (user.lastDeckActivityAt) return `Last deck edit ${formatWhen(user.lastDeckActivityAt)}`;
  return 'Never used the tool';
}

export function AdoptionPanel({ params, onOpenPcm }: {
  params: AnalyticsRangeParams;
  onOpenPcm: (userId: string) => void;
}) {
  const [steps, setSteps] = useState<WizardStepFunnel | null>(null);
  const [ai, setAi] = useState<AiUsageReport | null>(null);
  const [inactive, setInactive] = useState<InactiveUsersReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([getWizardSteps(params), getAiUsage(params), getInactiveUsers(30)])
      .then(([s, a, i]) => {
        if (cancelled) return;
        setSteps(s);
        setAi(a);
        setInactive(i);
      })
      .catch(() => { if (!cancelled) setError('Failed to load adoption metrics'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params]);

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;
  if (error) return <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>;

  const anySteps = (steps?.steps ?? []).some((s) => s.completed > 0);

  return (
    <>
      <PanelSection
        title="Wizard step completion"
        note="Counted once per deck when a PCM moves forward past a step. Step tracking starts from release 1.1.18, so decks built earlier show no steps."
      >
        {!steps || steps.decksCreated === 0 ? (
          <EmptyNote>No decks created in this period.</EmptyNote>
        ) : !anySteps ? (
          <EmptyNote>
            No wizard steps recorded yet — this fills in as PCMs build decks from now on.
          </EmptyNote>
        ) : (
          <div className="space-y-2">
            <BarRow label="Decks created" value={steps.decksCreated} max={steps.decksCreated} />
            {steps.steps.map((s) => (
              <BarRow
                key={s.step}
                label={`${s.step}. ${s.label}`}
                value={s.completed}
                max={steps.decksCreated}
              />
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection
        title="AI usage and acceptance"
        note="Acceptance is only measurable where the PCM makes an explicit keep-or-revert choice (the voice rewrite today); other features show a dash."
      >
        {!ai || ai.features.length === 0 ? (
          <EmptyNote>No AI calls in this period.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Feature</th>
                  <th className="py-2 pr-4 text-right">Calls</th>
                  <th className="py-2 pr-4 text-right">Failures</th>
                  <th className="py-2 pr-4 text-right">Cost</th>
                  <th className="py-2 pr-4 text-right">Avg latency</th>
                  <th className="py-2 text-right">Kept</th>
                </tr>
              </thead>
              <tbody>
                {ai.features.map((f) => (
                  <tr key={f.feature} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-4 text-gray-700">{AI_FEATURE_LABELS[f.feature] ?? f.feature}</td>
                    <td className="py-2 pr-4 text-right font-medium text-gray-900">{f.calls}</td>
                    <td className={`py-2 pr-4 text-right ${f.failures > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      {f.failures}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-700">${f.costUsd.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right text-gray-500">
                      {f.avgLatencyMs > 0 ? `${(f.avgLatencyMs / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="py-2 text-right text-gray-700" title={`${f.accepted} kept, ${f.reverted} reverted`}>
                      {f.acceptanceRate !== null ? `${f.acceptanceRate}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelSection>

      <PanelSection
        title="Dormant PCMs"
        note="Nothing recorded in the last 30 days. Where there are no tracked events — anyone whose last visit predates activity tracking — this falls back to when they last touched one of their decks."
      >
        {!inactive || inactive.dormant.filter((u) => u.active).length === 0 ? (
          <EmptyNote>Every active user has been seen in the last 30 days.</EmptyNote>
        ) : (
          <div className="space-y-1.5">
            {inactive.dormant.filter((u) => u.active).map((u) => (
              <button
                key={u.userId}
                onClick={() => onOpenPcm(u.userId)}
                className="flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span>
                  <span className="text-gray-800">{u.name}</span>
                  {u.roles.includes('admin') && (
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">admin</span>
                  )}
                  <span className="ml-2 text-xs text-gray-500">
                    {u.decks} {u.decks === 1 ? 'deck' : 'decks'}
                  </span>
                </span>
                <span className="text-xs text-gray-400">{lastSeenLabel(u)}</span>
              </button>
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection title="Never created a deck">
        {!inactive || inactive.neverCreatedADeck.filter((u) => u.active).length === 0 ? (
          <EmptyNote>Every active user has created at least one deck.</EmptyNote>
        ) : (
          <div className="space-y-1.5">
            {inactive.neverCreatedADeck.filter((u) => u.active).map((u) => (
              <div
                key={u.userId}
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <span className="text-gray-800">{u.name}</span>
                <span className="text-xs text-gray-400">
                  {u.lastLoginAt ? `Last login ${formatWhen(u.lastLoginAt)}` : 'Never logged in'}
                </span>
              </div>
            ))}
          </div>
        )}
      </PanelSection>
    </>
  );
}
