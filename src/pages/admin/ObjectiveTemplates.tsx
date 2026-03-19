import { useState, useEffect, type FormEvent } from 'react';
import {
  getObjectiveTemplates,
  createObjectiveTemplate,
  updateObjectiveTemplate,
  deactivateObjectiveTemplate,
  setObjectiveDifferentiators,
  type ObjectiveTemplate,
} from '@/api/objectives.api';
import { getDifferentiators, type Differentiator } from '@/api/differentiators.api';

interface FormData {
  text: string;
  category: string;
  sortOrder: number;
}

const emptyForm: FormData = { text: '', category: '', sortOrder: 0 };

const categoryLabels: Record<string, string> = {
  revenue: 'Revenue',
  volume: 'Volume',
  adr: 'ADR',
  awareness: 'Awareness',
  marketing: 'Marketing',
  audience: 'Audience',
};

export function ObjectiveTemplates() {
  const [items, setItems] = useState<ObjectiveTemplate[]>([]);
  const [allDifferentiators, setAllDifferentiators] = useState<Differentiator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deactivateTarget, setDeactivateTarget] = useState<ObjectiveTemplate | null>(null);
  const [mappingTarget, setMappingTarget] = useState<ObjectiveTemplate | null>(null);
  const [selectedDiffIds, setSelectedDiffIds] = useState<string[]>([]);

  async function load() {
    try {
      const [objectives, diffs] = await Promise.all([
        getObjectiveTemplates(),
        getDifferentiators(),
      ]);
      setItems(objectives);
      setAllDifferentiators(diffs.filter((d) => d.active));
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ ...emptyForm, sortOrder: items.length + 1 });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(item: ObjectiveTemplate) {
    setForm({
      text: item.text,
      category: item.category ?? '',
      sortOrder: item.sortOrder,
    });
    setEditingId(item.id);
    setShowForm(true);
  }

  function openMapping(item: ObjectiveTemplate) {
    setMappingTarget(item);
    setSelectedDiffIds([...item.differentiatorIds]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await updateObjectiveTemplate(editingId, {
          text: form.text,
          category: form.category || null,
          sortOrder: form.sortOrder,
        });
      } else {
        await createObjectiveTemplate({
          text: form.text,
          category: form.category || undefined,
          sortOrder: form.sortOrder,
        });
      }
      setShowForm(false);
      setLoading(true);
      await load();
    } catch {
      setError(editingId ? 'Failed to update' : 'Failed to create');
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    try {
      await deactivateObjectiveTemplate(deactivateTarget.id);
      setDeactivateTarget(null);
      setLoading(true);
      await load();
    } catch {
      setError('Failed to deactivate');
      setDeactivateTarget(null);
    }
  }

  async function handleSaveMappings() {
    if (!mappingTarget) return;
    try {
      await setObjectiveDifferentiators(mappingTarget.id, selectedDiffIds);
      setMappingTarget(null);
      setLoading(true);
      await load();
    } catch {
      setError('Failed to update mappings');
    }
  }

  function toggleDiff(id: string) {
    setSelectedDiffIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Objective Templates</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977]"
        >
          Add Template
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? 'Edit Template' : 'New Template'}</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700">Objective Text</label>
            <textarea
              rows={2}
              required
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Use {placeholders} for variable values like {year} or {target}"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
              >
                <option value="">None</option>
                <option value="revenue">Revenue</option>
                <option value="volume">Volume</option>
                <option value="adr">ADR</option>
                <option value="awareness">Awareness</option>
                <option value="marketing">Marketing</option>
                <option value="audience">Audience</option>
              </select>
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700">Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977]">
              {editingId ? 'Save Changes' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
            <th className="pb-3 pr-4 w-8">#</th>
            <th className="pb-3 pr-4">Objective</th>
            <th className="pb-3 pr-4">Category</th>
            <th className="pb-3 pr-4">Differentiators</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 text-sm">
              <td className="py-3 pr-4 text-gray-400">{item.sortOrder}</td>
              <td className="py-3 pr-4 font-medium text-gray-900">{item.text}</td>
              <td className="py-3 pr-4">
                <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {categoryLabels[item.category ?? ''] ?? item.category ?? '-'}
                </span>
              </td>
              <td className="py-3 pr-4">
                {item.differentiatorIds.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {item.differentiatorIds.map((dId) => {
                      const diff = allDifferentiators.find((d) => d.id === dId);
                      return (
                        <span key={dId} className="inline-block rounded-full bg-[#E6F9F5] px-2 py-0.5 text-xs text-[#009977]">
                          {diff?.title ?? 'Unknown'}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">None</span>
                )}
              </td>
              <td className="py-3 pr-4">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {item.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-3">
                <div className="flex gap-2">
                  <button onClick={() => openEdit(item)} className="text-[#01B18B] hover:underline text-xs">Edit</button>
                  <button onClick={() => openMapping(item)} className="text-purple-600 hover:underline text-xs">Map</button>
                  {item.active && (
                    <button onClick={() => setDeactivateTarget(item)} className="text-red-600 hover:underline text-xs">Deactivate</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Deactivate Template</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to deactivate "<span className="font-medium">{deactivateTarget.text}</span>"?
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDeactivateTarget(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeactivate} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {mappingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Map Differentiators</h3>
            <p className="mt-1 text-sm text-gray-600">"{mappingTarget.text}"</p>
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {allDifferentiators.map((diff) => (
                <label key={diff.id} className="flex items-center gap-3 rounded-md border border-gray-100 p-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDiffIds.includes(diff.id)}
                    onChange={() => toggleDiff(diff.id)}
                    className="rounded border-gray-300"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{diff.title}</div>
                    <div className="text-xs text-gray-500">{diff.category}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setMappingTarget(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveMappings} className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977]">Save Mappings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
