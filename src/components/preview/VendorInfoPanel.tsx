import { useEffect, useState } from 'react';
import {
  generateVendorResearch,
  getLatestVendorResearch,
  updateVendorResearchItems,
  type VendorResearch,
  type VendorResearchItem,
} from '@/api/vendor-research.api';

const TEAL = '#01B18B';

const CATEGORY_STYLE: Record<string, string> = {
  'press-release': 'bg-sky-50 text-sky-700',
  investor: 'bg-violet-50 text-violet-700',
  leadership: 'bg-emerald-50 text-emerald-700',
  market: 'bg-amber-50 text-amber-700',
  other: 'bg-gray-100 text-gray-600',
};

/**
 * Vendor-information panel: web-research briefing on the hotel and its parent
 * group for negotiation prep. Internal only — nothing here appears in any
 * export. Items are reorderable so the PCM can put the most useful finding
 * first; order and removals persist to the run.
 */
export function VendorInfoPanel({ deckId, open, onClose }: { deckId: string; open: boolean; onClose: () => void }) {
  const [research, setResearch] = useState<VendorResearch | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || loaded) return;
    getLatestVendorResearch(deckId)
      .then((r) => setResearch(r))
      .catch(() => setResearch(null))
      .finally(() => setLoaded(true));
  }, [open, loaded, deckId]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      setResearch(await generateVendorResearch(deckId));
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Research failed — try again in a moment.');
    } finally {
      setGenerating(false);
    }
  }

  function persistItems(next: VendorResearchItem[]) {
    if (!research) return;
    const prev = research.items;
    setResearch({ ...research, items: next });
    updateVendorResearchItems(deckId, research.id, next).catch(() => {
      setResearch((r) => (r ? { ...r, items: prev } : r));
    });
  }

  function move(index: number, dir: -1 | 1) {
    if (!research) return;
    const target = index + dir;
    if (target < 0 || target >= research.items.length) return;
    const next = research.items.slice();
    [next[index], next[target]] = [next[target], next[index]];
    persistItems(next);
  }

  function remove(index: number) {
    if (!research) return;
    persistItems(research.items.filter((_, i) => i !== index));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="mt-8 w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Vendor information</h2>
            <p className="text-xs text-gray-500">
              Web research on the hotel and its parent group for your negotiation prep. Internal only — never exported.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {research && (
              <button
                onClick={generate}
                disabled={generating}
                className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
                style={{ borderColor: TEAL, color: TEAL }}
              >
                {generating ? 'Researching…' : 'Regenerate'}
              </button>
            )}
            <button onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {!loaded ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
          ) : !research ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-600">
                Search the web for recent press releases, investor notices, leadership statements and market news about this
                hotel and its parent group.
              </p>
              <p className="mt-1 text-xs text-gray-400">Takes up to a minute and uses paid web searches — run it when you need it.</p>
              <button
                onClick={generate}
                disabled={generating}
                className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: TEAL }}
              >
                {generating ? 'Researching…' : 'Generate vendor information'}
              </button>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-gray-400">
                Generated {new Date(research.createdAt).toLocaleString()} — verify anything before you rely on it in the room.
              </p>
              {research.intro && <p className="mb-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700">{research.intro}</p>}

              {research.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">All items removed — regenerate to search again.</p>
              ) : (
                <ul className="space-y-3">
                  {research.items.map((item, i) => (
                    <li key={`${item.title}-${i}`} className="rounded-md border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                            {item.category && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE.other}`}>
                                {item.category}
                              </span>
                            )}
                            {item.date && <span className="text-[10px] text-gray-400">{item.date}</span>}
                          </div>
                          <p className="mt-1 text-sm text-gray-700">{item.summary}</p>
                          {(item.url || item.source) && (
                            <p className="mt-1 text-xs">
                              {item.url ? (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: TEAL }}>
                                  {item.source ?? item.url}
                                </a>
                              ) : (
                                <span className="text-gray-500">{item.source}</span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            title="Move up"
                            className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => move(i, 1)}
                            disabled={i === research.items.length - 1}
                            title="Move down"
                            className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => remove(i)}
                            title="Remove this item"
                            className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
