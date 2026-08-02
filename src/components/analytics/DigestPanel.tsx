import { useEffect, useState } from 'react';
import { getWeeklyDigest, type WeeklyDigest } from '@/api/analytics.api';
import { EmptyNote } from './shared';

export function DigestPanel() {
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getWeeklyDigest()
      .then((d) => { if (!cancelled) setDigest(d); })
      .catch(() => { if (!cancelled) setError('Failed to build the digest'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleCopy(): Promise<void> {
    if (!digest) return;
    try {
      await navigator.clipboard.writeText(digest.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy to the clipboard');
    }
  }

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;
  if (error) return <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  if (!digest) return null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Weekly digest</h2>
          <p className="text-sm text-gray-600">
            The last seven days, written as a summary you can send on.
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="rounded-md bg-[#01B18B] px-3 py-1.5 text-xs text-white hover:bg-[#009977]"
        >
          {copied ? 'Copied' : 'Copy text'}
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {digest.headline.map((item) => (
            <div key={item.label}>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</div>
              <div className="text-xl font-bold text-gray-900">{item.value}</div>
              {item.change && <div className="text-xs text-gray-500">{item.change}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-2 text-sm font-medium text-gray-900">Most active PCMs</div>
          {digest.topPcms.length === 0 ? (
            <EmptyNote>No decks created this week.</EmptyNote>
          ) : (
            <ul className="space-y-1 text-sm">
              {digest.topPcms.map((p) => (
                <li key={p.name} className="flex justify-between">
                  <span className="text-gray-700">{p.name}</span>
                  <span className="text-gray-500">
                    {p.pitches} {p.pitches === 1 ? 'pitch' : 'pitches'} · {p.exports} exports
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-2 text-sm font-medium text-gray-900">Most pitched hotels</div>
          {digest.topHotels.length === 0 ? (
            <EmptyNote>No hotels pitched this week.</EmptyNote>
          ) : (
            <ul className="space-y-1 text-sm">
              {digest.topHotels.map((h) => (
                <li key={h.hotel} className="flex justify-between gap-3">
                  <span className="truncate text-gray-700">{h.hotel}</span>
                  <span className="shrink-0 text-gray-500">
                    {h.pitches} {h.pitches === 1 ? 'pitch' : 'pitches'}
                    {h.won > 0 ? ` · ${h.won} won` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 text-sm font-medium text-gray-900">Plain text</div>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-700">
          {digest.text}
        </pre>
        <p className="mt-3 text-xs text-gray-500">
          Automatic weekly delivery isn&rsquo;t wired up — the tool has no outbound email yet. Copy this
          into an email for now, or tell us which provider LUX wants and we&rsquo;ll schedule it.
        </p>
      </div>
    </>
  );
}
