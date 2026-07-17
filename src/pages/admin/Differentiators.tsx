import { useState, useEffect, type FormEvent } from 'react';
import {
  getDifferentiators,
  updateDifferentiator,
  deactivateDifferentiator,
  bulkCreateDifferentiators,
  bulkDeactivateDifferentiators,
  type Differentiator,
} from '@/api/differentiators.api';

interface StagedRow {
  title: string;
  description: string;
  category: string;
}

const emptyRow: StagedRow = { title: '', description: '', category: '' };

const categoryLabels: Record<string, string> = {
  unique_capability: 'Unique Capability',
  reach: 'Reach',
  demographics: 'Demographics',
  marketing: 'Marketing',
  results: 'Results',
};

const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]';

/**
 * Parse pasted lines into staged rows. Each line: strip a leading bullet, then
 * split on the first spaced dash (–, —, or -) into Title (before) and
 * Description (after). No category is inferred, so all default to none.
 */
function parseDifferentiatorLines(text: string): StagedRow[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const noBullet = line.replace(/^[••*-]\s+/, '').trim();
      const sep = noBullet.match(/\s[–—-]\s/);
      if (sep && sep.index !== undefined) {
        return {
          title: noBullet.slice(0, sep.index).trim(),
          description: noBullet.slice(sep.index + sep[0].length).trim(),
          category: '',
        };
      }
      return { title: noBullet, description: '', category: '' };
    })
    .filter((r) => r.title);
}

