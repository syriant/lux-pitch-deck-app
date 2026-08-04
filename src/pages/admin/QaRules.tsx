import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  listQaRules,
  updateQaRule,
  createQaRule,
  deleteQaRule,
  listHygieneChecks,
  updateHygieneCheck,
  type QaRule,
  type HygieneCheckConfig,
  type HygieneSeverity,
} from '@/api/qa.api';

const TEAL = '#01B18B';
const TEAL_TINT = '#E6F9F5';

type Tab = 'rules' | 'hygiene';

export function QaRules() {
  const [tab, setTab] = useState<Tab>('rules');

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">QA</h1>
      <p className="text-sm text-gray-500 mb-4">
        What the QA layer checks before export. Edits take effect on the next run — no deploy.
      </p>

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {(
          [
            ['rules', 'AI rules'],
            ['hygiene', 'Completeness checks'],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${
              tab === key ? 'font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            style={tab === key ? { color: TEAL, borderColor: TEAL } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'rules' ? <RulesTab /> : <HygieneTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI rules — editable prompts, plus create and delete.

interface RuleForm {
  name: string;
  prompt: string;
  active: boolean;
  sortOrder: string;
}

function toForm(r: QaRule): RuleForm {
  return { name: r.name, prompt: r.prompt, active: r.active, sortOrder: r.sortOrder.toString() };
}

const EMPTY_NEW_RULE = { key: '', name: '', prompt: '' };

function RulesTab() {
  const [rules, setRules] = useState<QaRule[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm | null>(null);
  const [creating, setCreating] = useState(false);
  const [newRule, setNewRule] = useState(EMPTY_NEW_RULE);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState('');

  const reload = () => listQaRules().then(setRules).catch(() => setError('Failed to load QA rules'));

  useEffect(() => {
    reload();
  }, []);

  // Select the first rule once loaded.
  useEffect(() => {
    if (!creating && !selectedKey && rules[0]) {
      setSelectedKey(rules[0].key);
      setForm(toForm(rules[0]));
    }
  }, [rules, selectedKey, creating]);

  const selected = useMemo(() => rules.find((r) => r.key === selectedKey) ?? null, [rules, selectedKey]);

  const dirty = useMemo(() => {
    if (!form || !selected) return false;
    return (
      form.name !== selected.name ||
      form.prompt !== selected.prompt ||
      form.active !== selected.active ||
      Number(form.sortOrder) !== selected.sortOrder
    );
  }, [form, selected]);

  function select(key: string) {
    const found = rules.find((r) => r.key === key);
    if (!found) return;
    setCreating(false);
    setSelectedKey(key);
    setForm(toForm(found));
    setSavedAt(null);
  }

  function startCreate() {
    setCreating(true);
    setSelectedKey(null);
    setForm(null);
    setNewRule(EMPTY_NEW_RULE);
    setSavedAt(null);
    setError('');
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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await createQaRule({
        key: newRule.key.trim(),
        name: newRule.name.trim(),
        prompt: newRule.prompt,
      });
      await reload();
      setCreating(false);
      setSelectedKey(created.key);
      setForm(toForm(created));
    } catch (err) {
      setError(extractApiError(err, 'Failed to create rule'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedKey) return;
    setSaving(true);
    setError('');
    try {
      await deleteQaRule(selectedKey);
      setConfirmDelete(false);
      setSelectedKey(null);
      setForm(null);
      await reload();
    } catch (err) {
      setConfirmDelete(false);
      setError(extractApiError(err, 'Failed to delete rule'));
    } finally {
      setSaving(false);
    }
  }

  const keyValid = /^[a-z0-9_]{1,50}$/.test(newRule.key.trim());

  return (
    <>
      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

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
          <button
            onClick={startCreate}
            className={`w-full text-left px-3 py-2 rounded-md text-sm border border-dashed ${
              creating ? 'font-medium' : 'text-gray-500 hover:bg-gray-50 border-gray-300'
            }`}
            style={creating ? { backgroundColor: TEAL_TINT, color: TEAL, borderColor: TEAL } : undefined}
          >
            + New rule
          </button>
        </aside>

        {creating ? (
          <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold">New QA rule</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Key</label>
                <input
                  type="text"
                  value={newRule.key}
                  onChange={(e) => setNewRule({ ...newRule, key: e.target.value })}
                  placeholder="e.g. seasonal_relevance"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lowercase letters, digits and underscores. Permanent once created.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g. Seasonal relevance"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rule prompt</label>
              <textarea
                rows={12}
                value={newRule.prompt}
                onChange={(e) => setNewRule({ ...newRule, prompt: e.target.value })}
                placeholder={'What should the AI review, and how should it decide YES / PARTIAL / NO?'}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !keyValid || !newRule.name.trim() || !newRule.prompt.trim()}
                className="rounded-md px-4 py-2 text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: TEAL }}
              >
                {saving ? 'Creating…' : 'Create rule'}
              </button>
              {newRule.key.trim() && !keyValid && (
                <span className="text-xs text-red-600">Key can only contain a–z, 0–9 and _</span>
              )}
            </div>
          </form>
        ) : form && selected ? (
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

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={saving || !dirty || !form.name.trim() || !form.prompt.trim()}
                className="rounded-md px-4 py-2 text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: TEAL }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete rule
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {confirmDelete && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete “{selected.name}”?</h3>
            <p className="mt-2 text-sm text-gray-600">
              The rule stops running from the next QA pass. Past runs keep their findings, and this can’t be
              undone — to pause a rule instead, untick “Active”.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Deleting…' : 'Delete rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Completeness checks — configurable name / enabled / severity / threshold.
// The predicates are fixed in code; new checks need a code change.

interface CheckDraft {
  name: string;
  enabled: boolean;
  severity: HygieneSeverity;
  threshold: string;
}

function toDraft(c: HygieneCheckConfig): CheckDraft {
  return {
    name: c.name ?? '',
    enabled: c.enabled,
    severity: c.severity,
    threshold: (c.threshold ?? c.defaultThreshold ?? '').toString(),
  };
}

function isDirty(c: HygieneCheckConfig, d: CheckDraft): boolean {
  return (
    (c.name ?? '') !== d.name.trim() ||
    c.enabled !== d.enabled ||
    c.severity !== d.severity ||
    (c.hasThreshold && (c.threshold ?? c.defaultThreshold ?? '').toString() !== d.threshold)
  );
}

function HygieneTab() {
  const [checks, setChecks] = useState<HygieneCheckConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CheckDraft>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listHygieneChecks()
      .then((list) => {
        setChecks(list);
        setDrafts(Object.fromEntries(list.map((c) => [c.key, toDraft(c)])));
      })
      .catch(() => setError('Failed to load completeness checks'));
  }, []);

  function patchDraft(key: string, patch: Partial<CheckDraft>) {
    setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  async function handleSave(check: HygieneCheckConfig) {
    const draft = drafts[check.key];
    if (!draft) return;
    setSavingKey(check.key);
    setError('');
    try {
      const threshold = draft.threshold.trim() === '' ? null : Number(draft.threshold);
      const updated = await updateHygieneCheck(check.key, {
        name: draft.name.trim() === '' ? null : draft.name.trim(),
        enabled: draft.enabled,
        severity: draft.severity,
        ...(check.hasThreshold ? { threshold } : {}),
      });
      setChecks((list) => list.map((c) => (c.key === check.key ? updated : c)));
      setDrafts((d) => ({ ...d, [check.key]: toDraft(updated) }));
    } catch (err) {
      setError(extractApiError(err, 'Failed to save check'));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div>
      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <p className="mb-4 text-sm text-gray-500">
        Deterministic checks run in the QA panel and at export. <span className="font-medium">Warn</span> holds
        the export behind an “Export anyway” acknowledgment; <span className="font-medium">Info</span> is shown
        but never holds. Adding a brand-new check needs a code change — for free-text criteria, add an AI rule
        instead.
      </p>

      <div className="space-y-2">
        {checks.map((check) => {
          const draft = drafts[check.key];
          if (!draft) return null;
          const dirty = isDirty(check, draft);
          return (
            <div
              key={check.key}
              className={`rounded-lg border bg-white p-4 ${draft.enabled ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}
            >
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[220px] flex-1">
                  <label className="block text-xs font-medium text-gray-500">Name</label>
                  <input
                    type="text"
                    value={draft.name}
                    placeholder={check.defaultName}
                    onChange={(e) => patchDraft(check.key, { name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    <span className="font-mono">{check.key}</span> — {check.description}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500">Severity</label>
                  <select
                    value={draft.severity}
                    onChange={(e) => patchDraft(check.key, { severity: e.target.value as HygieneSeverity })}
                    className="mt-1 block rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="warn">Warn — holds export</option>
                    <option value="info">Info — advisory only</option>
                  </select>
                </div>

                {check.hasThreshold && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      {check.thresholdLabel ?? 'Threshold'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={draft.threshold}
                      onChange={(e) => patchDraft(check.key, { threshold: e.target.value })}
                      className="mt-1 block w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 pb-1.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(e) => patchDraft(check.key, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                    style={{ accentColor: TEAL }}
                  />
                  Enabled
                </label>

                <button
                  onClick={() => handleSave(check)}
                  disabled={!dirty || savingKey === check.key}
                  className="rounded-md px-4 py-1.5 text-sm text-white disabled:opacity-40"
                  style={{ backgroundColor: TEAL }}
                >
                  {savingKey === check.key ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
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
