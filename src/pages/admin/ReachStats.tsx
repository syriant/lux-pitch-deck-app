import { useState, useEffect } from 'react';
import { getReachStats, updateReachStat, type ReachStat } from '@/api/reach-stats.api';

export function ReachStats() {
  const [items, setItems] = useState<ReachStat[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingRegion, setSavingRegion] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [savedRegion, setSavedRegion] = useState<string | null>(null);

  async function load() {
    try {
      const rows = await getReachStats();
      setItems(rows);
      setDrafts(Object.fromEntries(rows.map((r) => [r.region, r.label])));
    } catch {
      setError('Failed to load reach stats');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(region: string): Promise<void> {
    const label = drafts[region]?.trim();
    if (!label) return;
    setError('');
    setSavingRegion(region);
    try {
      const updated = await updateReachStat(region, { label });
      setItems((prev) => prev.map((r) => (r.region === region ? updated : r)));
      setSavedRegion(region);
      setTimeout(() => setSavedRegion((cur) => (cur === region ? null : cur)), 1500);
    } catch {
      setError(`Failed to save ${region}`);
    } finally {
      setSavingRegion(null);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reach Stats</h1>
        <p className="mt-1 text-sm text-gray-600">
          Member counts shown on the Reach slide map. Free-form text — e.g. <code>1.1M+</code>, <code>700k+</code>, <code>400k</code>.
        </p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
            <th className="pb-3 pr-4">Region</th>
            <th className="pb-3 pr-4">Label</th>
            <th className="pb-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const draft = drafts[item.region] ?? '';
            const dirty = draft.trim() !== item.label;
            return (
              <tr key={item.region} className="border-b border-gray-100 text-sm">
                <td className="py-3 pr-4 font-medium text-gray-900">{item.region}</td>
                <td className="py-3 pr-4">
                  <input
                    type="text"
                    value={draft}
                    maxLength={20}
                    onChange={(e) => setDrafts({ ...drafts, [item.region]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && dirty) handleSave(item.region);
                    }}
                    className="block w-32 rounded-md border border-gray-300 px-3 py-1.5 shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
                  />
                </td>
                <td className="py-3">
                  <button
                    onClick={() => handleSave(item.region)}
                    disabled={!dirty || savingRegion === item.region}
                    className="rounded-md bg-[#01B18B] px-3 py-1.5 text-xs text-white hover:bg-[#009977] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingRegion === item.region ? 'Saving…' : 'Save'}
                  </button>
                  {savedRegion === item.region && (
                    <span className="ml-2 text-xs text-[#01B18B]">Saved</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
