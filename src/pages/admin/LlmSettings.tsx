import { useEffect, useState, type FormEvent } from 'react';
import {
  listLlmSettings,
  updateLlmSetting,
  listLlmUsage,
  type LlmSetting,
  type LlmUsageRow,
} from '@/api/llm.api';

interface FormState {
  provider: 'anthropic' | 'openai';
  model: string;
  temperature: string;
  maxTokens: string;
  systemPrompt: string;
  userPromptTemplate: string;
  inputCostPerMtok: string;
  outputCostPerMtok: string;
}

function toForm(s: LlmSetting): FormState {
  return {
    provider: (s.provider as 'anthropic' | 'openai') ?? 'anthropic',
    model: s.model,
    temperature: s.temperature,
    maxTokens: s.maxTokens.toString(),
    systemPrompt: s.systemPrompt,
    userPromptTemplate: s.userPromptTemplate,
    inputCostPerMtok: s.inputCostPerMtok ?? '',
    outputCostPerMtok: s.outputCostPerMtok ?? '',
  };
}

export function LlmSettings() {
  const [settings, setSettings] = useState<LlmSetting[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState('');

  const [usage, setUsage] = useState<LlmUsageRow[]>([]);
  const [totals, setTotals] = useState({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: 0 });
  const [usageKey, setUsageKey] = useState<string>('');
  const [tab, setTab] = useState<'usage' | 'settings'>('usage');

  useEffect(() => {
    listLlmSettings().then((rows) => {
      setSettings(rows);
      if (rows.length > 0 && !selectedKey) {
        setSelectedKey(rows[0].key);
        setForm(toForm(rows[0]));
      }
    }).catch(() => setError('Failed to load settings'));
  }, []);

  useEffect(() => {
    listLlmUsage({ settingKey: usageKey || undefined, limit: 50 })
      .then((res) => {
        setUsage(res.data);
        setTotals(res.meta.totals);
      })
      .catch(() => {});
  }, [usageKey, savedAt]);

  function selectSetting(key: string) {
    const found = settings.find((s) => s.key === key);
    if (!found) return;
    setSelectedKey(key);
    setForm(toForm(found));
    setSavedAt(null);
    setError('');
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form || !selectedKey) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateLlmSetting(selectedKey, {
        provider: form.provider,
        model: form.model,
        temperature: Number(form.temperature),
        maxTokens: Number(form.maxTokens),
        systemPrompt: form.systemPrompt,
        userPromptTemplate: form.userPromptTemplate,
        inputCostPerMtok: form.inputCostPerMtok ? Number(form.inputCostPerMtok) : null,
        outputCostPerMtok: form.outputCostPerMtok ? Number(form.outputCostPerMtok) : null,
      });
      setSettings((prev) => prev.map((s) => (s.key === updated.key ? updated : s)));
      setSavedAt(Date.now());
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">LLM</h1>

      <div className="border-b border-gray-200 mb-6 flex gap-6">
        <button
          type="button"
          onClick={() => setTab('usage')}
          className={`-mb-px pb-2 border-b-2 text-sm ${
            tab === 'usage'
              ? 'border-[#01B18B] text-[#01B18B] font-medium'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Usage
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`-mb-px pb-2 border-b-2 text-sm ${
            tab === 'settings'
              ? 'border-[#01B18B] text-[#01B18B] font-medium'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Settings
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {tab === 'settings' && (
      <div className="grid grid-cols-[220px_1fr] gap-6 mb-10">
        <aside className="space-y-1">
          {settings.map((s) => (
            <button
              key={s.key}
              onClick={() => selectSetting(s.key)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                s.key === selectedKey
                  ? 'bg-[#E6F9F5] text-[#01B18B] font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div>{s.key}</div>
              <div className="text-xs text-gray-500">{s.provider} · {s.model}</div>
            </button>
          ))}
        </aside>

        {form && selectedKey ? (
          <form onSubmit={handleSave} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedKey}</h2>
              {savedAt && <span className="text-xs text-[#01B18B]">Saved</span>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Provider</label>
                <select
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value as 'anthropic' | 'openai' })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Model</label>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Temperature</label>
                <input
                  type="number" step="0.1" min="0" max="2"
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Tokens</label>
                <input
                  type="number" min="1"
                  value={form.maxTokens}
                  onChange={(e) => setForm({ ...form, maxTokens: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Input $/Mtok</label>
                <input
                  type="number" step="0.01" min="0"
                  value={form.inputCostPerMtok}
                  onChange={(e) => setForm({ ...form, inputCostPerMtok: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Output $/Mtok</label>
                <input
                  type="number" step="0.01" min="0"
                  value={form.outputCostPerMtok}
                  onChange={(e) => setForm({ ...form, outputCostPerMtok: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">System Prompt</label>
              <textarea
                rows={4}
                value={form.systemPrompt}
                onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                User Prompt Template
                <span className="ml-2 text-xs text-gray-500">use {'{{varName}}'} for interpolated values</span>
              </label>
              <textarea
                rows={8}
                value={form.userPromptTemplate}
                onChange={(e) => setForm({ ...form, userPromptTemplate: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        ) : (
          <div className="text-sm text-gray-500">No LLM settings configured yet.</div>
        )}
      </div>
      )}

      {tab === 'usage' && (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Usage</h2>
          <select
            value={usageKey}
            onChange={(e) => setUsageKey(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All settings</option>
            {settings.map((s) => (
              <option key={s.key} value={s.key}>{s.key}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <Stat label="Input tokens" value={totals.inputTokens.toLocaleString()} />
          <Stat label="Output tokens" value={totals.outputTokens.toLocaleString()} />
          <Stat label="Cache reads" value={totals.cacheReadTokens.toLocaleString()} />
          <Stat label="Total cost" value={`$${totals.costUsd.toFixed(4)}`} accent />
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 pr-3">When</th>
              <th className="pb-2 pr-3">Setting</th>
              <th className="pb-2 pr-3">Model</th>
              <th className="pb-2 pr-3 text-right">In</th>
              <th className="pb-2 pr-3 text-right">Out</th>
              <th className="pb-2 pr-3 text-right">Cache</th>
              <th className="pb-2 pr-3 text-right">Cost</th>
              <th className="pb-2 pr-3 text-right">Latency</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {usage.length === 0 ? (
              <tr><td colSpan={9} className="py-6 text-center text-gray-400">No usage yet.</td></tr>
            ) : usage.map((row) => (
              <tr key={row.id} className="border-b border-gray-100">
                <td className="py-2 pr-3 text-gray-600">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-3 font-mono text-xs text-gray-700">{row.settingKey}</td>
                <td className="py-2 pr-3 font-mono text-xs text-gray-700">{row.model}</td>
                <td className="py-2 pr-3 text-right font-mono">{row.inputTokens.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right font-mono">{row.outputTokens.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right font-mono">{row.cacheReadTokens.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right font-mono">{row.costUsd ? `$${Number(row.costUsd).toFixed(4)}` : '—'}</td>
                <td className="py-2 pr-3 text-right font-mono">{row.latencyMs ? `${row.latencyMs}ms` : '—'}</td>
                <td className="py-2">
                  {row.success ? (
                    <span className="text-xs text-[#01B18B]">ok</span>
                  ) : (
                    <span className="text-xs text-red-600" title={row.errorMessage ?? ''}>error</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${accent ? 'border-[#01B18B] bg-[#E6F9F5]' : 'border-gray-200 bg-gray-50'}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-semibold ${accent ? 'text-[#01B18B]' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