export function Differentiators() {
  const [items, setItems] = useState<Differentiator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editing an existing row
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StagedRow>(emptyRow);

  // Bulk add
  const [bulkOpen, setBulkOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [staged, setStaged] = useState<StagedRow[]>([]);
  const [manual, setManual] = useState<StagedRow>(emptyRow);
  const [submitting, setSubmitting] = useState(false);

  // Deactivation
  const [deactivateTarget, setDeactivateTarget] = useState<Differentiator | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);

  async function load() {
    try {
      const rows = await getDifferentiators();
      // Active rows first; within each group keep the API's sort order.
      setItems([...rows].sort((a, b) => Number(b.active) - Number(a.active)));
    } catch {
      setError('Failed to load differentiators');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ---- Edit existing ----
  function openEdit(item: Differentiator) {
    setEditForm({ title: item.title, description: item.description ?? '', category: item.category ?? '' });
    setEditingId(item.id);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!editingId) return;
    try {
      await updateDifferentiator(editingId, {
        title: editForm.title,
        description: editForm.description || null,
        category: editForm.category || null,
      });
      setEditingId(null);
      setLoading(true);
      await load();
    } catch {
      setError('Failed to update');
    }
  }

  // ---- Bulk add ----
  function addPasted() {
    const parsed = parseDifferentiatorLines(pasteText);
    if (parsed.length === 0) return;
    setStaged((s) => [...s, ...parsed]);
    setPasteText('');
  }

  function addManual() {
    if (!manual.title.trim()) return;
    setStaged((s) => [...s, { ...manual, title: manual.title.trim() }]);
    setManual(emptyRow);
  }

  function updateStaged(i: number, patch: Partial<StagedRow>) {
    setStaged((s) => s.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeStaged(i: number) {
    setStaged((s) => s.filter((_, idx) => idx !== i));
  }

  function closeBulk() {
    setBulkOpen(false);
    setStaged([]);
    setPasteText('');
    setManual(emptyRow);
  }

  async function submitStaged() {
    const rows = staged.filter((r) => r.title.trim());
    if (rows.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      await bulkCreateDifferentiators(
        rows.map((r) => ({
          title: r.title.trim(),
          description: r.description.trim() || undefined,
          category: r.category || undefined,
        })),
      );
      closeBulk();
      setLoading(true);
      await load();
    } catch {
      setError('Failed to create differentiators');
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Deactivate ----
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

  async function handleReactivate(item: Differentiator) {
    setError('');
    try {
      await updateDifferentiator(item.id, { active: true });
      setLoading(true);
      await load();
    } catch {
      setError('Failed to reactivate');
    }
  }

  async function handleBulkDeactivate() {
    try {
      await bulkDeactivateDifferentiators([...selected]);
      setBulkDeactivateOpen(false);
      setSelected(new Set());
      setLoading(true);
      await load();
    } catch {
      setError('Failed to deactivate selected');
      setBulkDeactivateOpen(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const activeItems = items.filter((i) => i.active);
  const allActiveSelected = activeItems.length > 0 && activeItems.every((i) => selected.has(i.id));
  function toggleSelectAll() {
    setSelected(allActiveSelected ? new Set() : new Set(activeItems.map((i) => i.id)));
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  const stagedValidCount = staged.filter((r) => r.title.trim()).length;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Differentiators</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={() => setBulkDeactivateOpen(true)}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              Deactivate selected ({selected.size})
            </button>
          )}
          {!bulkOpen && (
            <button
              onClick={() => setBulkOpen(true)}
              className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977]"
            >
              Add differentiators
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* ---- Bulk add panel ---- */}
      {bulkOpen && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Add differentiators</h2>
            <button onClick={closeBulk} className="text-sm text-gray-500 hover:underline">Close</button>
          </div>

          {/* Paste */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Paste a list</label>
            <p className="text-xs text-gray-500 mb-1">
              One per line. Title before the dash, description after (e.g. “• Demand Creation – Create demand…”). Category defaults to none.
            </p>
            <textarea
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="• Demand Creation – Create demand before travellers choose a destination or hotel."
              className={inputCls}
            />
            <button
              type="button"
              onClick={addPasted}
              disabled={!pasteText.trim()}
              className="mt-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Add pasted lines
            </button>
          </div>

          {/* Manual add row */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Or add one manually</label>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[180px]">
                <input
                  type="text"
                  value={manual.title}
                  onChange={(e) => setManual({ ...manual, title: e.target.value })}
                  placeholder="Title"
                  className={inputCls}
                />
              </div>
              <div className="flex-[2] min-w-[220px]">
                <input
                  type="text"
                  value={manual.description}
                  onChange={(e) => setManual({ ...manual, description: e.target.value })}
                  placeholder="Description"
                  className={inputCls}
                />
              </div>
              <div className="w-44">
                <select
                  value={manual.category}
                  onChange={(e) => setManual({ ...manual, category: e.target.value })}
                  className={inputCls}
                >
                  <option value="">No category</option>
                  {Object.entries(categoryLabels).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={addManual}
                disabled={!manual.title.trim()}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Add row
              </button>
            </div>
          </div>

          {/* Staged rows */}
          {staged.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">To be created ({staged.length})</div>
              <div className="space-y-2">
                {staged.map((row, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) => updateStaged(i, { title: e.target.value })}
                      placeholder="Title"
                      className="flex-1 min-w-[160px] rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateStaged(i, { description: e.target.value })}
                      placeholder="Description"
                      className="flex-[2] min-w-[200px] rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <select
                      value={row.category}
                      onChange={(e) => updateStaged(i, { category: e.target.value })}
                      className="w-40 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">No category</option>
                      {Object.entries(categoryLabels).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeStaged(i)}
                      className="text-red-600 hover:underline text-xs px-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={submitStaged}
              disabled={stagedValidCount === 0 || submitting}
              className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-40"
            >
              {submitting ? 'Creating…' : `Create ${stagedValidCount} differentiator${stagedValidCount === 1 ? '' : 's'}`}
            </button>
            <button type="button" onClick={closeBulk} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---- Edit existing form ---- */}
      {editingId && (
        <form onSubmit={handleEditSubmit} className="mb-6 rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">Edit Differentiator</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              required
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="w-56">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              className={inputCls}
            >
              <option value="">None</option>
              {Object.entries(categoryLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977]">
              Save Changes
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
            <th className="pb-3 pr-3 w-8">
              <input type="checkbox" checked={allActiveSelected} onChange={toggleSelectAll} aria-label="Select all active" />
            </th>
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
              <td className="py-3 pr-3">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelected(item.id)}
                  disabled={!item.active}
                  aria-label={`Select ${item.title}`}
                />
              </td>
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
                  <button onClick={() => openEdit(item)} className="text-[#01B18B] hover:underline text-xs">
                    Edit
                  </button>
                  {item.active ? (
                    <button onClick={() => setDeactivateTarget(item)} className="text-red-600 hover:underline text-xs">
                      Deactivate
                    </button>
                  ) : (
                    <button onClick={() => handleReactivate(item)} className="text-[#01B18B] hover:underline text-xs">
                      Reactivate
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
              It will no longer appear in new decks, and its objective mappings will be removed.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDeactivateTarget(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDeactivate} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeactivateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Deactivate {selected.size} differentiator{selected.size === 1 ? '' : 's'}</h3>
            <p className="mt-2 text-sm text-gray-600">
              The selected differentiators will no longer appear in new decks, and their objective mappings will be removed.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setBulkDeactivateOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleBulkDeactivate} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
