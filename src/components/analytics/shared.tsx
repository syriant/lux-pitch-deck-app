export function StatTile({ label, value, sub, change }: {
  label: string;
  value: string;
  sub?: string;
  change?: { pct: number; direction: 'up' | 'down' | 'flat' } | null;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {change && change.direction !== 'flat' && (
          <span
            className={`text-xs font-medium ${change.direction === 'up' ? 'text-[#01B18B]' : 'text-red-500'}`}
            title="Change against the previous period of equal length"
          >
            {change.direction === 'up' ? '▲' : '▼'} {Math.abs(change.pct)}%
          </span>
        )}
        {change && change.direction === 'flat' && (
          <span className="text-xs text-gray-400" title="Unchanged from the previous period">
            no change
          </span>
        )}
      </div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

/** Change of `current` against `previous`, or null when there's nothing to compare. */
export function deltaOf(current: number, previous: number | undefined | null):
  { pct: number; direction: 'up' | 'down' | 'flat' } | null {
  if (previous === undefined || previous === null) return null;
  if (previous === 0) return current === 0 ? { pct: 0, direction: 'flat' } : null;
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  if (pct === 0) return { pct: 0, direction: 'flat' };
  return { pct, direction: pct > 0 ? 'up' : 'down' };
}

export function BarRow({ label, value, max, sub, tone = 'teal' }: {
  label: string;
  value: number;
  max: number;
  sub?: string;
  tone?: 'teal' | 'amber';
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  const fill = tone === 'amber' ? 'bg-amber-400' : 'bg-[#01B18B]';
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-56 shrink-0 truncate text-gray-600" title={label}>
        {label}
        {sub && <span className="ml-1 text-xs text-gray-400">{sub}</span>}
      </div>
      <div className="h-5 flex-1 rounded bg-gray-100">
        <div className={`h-5 rounded ${fill}`} style={{ width: `${pct}%` }} title={`${label}: ${value}`} />
      </div>
      <div className="w-12 shrink-0 text-right font-medium text-gray-900">{value}</div>
    </div>
  );
}

export function PanelSection({ title, note, children }: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-medium text-gray-900">{title}</div>
      {children}
      {note && <p className="mt-3 text-xs text-gray-500">{note}</p>}
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500">{children}</p>;
}
