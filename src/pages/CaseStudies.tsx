import { useState, useEffect, type FormEvent } from 'react';
import {
  getCaseStudies,
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  type CaseStudy,
} from '@/api/case-studies.api';
import { uploadImage, uploadUrl } from '@/api/upload.api';

interface FormData {
  title: string;
  hotelName: string;
  destination: string;
  region: string;
  propertyType: string;
  roomNights: string;
  revenue: string;
  adr: string;
  alos: string;
  leadTime: string;
  bookings: string;
  narrative: string;
  tags: string;
  images: string[];
}

const emptyForm: FormData = {
  title: '', hotelName: '', destination: '', region: '', propertyType: '',
  roomNights: '', revenue: '', adr: '', alos: '', leadTime: '', bookings: '',
  narrative: '', tags: '', images: [],
};

export function CaseStudies() {
  const [items, setItems] = useState<CaseStudy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CaseStudy | null>(null);

  async function load() {
    try {
      const res = await getCaseStudies({
        search: search || undefined,
        region: regionFilter || undefined,
        page,
        limit: 20,
      });
      setItems(res.data);
      setTotal(res.meta.total);
    } catch {
      setError('Failed to load case studies');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setLoading(true); load(); }, [page, search, regionFilter]);

  function openCreate() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(item: CaseStudy) {
    setForm({
      title: item.title,
      hotelName: item.hotelName,
      destination: item.destination ?? '',
      region: item.region ?? '',
      propertyType: item.propertyType ?? '',
      roomNights: item.roomNights?.toString() ?? '',
      revenue: item.revenue ?? '',
      adr: item.adr ?? '',
      alos: item.alos ?? '',
      leadTime: item.leadTime?.toString() ?? '',
      bookings: item.bookings?.toString() ?? '',
      narrative: item.narrative ?? '',
      tags: item.tags?.join(', ') ?? '',
      images: item.images ?? [],
    });
    setEditingId(item.id);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        title: form.title,
        hotelName: form.hotelName,
        destination: form.destination || undefined,
        region: form.region || undefined,
        propertyType: form.propertyType || undefined,
        roomNights: form.roomNights ? parseInt(form.roomNights) : undefined,
        revenue: form.revenue ? parseFloat(form.revenue) : undefined,
        adr: form.adr ? parseFloat(form.adr) : undefined,
        alos: form.alos ? parseFloat(form.alos) : undefined,
        leadTime: form.leadTime ? parseInt(form.leadTime) : undefined,
        bookings: form.bookings ? parseInt(form.bookings) : undefined,
        narrative: form.narrative || undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        images: form.images.length > 0 ? form.images : undefined,
      };

      if (editingId) {
        await updateCaseStudy(editingId, payload);
      } else {
        await createCaseStudy(payload);
      }
      setShowForm(false);
      setLoading(true);
      await load();
    } catch {
      setError(editingId ? 'Failed to update' : 'Failed to create');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCaseStudy(deleteTarget.id);
      setDeleteTarget(null);
      setLoading(true);
      await load();
    } catch {
      setError('Failed to delete');
      setDeleteTarget(null);
    }
  }

  function formatNum(val: string | null): string {
    if (!val) return '-';
    const n = Number(val);
    return isNaN(n) ? val : n.toLocaleString();
  }

  if (loading && items.length === 0) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Case Study Library</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Add Case Study
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by title or hotel..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by region..."
          value={regionFilter}
          onChange={(e) => { setRegionFilter(e.target.value); setPage(1); }}
          className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? 'Edit Case Study' : 'New Case Study'}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Hotel Name</label>
              <input type="text" required value={form.hotelName} onChange={(e) => setForm({ ...form, hotelName: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Destination</label>
              <input type="text" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Region</label>
              <input type="text" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Property Type</label>
              <input type="text" value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
              <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Room Nights</label>
              <input type="number" value={form.roomNights} onChange={(e) => setForm({ ...form, roomNights: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Revenue ($)</label>
              <input type="number" step="0.01" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ADR ($)</label>
              <input type="number" step="0.01" value={form.adr} onChange={(e) => setForm({ ...form, adr: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ALOS (days)</label>
              <input type="number" step="0.1" max="99" value={form.alos} onChange={(e) => setForm({ ...form, alos: e.target.value })}
                placeholder="e.g. 3.5"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Bookings</label>
              <input type="number" value={form.bookings} onChange={(e) => setForm({ ...form, bookings: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Narrative</label>
            <textarea rows={3} value={form.narrative} onChange={(e) => setForm({ ...form, narrative: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {form.images.map((url) => (
                <div key={url} className="relative group w-20 h-20 rounded border border-gray-200 overflow-hidden">
                  <img src={uploadUrl(url) ?? ''} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, images: form.images.filter((u) => u !== url) })}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center text-gray-400 cursor-pointer text-lg">
                +
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const result = await uploadImage(file);
                      setForm((prev) => ({ ...prev, images: [...prev.images, result.url] }));
                    } catch {
                      setError('Failed to upload image');
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              {editingId ? 'Save Changes' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No case studies yet.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-500">{total} case studies</p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
                <th className="pb-3 pr-4">Hotel</th>
                <th className="pb-3 pr-4">Destination</th>
                <th className="pb-3 pr-4">Region</th>
                <th className="pb-3 pr-4 text-right">Room Nights</th>
                <th className="pb-3 pr-4 text-right">Revenue</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 text-sm">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-900">{item.hotelName}</div>
                    <div className="text-xs text-gray-500">{item.title}</div>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{item.destination ?? '-'}</td>
                  <td className="py-3 pr-4 text-gray-600">{item.region ?? '-'}</td>
                  <td className="py-3 pr-4 text-right font-mono text-gray-700">{formatNum(item.roomNights?.toString() ?? null)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-gray-700">{item.revenue ? `$${formatNum(item.revenue)}` : '-'}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      <button onClick={() => setDeleteTarget(item)} className="text-red-600 hover:underline text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {total > 20 && (
            <div className="mt-4 flex gap-2 justify-center">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50">Prev</button>
              <span className="px-3 py-1 text-sm text-gray-500">Page {page}</span>
              <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Case Study</h3>
            <p className="mt-2 text-sm text-gray-600">
              Delete <span className="font-medium">{deleteTarget.hotelName}</span>? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
