import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  listLlmSettings,
  updateLlmSetting,
  listLlmUsage,
  listLlmUsageFacets,
  listLlmProviderModels,
  createLlmProviderModel,
  updateLlmProviderModel,
  deleteLlmProviderModel,
  pingLlmProviderModel,
  type LlmSetting,
  type LlmProviderModel,
  type LlmProvider,
  type LlmUsageRow,
  type UsageFacets,
} from '@/api/llm.api';
import { ConfirmModal } from '@/components/common/ConfirmModal';

type Tab = 'usage' | 'models' | 'settings';

const PROVIDER_LABEL: Record<LlmProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
};

const TEAL = '#01B18B';
const TEAL_DARK = '#009977';
const TEAL_TINT = '#E6F9F5';

export function LlmSettings() {
  const [tab, setTab] = useState<Tab>('usage');
  const [settings, setSettings] = useState<LlmSetting[]>([]);
  const [models, setModels] = useState<LlmProviderModel[]>([]);
  const [error, setError] = useState('');

  const reloadSettings = () => listLlmSettings().then(setSettings).catch(() => setError('Failed to load settings'));
  const reloadModels = () => listLlmProviderModels().then(setModels).catch(() => setError('Failed to load models'));

  useEffect(() => {
    reloadSettings();
    reloadModels();
  }, []);

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">LLM</h1>

      <div className="border-b border-gray-200 mb-6 flex gap-6">
        <TabButton active={tab === 'usage'} onClick={() => setTab('usage')}>Usage</TabButton>
        <TabButton active={tab === 'models'} onClick={() => setTab('models')}>Models</TabButton>
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>Systems</TabButton>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {tab === 'usage' && <UsageTab settings={settings} />}
      {tab === 'models' && (
        <ModelsTab
          models={models}
          settings={settings}
          onChange={reloadModels}
          onError={setError}
        />
      )}
      {tab === 'settings' && (
        <SettingsTab
          settings={settings}
          models={models}
          onSaved={reloadSettings}
          onError={setError}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px pb-2 border-b-2 text-sm ${
        active ? `border-[${TEAL}] text-[${TEAL}] font-medium` : 'border-transparent text-gray-500 hover:text-gray-900'
      }`}
      style={active ? { borderColor: TEAL, color: TEAL } : undefined}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Models tab
// ============================================================================

interface NewModelForm {
  provider: LlmProvider;
  modelId: string;
  displayName: string;
  inputCostPerMtok: string;
  outputCostPerMtok: string;
  cacheReadCostPerMtok: string;
  notes: string;
}

const EMPTY_MODEL_FORM: NewModelForm = {
  provider: 'anthropic',
  modelId: '',
  displayName: '',
  inputCostPerMtok: '',
  outputCostPerMtok: '',
  cacheReadCostPerMtok: '',
  notes: '',
};

function ModelsTab({
  models, settings, onChange, onError,
}: {
  models: LlmProviderModel[];
  settings: LlmSetting[];
  onChange: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<NewModelForm>(EMPTY_MODEL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NewModelForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);

  const usageByModelId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of settings) {
      if (s.primaryModelId) map.set(s.primaryModelId, [...(map.get(s.primaryModelId) ?? []), `${s.key} (primary)`]);
      if (s.fallbackModelId) map.set(s.fallbackModelId, [...(map.get(s.fallbackModelId) ?? []), `${s.key} (fallback)`]);
    }
    return map;
  }, [settings]);

  const grouped = useMemo(() => {
    const out: Record<LlmProvider, LlmProviderModel[]> = { anthropic: [], openai: [], google: [] };
    for (const m of models) {
      if (m.provider in out) out[m.provider].push(m);
    }
    return out;
  }, [models]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createLlmProviderModel({
        provider: form.provider,
        modelId: form.modelId.trim(),
        displayName: form.displayName.trim(),
        inputCostPerMtok: form.inputCostPerMtok ? Number(form.inputCostPerMtok) : null,
        outputCostPerMtok: form.outputCostPerMtok ? Number(form.outputCostPerMtok) : null,
        cacheReadCostPerMtok: form.cacheReadCostPerMtok ? Number(form.cacheReadCostPerMtok) : null,
        notes: form.notes || null,
      });
      setForm(EMPTY_MODEL_FORM);
      onChange();
    } catch (err) {
      onError(extractApiError(err, 'Failed to add model'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePing(id: string) {
    setPingingId(id);
    try {
      await pingLlmProviderModel(id);
      onChange();
    } catch (err) {
      onError(extractApiError(err, 'Ping failed'));
      onChange(); // reload to show the recorded failure
    } finally {
      setPingingId(null);
    }
  }

  async function performDelete() {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteLlmProviderModel(id);
      onChange();
    } catch (err) {
      onError(extractApiError(err, 'Delete failed'));
    }
  }

  function startEdit(m: LlmProviderModel) {
    setEditingId(m.id);
    setEditForm({
      provider: m.provider,
      modelId: m.modelId,
      displayName: m.displayName,
      inputCostPerMtok: m.inputCostPerMtok ?? '',
      outputCostPerMtok: m.outputCostPerMtok ?? '',
      cacheReadCostPerMtok: m.cacheReadCostPerMtok ?? '',
      notes: m.notes ?? '',
    });
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;
    try {
      await updateLlmProviderModel(editingId, {
        provider: editForm.provider,
        modelId: editForm.modelId.trim(),
        displayName: editForm.displayName.trim(),
        inputCostPerMtok: editForm.inputCostPerMtok ? Number(editForm.inputCostPerMtok) : null,
        outputCostPerMtok: editForm.outputCostPerMtok ? Number(editForm.outputCostPerMtok) : null,
        cacheReadCostPerMtok: editForm.cacheReadCostPerMtok ? Number(editForm.cacheReadCostPerMtok) : null,
        notes: editForm.notes || null,
      });
      setEditingId(null);
      setEditForm(null);
      onChange();
    } catch (err) {
      onError(extractApiError(err, 'Save failed'));
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
        <h2 className="text-lg font-semibold">Add model</h2>
        <p className="text-sm text-gray-500">
          Add a model id, then click <span className="font-medium">Ping</span> on the row to verify it's reachable.
          Only validated models can be selected as a system's primary or fallback.
        </p>
        <div className="grid grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">Provider</label>
            <select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value as LlmProvider })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {(Object.keys(PROVIDER_LABEL) as LlmProvider[]).map((p) => (
                <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700">Model id</label>
            <input
              required
              type="text"
              placeholder="e.g. claude-sonnet-4-5-20250929"
              value={form.modelId}
              onChange={(e) => setForm({ ...form, modelId: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm font-mono"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-700">Display name</label>
            <input
              required
              type="text"
              placeholder="e.g. Claude Sonnet 4.5"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">Input $/Mtok</label>
            <input
              type="number" step="0.01" min="0"
              value={form.inputCostPerMtok}
              onChange={(e) => setForm({ ...form, inputCostPerMtok: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Output $/Mtok</label>
            <input
              type="number" step="0.01" min="0"
              value={form.outputCostPerMtok}
              onChange={(e) => setForm({ ...form, outputCostPerMtok: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700" title="Optional — defaults to 10% of input">Cache read $/Mtok</label>
            <input
              type="number" step="0.01" min="0"
              placeholder="auto"
              value={form.cacheReadCostPerMtok}
              onChange={(e) => setForm({ ...form, cacheReadCostPerMtok: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-700">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md px-4 py-2 text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: TEAL }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = TEAL_DARK; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = TEAL; }}
        >
          {submitting ? 'Adding…' : 'Add model'}
        </button>
      </form>

      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete model"
        message={confirmDelete ? `Delete "${confirmDelete.label}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={performDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {(Object.keys(PROVIDER_LABEL) as LlmProvider[]).map((p) => (
        <div key={p} className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-3">{PROVIDER_LABEL[p]}</h2>
          {grouped[p].length === 0 ? (
            <div className="text-sm text-gray-400">No models yet.</div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Display name</th>
                  <th className="pb-2 pr-3">Model id</th>
                  <th className="pb-2 pr-3 text-right">In $/M</th>
                  <th className="pb-2 pr-3 text-right">Out $/M</th>
                  <th className="pb-2 pr-3">Last ping</th>
                  <th className="pb-2 pr-3">Used by</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {grouped[p].map((m) => {
                  const isEditing = editingId === m.id;
                  const usedBy = usageByModelId.get(m.id) ?? [];
                  return (
                    <tr key={m.id} className="border-b border-gray-100 align-top">
                      <td className="py-2 pr-3"><StatusBadge model={m} /></td>
                      <td className="py-2 pr-3">
                        {isEditing && editForm ? (
                          <input
                            value={editForm.displayName}
                            onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                        ) : m.displayName}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs text-gray-700">
                        {isEditing && editForm ? (
                          <input
                            value={editForm.modelId}
                            onChange={(e) => setEditForm({ ...editForm, modelId: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs"
                          />
                        ) : m.modelId}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {isEditing && editForm ? (
                          <input
                            type="number" step="0.01" min="0"
                            value={editForm.inputCostPerMtok}
                            onChange={(e) => setEditForm({ ...editForm, inputCostPerMtok: e.target.value })}
                            className="w-20 rounded border border-gray-300 px-1 py-1 text-right text-xs"
                          />
                        ) : formatCost(m.inputCostPerMtok)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {isEditing && editForm ? (
                          <input
                            type="number" step="0.01" min="0"
                            value={editForm.outputCostPerMtok}
                            onChange={(e) => setEditForm({ ...editForm, outputCostPerMtok: e.target.value })}
                            className="w-20 rounded border border-gray-300 px-1 py-1 text-right text-xs"
                          />
                        ) : formatCost(m.outputCostPerMtok)}
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-500">
                        {m.lastValidatedAt ? (
                          <span title={m.lastValidationError ?? ''}>
                            {timeAgo(m.lastValidatedAt)}
                            {m.lastValidationLatencyMs != null && (
                              <span className="ml-1 text-gray-400">({m.lastValidationLatencyMs}ms)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">never</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-600">
                        {usedBy.length === 0 ? <span className="text-gray-400">—</span> : usedBy.join(', ')}
                      </td>
                      <td className="py-2 whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="rounded px-2 py-1 text-xs text-white"
                              style={{ backgroundColor: TEAL }}
                            >Save</button>
                            <button
                              type="button"
                              onClick={() => { setEditingId(null); setEditForm(null); }}
                              className="ml-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"
                            >Cancel</button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePing(m.id)}
                              disabled={pingingId === m.id}
                              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >{pingingId === m.id ? 'Pinging…' : 'Ping'}</button>
                            <button
                              type="button"
                              onClick={() => startEdit(m)}
                              className="ml-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                            >Edit</button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete({ id: m.id, label: m.displayName })}
                              disabled={usedBy.length > 0}
                              title={usedBy.length > 0 ? `In use by: ${usedBy.join(', ')}` : ''}
                              className="ml-1 rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ model }: { model: LlmProviderModel }) {
  if (model.lastValidationSuccess === true) {
    return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">✓ validated</span>;
  }
  if (model.lastValidationSuccess === false) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
        title={model.lastValidationError ?? ''}
      >✗ failed</span>
    );
  }
  return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">untested</span>;
}

// ============================================================================
// Settings (systems) tab
// ============================================================================

interface SettingsForm {
  primaryModelId: string;
  fallbackModelId: string;
  temperature: string;
  maxTokens: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

function toSettingsForm(s: LlmSetting): SettingsForm {
  return {
    primaryModelId: s.primaryModelId,
    fallbackModelId: s.fallbackModelId ?? '',
    temperature: s.temperature,
    maxTokens: s.maxTokens.toString(),
    systemPrompt: s.systemPrompt,
    userPromptTemplate: s.userPromptTemplate,
  };
}

function SettingsTab({
  settings, models, onSaved, onError,
}: {
  settings: LlmSetting[];
  models: LlmProviderModel[];
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(settings[0]?.key ?? null);
  const [form, setForm] = useState<SettingsForm | null>(settings[0] ? toSettingsForm(settings[0]) : null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedKey && settings[0]) {
      setSelectedKey(settings[0].key);
      setForm(toSettingsForm(settings[0]));
    }
  }, [settings, selectedKey]);

  const validatedModels = useMemo(
    () => models.filter((m) => m.lastValidationSuccess === true),
    [models],
  );

  function selectSetting(key: string) {
    const found = settings.find((s) => s.key === key);
    if (!found) return;
    setSelectedKey(key);
    setForm(toSettingsForm(found));
    setSavedAt(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form || !selectedKey) return;
    setSaving(true);
    try {
      await updateLlmSetting(selectedKey, {
        primaryModelId: form.primaryModelId,
        fallbackModelId: form.fallbackModelId || null,
        temperature: Number(form.temperature),
        maxTokens: Number(form.maxTokens),
        systemPrompt: form.systemPrompt,
        userPromptTemplate: form.userPromptTemplate,
      });
      onSaved();
      setSavedAt(Date.now());
    } catch (err) {
      onError(extractApiError(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  }

  if (settings.length === 0) {
    return <div className="text-sm text-gray-500">No LLM systems configured yet.</div>;
  }

  return (
    <div className="grid grid-cols-[220px_1fr] gap-6">
      <aside className="space-y-1">
        {settings.map((s) => (
          <button
            key={s.key}
            onClick={() => selectSetting(s.key)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm ${
              s.key === selectedKey ? 'font-medium' : 'text-gray-700 hover:bg-gray-50'
            }`}
            style={s.key === selectedKey ? { backgroundColor: TEAL_TINT, color: TEAL } : undefined}
          >
            <div>{s.key}</div>
            <div className="text-xs text-gray-500">
              {s.primaryModel ? `${PROVIDER_LABEL[s.primaryModel.provider as LlmProvider]} · ${s.primaryModel.displayName}` : '—'}
            </div>
          </button>
        ))}
      </aside>

      {form && selectedKey ? (
        <form onSubmit={handleSave} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selectedKey}</h2>
            {savedAt && <span className="text-xs" style={{ color: TEAL }}>Saved</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Primary model</label>
              <ModelSelect
                value={form.primaryModelId}
                onChange={(v) => setForm({ ...form, primaryModelId: v })}
                models={validatedModels}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fallback model (optional)</label>
              <ModelSelect
                value={form.fallbackModelId}
                onChange={(v) => setForm({ ...form, fallbackModelId: v })}
                models={validatedModels.filter((m) => m.id !== form.primaryModelId)}
                allowEmpty
              />
            </div>
          </div>

          {validatedModels.length === 0 && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              No validated models yet. Add one in the Models tab and click <span className="font-medium">Ping</span>.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-700">Max tokens</label>
              <input
                type="number" min="1"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">System prompt</label>
            <textarea
              rows={4}
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              User prompt template
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
            disabled={saving || !form.primaryModelId}
            className="rounded-md px-4 py-2 text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function ModelSelect({
  value, onChange, models, allowEmpty,
}: {
  value: string;
  onChange: (v: string) => void;
  models: LlmProviderModel[];
  allowEmpty?: boolean;
}) {
  const byProvider = useMemo(() => {
    const out: Record<LlmProvider, LlmProviderModel[]> = { anthropic: [], openai: [], google: [] };
    for (const m of models) {
      if (m.provider in out) out[m.provider].push(m);
    }
    return out;
  }, [models]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
    >
      {allowEmpty && <option value="">— None —</option>}
      {!allowEmpty && !value && <option value="" disabled>Select a model…</option>}
      {(Object.keys(PROVIDER_LABEL) as LlmProvider[]).map((p) => (
        byProvider[p].length > 0 ? (
          <optgroup key={p} label={PROVIDER_LABEL[p]}>
            {byProvider[p].map((m) => (
              <option key={m.id} value={m.id}>{m.displayName} ({m.modelId})</option>
            ))}
          </optgroup>
        ) : null
      ))}
    </select>
  );
}

// ============================================================================
// Usage tab (unchanged behaviour)
// ============================================================================

const USAGE_PAGE_SIZE = 50;

function UsageTab({ settings }: { settings: LlmSetting[] }) {
  const [usage, setUsage] = useState<LlmUsageRow[]>([]);
  const [totals, setTotals] = useState({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: 0 });
  const [total, setTotal] = useState(0);
  const [usageKey, setUsageKey] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [deckId, setDeckId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [facets, setFacets] = useState<UsageFacets>({ users: [], decks: [] });

  // Reset to the first page whenever a filter changes.
  useEffect(() => { setPage(1); }, [usageKey, userId, deckId]);

  useEffect(() => {
    listLlmUsageFacets().then(setFacets).catch(() => {});
  }, []);

  useEffect(() => {
    listLlmUsage({
      settingKey: usageKey || undefined,
      userId: userId || undefined,
      deckId: deckId || undefined,
      page,
      limit: USAGE_PAGE_SIZE,
    })
      .then((res) => {
        setUsage(res.data);
        setTotals(res.meta.totals);
        setTotal(res.meta.total);
      })
      .catch(() => {});
  }, [usageKey, userId, deckId, page]);

  const pageCount = Math.max(1, Math.ceil(total / USAGE_PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * USAGE_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * USAGE_PAGE_SIZE, total);
  const selectClass = 'rounded-md border border-gray-300 px-3 py-1.5 text-sm';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold">Usage</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select value={usageKey} onChange={(e) => setUsageKey(e.target.value)} className={selectClass}>
            <option value="">All systems</option>
            {settings.map((s) => (
              <option key={s.key} value={s.key}>{s.key}</option>
            ))}
          </select>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={selectClass}>
            <option value="">All users</option>
            {facets.users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select value={deckId} onChange={(e) => setDeckId(e.target.value)} className={selectClass}>
            <option value="">All decks</option>
            {facets.decks.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
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
            <th className="pb-2 pr-3">System</th>
            <th className="pb-2 pr-3">User</th>
            <th className="pb-2 pr-3">Deck</th>
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
            <tr><td colSpan={11} className="py-6 text-center text-gray-400">No usage yet.</td></tr>
          ) : usage.map((row) => (
            <tr key={row.id} className="border-b border-gray-100">
              <td className="py-2 pr-3 text-gray-600">{new Date(row.createdAt).toLocaleString()}</td>
              <td className="py-2 pr-3 font-mono text-xs text-gray-700">{row.settingKey}</td>
              <td className="py-2 pr-3 text-gray-700" title={row.user?.email ?? ''}>{row.user?.name ?? '—'}</td>
              <td className="py-2 pr-3 text-gray-700">
                {row.deck ? (
                  <a
                    href={`/decks/${row.deck.id}/preview`}
                    className="hover:underline"
                    style={{ color: TEAL }}
                    title={row.deck.name ?? row.deck.id}
                  >
                    {row.deck.name ?? '(deleted deck)'}
                  </a>
                ) : '—'}
              </td>
              <td className="py-2 pr-3 font-mono text-xs text-gray-700">{row.model}</td>
              <td className="py-2 pr-3 text-right font-mono">{row.inputTokens.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right font-mono">{row.outputTokens.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right font-mono">{row.cacheReadTokens.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right font-mono">{row.costUsd ? `$${Number(row.costUsd).toFixed(4)}` : '—'}</td>
              <td className="py-2 pr-3 text-right font-mono">{row.latencyMs ? `${row.latencyMs}ms` : '—'}</td>
              <td className="py-2">
                {row.success ? (
                  <span className="text-xs" style={{ color: TEAL }}>ok</span>
                ) : (
                  <span className="text-xs text-red-600" title={row.errorMessage ?? ''}>error</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
        <span>{total === 0 ? 'No results' : `${rangeStart}–${rangeEnd} of ${total.toLocaleString()}`}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
          >
            Prev
          </button>
          <span>Page {page} of {pageCount}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
            className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-md border p-3"
      style={accent ? { borderColor: TEAL, backgroundColor: TEAL_TINT } : { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold" style={accent ? { color: TEAL } : undefined}>{value}</div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatCost(v: string | null): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '—';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
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
