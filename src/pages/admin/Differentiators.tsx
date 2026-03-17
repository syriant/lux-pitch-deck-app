import { useState, useEffect, type FormEvent } from 'react';
import {
  getDifferentiators,
  createDifferentiator,
  updateDifferentiator,
  deactivateDifferentiator,
  type Differentiator,
} from '@/api/differentiators.api';

interface FormData {
  title: string;
  description: string;
  category: string;
  sortOrder: number;
}

const emptyForm: FormData = { title: '', description: '', category: '', sortOrder: 0 };

const categoryLabels: Record<string, string> = {
  unique_capability: 'Unique Capability',
  reach: 'Reach',
  demographics: 'Demographics',
  marketing: 'Marketing',
  results: 'Results',
};

export function Differentiators() {
  const [items, setItems] = useState<Differentiator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deactivateTarget, setDeactivateTarget] = useState<Differentiator | null>(null);

  async function load() {
    try {
      setItems(await getDifferentiators());
    } catch {
      setError('Failed to load differentiators');
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

  function openEdit(item: Differentiator) {
    setForm({
      title: item.title,
      description: item.description ?? '',
      category: item.category ?? '',
      sortOrder: item.sortOrder,
    });
    setEditingId(item.id);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await updateDifferentiator(editingId, {
          title: form.title,
          description: form.description || null,
          category: form.category || null,
          sortOrder: form.sortOrder,
        });
      } else {
        await createDifferentiator({
          title: form.title,
          description: form.description || undefined,
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
      await deactivateDifferentiator(deactivateTarget.id);
      setDeactivateTarget(null);
      setLoading(true);
      await load();
    } catch {
      setError('Failed to deactivate');
      setDeactivateTarget(null);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Differentiators</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Add Differentiator
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? 'Edit Differentiator' : 'New Differentiator'}</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">None</option>
                <option value="unique_capability">Unique Capability</option>
                <option value="reach">Reach</option>
                <option value="demographics">Demographics</option>
                <option value="marketing">Marketing</option>
                <option value="results">Results</option>
              </select>
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700">Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
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
            <th className="pb-3 pr-4">Title</th>
            <th className="pb-3 pr-4">Category</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 text-sm">
              <td className="py-3 pr-4 text-gray-400">{item.sortOrder}</td>
              <td className="py-3 pr-4">
                <div className="font-medium text-gray-900">{item.title}</div>
                {item.description && (
                  <div className="mt-0.5 text-xs text-gray-500 line-clamp-1">{item.description}</div>
                )}
              </td>
              <td className="py-3 pr-4">
                <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {categoryLabels[item.category ?? ''] ?? item.category ?? '-'}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {item.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-3">
                <div className="flex gap-2">
                  <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-xs">
                    Edit
                  </button>
                  {item.active && (
                    <button onClick={() => setDeactivateTarget(item)} className="text-red-600 hover:underline text-xs">
                      Deactivate
                    </button>
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
            <h3 className="text-lg font-semibold text-gray-900">Deactivate Differentiator</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to deactivate <span className="font-medium">{deactivateTarget.title}</span>?
              It will no longer appear in new decks.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setDeactivateTarget(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
