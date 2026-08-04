import { useEffect, useMemo, useState } from 'react';
import {
  runQa,
  getLatestQa,
  applyQaFixes,
  getHygiene,
  type QaApplyFixResult,
  type QaFinding,
  type QaFixOp,
  type QaFixStatus,
  type QaFixOutcome,
  type HygieneCheck,
  type QaRun,
  type QaStatus,
} from '@/api/qa.api';

const TEAL = '#01B18B';

const STATUS_STYLE: Record<QaStatus, { label: string; badge: string; dot: string }> = {
  YES: { label: 'Yes', badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  PARTIAL: { label: 'Partial', badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  NO: { label: 'No', badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  ERROR: { label: 'Error', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

function StatusBadge({ status }: { status: QaStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/** A fix is offerable only when it carries at least one concrete apply operation. */
function isApplyable(f: QaFinding): boolean {
  return !!(f.fix?.applyable && f.fix.ops.length > 0);
}

const truncate = (s: string): string => (s.length > 60 ? `${s.slice(0, 57)}…` : s);

/** Short human label for an apply op, for the fix's op list. */
function describeOp(op: QaFixOp, optionLabels: Record<string, string>): string {
  const tier = (id: unknown): string => optionLabels[String(id)] ?? 'a tier';
  switch (op.op) {
    case 'add_objective':
      return `Add objective: "${truncate(String(op.text ?? ''))}"`;
    case 'reword_objective':
      return `Reword an objective to: "${truncate(String(op.text ?? ''))}"`;
    case 'add_differentiator':
      return 'Add a differentiator';
    case 'enable_marketing_asset':
      return `Enable marketing asset "${String(op.assetKey ?? '')}" on ${tier(op.optionId)}`;
    case 'add_inclusion':
      return `Add inclusion "${truncate(String(op.text ?? ''))}" to ${tier(op.optionId)}`;
    default:
      return op.op;
  }
}

/** One-line summary for the scorecard row: first bullet, else the narrative's lead sentence. */
function oneLine(f: QaFinding): string {
  if (f.bullets[0]) return f.bullets[0];
  const lead = f.narrative.trim().split(/(?<=[.!?])\s/)[0];
  return lead || f.narrative;
}

export function QaPanel({
  deckId,
  open,
  onClose,
  optionLabels = {},
}: {
  deckId: string;
  open: boolean;
  onClose: () => void;
  /** optionId → tier label, so applied ops read "…on Diamond" not a raw id. */
  optionLabels?: Record<string, string>;
}) {
  const [run, setRun] = useState<QaRun | null>(null);
  const [hygiene, setHygiene] = useState<HygieneCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  // Suggest-and-apply: fixes the PCM has staged (client-side), plus per-fix
  // results after a batch Apply. Both reset whenever a fresh run loads.
  const [staged, setStaged] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState<Record<string, QaApplyFixResult>>({});
  const [appliedHint, setAppliedHint] = useState(false);

  function resetStaging() {
    setStaged(new Set());
    setResults({});
    setAppliedHint(false);
  }

  useEffect(() => {
    if (!open) return;
    setError('');
    setLoading(true);
    resetStaging();
    getHygiene(deckId).then(setHygiene).catch(() => setHygiene([]));
    getLatestQa(deckId)
      .then(setRun)
      .catch(() => setError('Failed to load the latest QA run.'))
      .finally(() => setLoading(false));
  }, [open, deckId]);

  async function handleRun() {
    setRunning(true);
    setError('');
    try {
      setRun(await runQa(deckId));
      resetStaging();
      getHygiene(deckId).then(setHygiene).catch(() => {});
    } catch {
      setError('QA run failed. Make sure the deck has objectives, offer options and case studies, then try again.');
    } finally {
      setRunning(false);
    }
  }

  function toggleStage(ruleKey: string) {
    setStaged((prev) => {
      const next = new Set(prev);
      if (next.has(ruleKey)) next.delete(ruleKey);
      else next.add(ruleKey);
      return next;
    });
  }

  async function handleApply() {
    if (!run || staged.size === 0) return;
    setApplying(true);
    setError('');
    try {
      const res = await applyQaFixes(deckId, { runId: run.id, ruleKeys: [...staged] });
      setResults((prev) => {
        const next = { ...prev };
        for (const r of res.results) next[r.ruleKey] = r;
        return next;
      });
      setStaged(new Set());
      setAppliedHint(res.results.some((r) => r.status === 'applied'));
      getHygiene(deckId).then(setHygiene).catch(() => {});
    } catch {
      setError('Applying fixes failed. Re-run QA and try again.');
    } finally {
      setApplying(false);
    }
  }

  // Applyable fixes still awaiting a decision (not yet applied this session).
  // Require a concrete target op — a stale run (fix.applyable true but target
  // null) can only reject on apply, so don't offer Accept for it.
  const pendingApplyable = useMemo(
    () => (run?.findings ?? []).filter((f) => isApplyable(f) && results[f.key]?.status !== 'applied'),
    [run, results],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Deck QA</h2>
            <p className="text-xs text-gray-500">
              AI review — advisory only, it never blocks export.
              {run && <> Last run {new Date(run.createdAt).toLocaleString()}.</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white disabled:opacity-60"
              style={{ backgroundColor: TEAL }}
            >
              {running && (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {running ? 'Running…' : run ? 'Re-run QA' : 'Run QA'}
            </button>
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-5">
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {appliedHint && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Fixes applied to the deck. <span className="font-medium">Re-run QA</span> to see the updated scores.
            </div>
          )}

          {hygiene.length > 0 && <Completeness checks={hygiene} />}

          {loading && !run && <div className="text-sm text-gray-500">Loading…</div>}

          {!loading && !run && !error && (
            <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              No QA run yet. Click <span className="font-medium">Run QA</span> to score this deck.
            </div>
          )}

          {run && (
            <>
              <ScoreTable findings={run.findings} />
              <PriorityFixes fixes={run.priorityFixes} />
              <Findings
                findings={run.findings}
                staged={staged}
                results={results}
                optionLabels={optionLabels}
                onToggle={toggleStage}
              />
            </>
          )}
        </div>

        {run && pendingApplyable.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <span className="text-sm text-gray-600">
              {staged.size > 0
                ? `${staged.size} fix${staged.size === 1 ? '' : 'es'} staged`
                : `${pendingApplyable.length} applyable fix${pendingApplyable.length === 1 ? '' : 'es'} — accept to stage`}
            </span>
            <button
              onClick={handleApply}
              disabled={applying || staged.size === 0}
              className="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}
            >
              {applying && (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {applying ? 'Applying…' : `Apply ${staged.size || ''}`.trim()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// `info` checks are advisory-only: shown here but they never gate an export.
const HYGIENE_DOT: Record<HygieneCheck['status'], string> = {
  pass: 'bg-emerald-500',
  warn: 'bg-amber-500',
  info: 'bg-sky-400',
};

function Completeness({ checks }: { checks: HygieneCheck[] }) {
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">
        Completeness{' '}
        <span className={`font-normal ${warnCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
          — {warnCount === 0 ? 'all checks passed' : `${warnCount} to review`}
        </span>
      </h3>
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.key} className="flex items-start gap-2 text-sm">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${HYGIENE_DOT[c.status]}`} />
            <span className="text-gray-800">{c.name}</span>
            {c.status !== 'pass' && <span className="text-gray-500">— {c.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreTable({ findings }: { findings: QaFinding[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">Summary</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="pb-2 pr-3">Area</th>
            <th className="pb-2 pr-3">Status</th>
            <th className="pb-2">Finding</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => (
            <tr key={f.key} className="border-b border-gray-100 align-top">
              <td className="py-2 pr-3 font-medium text-gray-800">{f.name}</td>
              <td className="py-2 pr-3 whitespace-nowrap"><StatusBadge status={f.status} /></td>
              <td className="py-2 text-gray-600">{oneLine(f)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriorityFixes({ fixes }: { fixes: string[] }) {
  if (fixes.length === 0) return null;
  return (
    <div className="rounded-md border p-4" style={{ borderColor: TEAL, backgroundColor: '#E6F9F5' }}>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">Priority fixes</h3>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
        {fixes.map((fix, i) => (
          <li key={i}>{fix}</li>
        ))}
      </ol>
    </div>
  );
}

function Findings({
  findings,
  staged,
  results,
  optionLabels,
  onToggle,
}: {
  findings: QaFinding[];
  staged: Set<string>;
  results: Record<string, QaApplyFixResult>;
  optionLabels: Record<string, string>;
  onToggle: (ruleKey: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">Detailed findings</h3>
      <div className="space-y-3">
        {findings.map((f) => (
          <div key={f.key} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-900">{f.name}</span>
              <StatusBadge status={f.status} />
            </div>
            {f.bullets.length > 0 && (
              <ul className="mb-2 list-disc space-y-0.5 pl-5 text-sm text-gray-700">
                {f.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
            <p className="text-sm text-gray-600">{f.narrative}</p>
            {f.fix && (
              <FixRow
                ruleKey={f.key}
                summary={f.fix.summary}
                applyable={isApplyable(f)}
                ops={f.fix.ops}
                optionLabels={optionLabels}
                staged={staged.has(f.key)}
                result={results[f.key]}
                onToggle={onToggle}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const FIX_STATUS_STYLE: Record<QaFixStatus, { label: string; cls: string }> = {
  applied: { label: 'Applied ✓', cls: 'bg-emerald-50 text-emerald-700' },
  partial: { label: 'Partly applied', cls: 'bg-amber-50 text-amber-700' },
  skipped: { label: 'No change', cls: 'bg-gray-200 text-gray-600' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700' },
};

const OP_STATUS_STYLE: Record<QaFixOutcome, { label: string; cls: string }> = {
  applied: { label: 'applied', cls: 'text-emerald-700' },
  skipped: { label: 'no change', cls: 'text-gray-500' },
  rejected: { label: 'rejected', cls: 'text-red-600' },
};

function FixRow({
  ruleKey,
  summary,
  applyable,
  ops,
  optionLabels,
  staged,
  result,
  onToggle,
}: {
  ruleKey: string;
  summary: string;
  applyable: boolean;
  ops: QaFixOp[];
  optionLabels: Record<string, string>;
  staged: boolean;
  result?: QaApplyFixResult;
  onToggle: (ruleKey: string) => void;
}) {
  return (
    <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="text-gray-600">
          <span className="font-medium text-gray-700">Suggested fix:</span> {summary}
          {result?.reason && result.status !== 'applied' && (
            <div className="mt-1 text-xs text-gray-500">{result.reason}</div>
          )}
        </div>
        <div className="shrink-0">
          {result ? (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${FIX_STATUS_STYLE[result.status].cls}`}>
              {FIX_STATUS_STYLE[result.status].label}
            </span>
          ) : applyable ? (
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={staged}
                onChange={() => onToggle(ruleKey)}
                className="h-4 w-4 rounded border-gray-300"
                style={{ accentColor: TEAL }}
              />
              Accept
            </label>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500">
              advisory
            </span>
          )}
        </div>
      </div>

      {/* The concrete changes — before apply from the fix's ops; after, from the result. */}
      {result ? (
        result.ops.length > 0 && (
          <ul className="mt-2 space-y-1 border-t border-gray-200 pt-2">
            {result.ops.map((o, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-xs">
                <span className="text-gray-600">{o.detail}</span>
                <span className={`shrink-0 ${OP_STATUS_STYLE[o.status].cls}`} title={o.reason ?? ''}>
                  {OP_STATUS_STYLE[o.status].label}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : applyable && ops.length > 0 ? (
        <ul className="mt-2 space-y-0.5 border-t border-gray-200 pt-2 text-xs text-gray-600">
          {ops.map((o, i) => (
            <li key={i}>• {describeOp(o, optionLabels)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
