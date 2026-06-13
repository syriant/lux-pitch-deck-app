import { useState, useEffect } from 'react';
import { getBrandStats, updateBrandStat, type BrandStat } from '@/api/brand-stats.api';

export function BrandStats() {
  const [items, setItems] = useState<BrandStat[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);

  async function load() {
    try {
      const rows = await getBrandStats();
      setItems(rows);
      setDrafts(Object.fromEntries(rows.map((r) => [r.key, r.value])));
    } catch {
      setError('Failed to load brand stats');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(key: string): Promise<void> {
    const value = drafts[key]?.trim();
    if (!value) return;
    setError('');
    setSavingKey(key);
    try {
      const updated = await updateBrandStat(key, { value });
      setItems((prev) => prev.map((r) => (r.key === key ? updated : r)));
      setSavedKey(key);
      setTimeout(() => setSavedKey((cur) => (cur === key ? null : cur)), 1500);
    } catch {
      setError(`Failed to save ${key}`);
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Brand Stats</h1>
        <p className="mt-1 text-sm text-gray-600">
          Brand figures substituted into <code>{`{placeholder}`}</code> tokens in template text — e.g. a
          differentiator reading <em>"…{`{facebookMembers}`} Facebook members…"</em>. Free-form text such as
          <code> 1.5M</code>, <code>635K</code>, <code>200K</code>. Applies to the preview and the PPTX/PDF export.
        </p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
            <th className="pb-3 pr-4">Stat</th>
            <th className="pb-3 pr-4">Placeholder</th>
            <th className="pb-3 pr-4">Value</th>
            <th className="pb-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const draft = drafts[item.key] ?? '';
            const dirty = draft.trim() !== item.value;
            return (
              <tr key={item.key} className="border-b border-gray-100 text-sm">
                <td className="py-3 pr-4 font-medium text-gray-900">{item.label}</td>
                <td className="py-3 pr-4"><code className="text-xs text-gray-500">{`{${item.key}}`}</code></td>
                <td className="py-3 pr-4">
                  <input
                    type="text"
                    value={draft}
                    maxLength={50}
                    onChange={(e) => setDrafts({ ...drafts, [item.key]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && dirty) handleSave(item.key);
                    }}
                    className="block w-32 rounded-md border border-gray-300 px-3 py-1.5 shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
                  />
                </td>
                <td className="py-3">
                  <button
                    onClick={() => handleSave(item.key)}
                    disabled={!dirty || savingKey === item.key}
                    className="rounded-md bg-[#01B18B] px-3 py-1.5 text-xs text-white hover:bg-[#009977] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingKey === item.key ? 'Saving…' : 'Save'}
                  </button>
                  {savedKey === item.key && (
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
