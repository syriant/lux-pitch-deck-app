import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { listQaRules, updateQaRule, type QaRule } from '@/api/qa.api';

const TEAL = '#01B18B';
const TEAL_TINT = '#E6F9F5';

interface RuleForm {
  name: string;
  prompt: string;
  active: boolean;
  sortOrder: string;
}

function toForm(r: QaRule): RuleForm {
  return { name: r.name, prompt: r.prompt, active: r.active, sortOrder: r.sortOrder.toString() };
}

export function QaRules() {
  const [rules, setRules] = useState<QaRule[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState('');

  const reload = () => listQaRules().then(setRules).catch(() => setError('Failed to load QA rules'));

  useEffect(() => {
    reload();
  }, []);

  // Select the first rule once loaded.
  useEffect(() => {
    if (!selectedKey && rules[0]) {
      setSelectedKey(rules[0].key);
      setForm(toForm(rules[0]));
    }
  }, [rules, selectedKey]);

  const selected = useMemo(() => rules.find((r) => r.key === selectedKey) ?? null, [rules, selectedKey]);

  function select(key: string) {
    const found = rules.find((r) => r.key === key);
    if (!found) return;
    setSelectedKey(key);
    setForm(toForm(found));
    setSavedAt(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form || !selectedKey) return;
    setSaving(true);
    setError('');
    try {
      await updateQaRule(selectedKey, {
        name: form.name,
        prompt: form.prompt,
        active: form.active,
        sortOrder: Number(form.sortOrder),
      });
      await reload();
      setSavedAt(Date.now());
    } catch (err) {
      setError(extractApiError(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">QA Rules</h1>
      <p className="text-sm text-gray-500 mb-6">
        Prompts the AI QA layer runs against each deck before export. Edits take effect on the next run — no deploy.
      </p>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {rules.length === 0 ? (
        <div className="text-sm text-gray-500">No QA rules configured yet.</div>
      ) : (
        <div className="grid grid-cols-[240px_1fr] gap-6">
          <aside className="space-y-1">
            {rules.map((r) => (
              <button
                key={r.key}
                onClick={() => select(r.key)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  r.key === selectedKey ? 'font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
                style={r.key === selectedKey ? { backgroundColor: TEAL_TINT, color: TEAL } : undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{r.name}</span>
                  {!r.active && <span className="text-xs text-gray-400">off</span>}
                </div>
                <div className="text-xs text-gray-500 font-mono">{r.key}</div>
              </button>
            ))}
          </aside>

          {form && selected ? (
            <form onSubmit={handleSave} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold font-mono">{selected.key}</h2>
                {savedAt && <span className="text-xs" style={{ color: TEAL }}>Saved</span>}
              </div>

              <div className="grid grid-cols-[1fr_120px] gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sort order</label>
                  <input
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                  style={{ accentColor: TEAL }}
                />
                Active — included when QA runs
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rule prompt</label>
                <textarea
                  rows={16}
                  value={form.prompt}
                  onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !form.name.trim() || !form.prompt.trim()}
                className="rounded-md px-4 py-2 text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: TEAL }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          ) : null}
        </div>
      )}
    </div>
  );
}

function extractApiError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = (err as { response?: { data?: { message?: string | string[] } } }).response;
    const msg = r?.data?.message;
    if (Array.isArray(msg)) return msg.join('; ');
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}
