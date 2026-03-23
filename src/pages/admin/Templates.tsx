import { useState, useEffect, type FormEvent } from 'react';
import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type DeckTemplate,
  type TemplateSlide,
} from '@/api/templates.api';

const ALL_SLIDE_TYPES: Array<{ type: string; label: string; defaultPerProperty?: boolean }> = [
  { type: 'cover', label: 'Cover' },
  { type: 'hotel-intro', label: 'Hotel Introduction' },
  { type: 'market-challenges', label: 'Market Challenges' },
  { type: 'differentiators', label: 'Why Partner With Us' },
  { type: 'reach', label: 'Our Reach' },
  { type: 'demographics', label: 'Our Customers' },
  { type: 'region-stats', label: 'Destination & LE', defaultPerProperty: true },
  { type: 'case-study', label: 'Case Studies', defaultPerProperty: true },
  { type: 'objectives', label: 'Campaign Objectives' },
  { type: 'campaign-options', label: 'Campaign Options Overview' },
  { type: 'deal-options', label: 'Deal Options', defaultPerProperty: true },
  { type: 'marketing-assets', label: 'Campaign Details', defaultPerProperty: true },
];

interface FormData {
  name: string;
  description: string;
  slides: TemplateSlide[];
  defaults: Array<{ key: string; value: string }>;
  sortOrder: number;
}

const emptyForm: FormData = {
  name: '',
  description: '',
  slides: ALL_SLIDE_TYPES.map((s) => ({
    type: s.type,
    label: s.label,
    perProperty: s.defaultPerProperty,
  })),
  defaults: [],
  sortOrder: 0,
};

export function Templates() {
  const [items, setItems] = useState<DeckTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deactivateTarget, setDeactivateTarget] = useState<DeckTemplate | null>(null);

  async function load() {
    try {
      setItems(await getAllTemplates());
    } catch {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ ...emptyForm, sortOrder: items.length });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(item: DeckTemplate) {
    setForm({
      name: item.name,
      description: item.description ?? '',
      slides: item.slides,
      defaults: Object.entries(item.defaults ?? {}).map(([key, value]) => ({ key, value })),
      sortOrder: item.sortOrder,
    });
    setEditingId(item.id);
    setShowForm(true);
  }

  function toggleSlide(type: string) {
    setForm((prev) => {
      const exists = prev.slides.find((s) => s.type === type);
      if (exists) {
        return { ...prev, slides: prev.slides.filter((s) => s.type !== type) };
      }
      const def = ALL_SLIDE_TYPES.find((s) => s.type === type);
      return {
        ...prev,
        slides: [...prev.slides, {
          type,
          label: def?.label ?? type,
          perProperty: def?.defaultPerProperty,
        }],
      };
    });
  }

  function toggleRequired(type: string) {
    setForm((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.type === type ? { ...s, required: !s.required } : s,
      ),
    }));
  }

  function togglePerProperty(type: string) {
    setForm((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.type === type ? { ...s, perProperty: !s.perProperty } : s,
      ),
    }));
  }

  function moveSlide(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= form.slides.length) return;
    setForm((prev) => {
      const next = [...prev.slides];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return { ...prev, slides: next };
    });
  }

  function addDefault() {
    setForm((prev) => ({ ...prev, defaults: [...prev.defaults, { key: '', value: '' }] }));
  }

  function removeDefault(index: number) {
    setForm((prev) => ({ ...prev, defaults: prev.defaults.filter((_, i) => i !== index) }));
  }

  function updateDefault(index: number, field: 'key' | 'value', val: string) {
    setForm((prev) => ({
      ...prev,
      defaults: prev.defaults.map((d, i) => i === index ? { ...d, [field]: val } : d),
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const defaults = form.defaults.reduce<Record<string, string>>((acc, d) => {
      if (d.key.trim()) acc[d.key.trim()] = d.value;
      return acc;
    }, {});

    try {
      if (editingId) {
        await updateTemplate(editingId, {
          name: form.name,
          description: form.description || null,
          slides: form.slides,
          defaults: Object.keys(defaults).length > 0 ? defaults : null,
          sortOrder: form.sortOrder,
        });
      } else {
        await createTemplate({
          name: form.name,
          description: form.description || undefined,
          slides: form.slides,
          defaults: Object.keys(defaults).length > 0 ? defaults : undefined,
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
      await deleteTemplate(deactivateTarget.id);
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
        <h1 className="text-2xl font-bold text-gray-900">Deck Templates</h1>
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

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
              />
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

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
            />
          </div>

          {/* Slide builder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Slides</label>
            <div className="space-y-1">
              {form.slides.map((slide, i) => (
                <div key={slide.type} className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 bg-gray-50">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveSlide(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">
                      &uarr;
                    </button>
                    <button type="button" onClick={() => moveSlide(i, 1)} disabled={i === form.slides.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">
                      &darr;
                    </button>
                  </div>
                  <span className="text-sm flex-1">{slide.label}</span>
                  <span className="text-xs text-gray-400">{slide.type}</span>
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input type="checkbox" checked={!!slide.required} onChange={() => toggleRequired(slide.type)} className="rounded" />
                    Req
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input type="checkbox" checked={!!slide.perProperty} onChange={() => togglePerProperty(slide.type)} className="rounded" />
                    Per-prop
                  </label>
                  <button type="button" onClick={() => toggleSlide(slide.type)} className="text-red-400 hover:text-red-600 text-xs">
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Add missing slide types */}
            {ALL_SLIDE_TYPES.filter((s) => !form.slides.find((fs) => fs.type === s.type)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {ALL_SLIDE_TYPES.filter((s) => !form.slides.find((fs) => fs.type === s.type)).map((s) => (
                  <button
                    key={s.type}
                    type="button"
                    onClick={() => toggleSlide(s.type)}
                    className="rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-[#01B18B] hover:text-[#01B18B]"
                  >
                    + {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Defaults editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Default Text</label>
              <button type="button" onClick={addDefault} className="text-xs text-[#01B18B] hover:underline">
                + Add default
              </button>
            </div>
            {form.defaults.length === 0 ? (
              <p className="text-xs text-gray-400">No template defaults set</p>
            ) : (
              <div className="space-y-2">
                {form.defaults.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={d.key}
                      onChange={(e) => updateDefault(i, 'key', e.target.value)}
                      placeholder="Key (e.g. cover.tagline)"
                      className="w-48 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-[#01B18B] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={d.value}
                      onChange={(e) => updateDefault(i, 'value', e.target.value)}
                      placeholder="Default value"
                      className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-[#01B18B] focus:outline-none"
                    />
                    <button type="button" onClick={() => removeDefault(i)} className="text-red-400 hover:text-red-600 text-xs px-1">
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            <th className="pb-3 pr-4">Name</th>
            <th className="pb-3 pr-4">Slides</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 text-sm">
              <td className="py-3 pr-4 text-gray-400">{item.sortOrder}</td>
              <td className="py-3 pr-4">
                <div className="font-medium text-gray-900">{item.name}</div>
                {item.description && (
                  <div className="mt-0.5 text-xs text-gray-500 line-clamp-1">{item.description}</div>
                )}
              </td>
              <td className="py-3 pr-4">
                <div className="flex flex-wrap gap-1">
                  {item.slides.map((s) => (
                    <span key={s.type} className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                      {s.type}
                    </span>
                  ))}
                </div>
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
            <h3 className="text-lg font-semibold text-gray-900">Deactivate Template</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to deactivate <span className="font-medium">{deactivateTarget.name}</span>?
              Existing decks using it will keep working, but it won't appear for new decks.
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
