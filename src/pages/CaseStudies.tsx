import { useState, useEffect, type FormEvent } from 'react';
import {
  getCaseStudies,
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  parseCaseStudyPdf,
  type CaseStudy,
  type CaseStudyDraft,
  type DuplicateCandidate,
} from '@/api/case-studies.api';
import { fetchTableauMetrics } from '@/api/tableau.api';
import { getDestinations, type DestinationOption } from '@/api/deal-tiers.api';
import { uploadUrl } from '@/api/upload.api';
import { DestinationCombobox } from '@/components/common/DestinationCombobox';
import { Spinner } from '@/components/common/Spinner';
import { ImagePicker } from '@/components/case-studies/ImagePicker';

interface FormData {
  title: string;
  hotelName: string;
  destination: string;
  propertyType: string;
  dealId: string;
  roomNights: string;
  revenue: string;
  adr: string;
  alos: string;
  leadTime: string;
  bookings: string;
  packagesSold: string;
  upgradePercentage: string;
  narrative: string;
  tags: string;
  images: string[];
}

const emptyForm: FormData = {
  title: '', hotelName: '', destination: '', propertyType: '', dealId: '',
  roomNights: '', revenue: '', adr: '', alos: '', leadTime: '', bookings: '',
  packagesSold: '', upgradePercentage: '',
  narrative: '', tags: '', images: [],
};

export function CaseStudies() {
  const [items, setItems] = useState<CaseStudy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CaseStudy | null>(null);
  const [destinationOptions, setDestinationOptions] = useState<string[]>([]);
  const [fetchingMetrics, setFetchingMetrics] = useState(false);
  const [metricsMessage, setMetricsMessage] = useState('');
  const [parsingPdf, setParsingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState('');
  const [pendingDuplicates, setPendingDuplicates] = useState<DuplicateCandidate[] | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Parameters<typeof createCaseStudy>[0] | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    getDestinations()
      .then((opts) => {
        const labelSet = new Set<string>();
        for (const o of opts as DestinationOption[]) {
          if (o.subDestination) labelSet.add(`${o.destination}, ${o.subDestination}`);
          labelSet.add(o.destination);
        }
        const labels = [...labelSet].sort((a, b) => a.localeCompare(b));
        setDestinationOptions(labels);
      })
      .catch(() => {});
  }, []);

  async function load() {
    try {
      const res = await getCaseStudies({
        search: search || undefined,
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

  useEffect(() => { setLoading(true); load(); }, [page, search]);

  function openCreate() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setMetricsMessage('');
    setShowForm(true);
  }

  function openEdit(item: CaseStudy) {
    setForm({
      title: item.title,
      hotelName: item.hotelName,
      destination: item.destination ?? '',
      propertyType: item.propertyType ?? '',
      dealId: item.dealId ?? '',
      roomNights: item.roomNights?.toString() ?? '',
      revenue: item.revenue ?? '',
      adr: item.adr ?? '',
      alos: item.alos ?? '',
      leadTime: item.leadTime?.toString() ?? '',
      bookings: item.bookings?.toString() ?? '',
      packagesSold: item.packagesSold?.toString() ?? '',
      upgradePercentage: item.upgradePercentage ?? '',
      narrative: item.narrative ?? '',
      tags: item.tags?.join(', ') ?? '',
      images: item.images ?? [],
    });
    setEditingId(item.id);
    setMetricsMessage('');
    setShowForm(true);
  }

  async function handleFetchMetrics() {
    if (!form.dealId.trim()) return;
    setFetchingMetrics(true);
    setMetricsMessage('');
    try {
      const metrics = await fetchTableauMetrics(form.dealId.trim());
      setForm((prev) => ({
        ...prev,
        roomNights: metrics.roomNights?.toString() ?? prev.roomNights,
        revenue: metrics.revenue?.toString() ?? prev.revenue,
        adr: metrics.adr?.toString() ?? prev.adr,
        alos: metrics.alos?.toString() ?? prev.alos,
        leadTime: metrics.leadTime?.toString() ?? prev.leadTime,
        bookings: metrics.bookings?.toString() ?? prev.bookings,
        packagesSold: metrics.packagesSold?.toString() ?? prev.packagesSold,
        upgradePercentage: metrics.upgradePercentage?.toString() ?? prev.upgradePercentage,
      }));
      setMetricsMessage('Metrics populated from Tableau');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 503) {
        setMetricsMessage('Tableau is not configured yet — enter metrics manually');
      } else {
        setMetricsMessage('Failed to fetch metrics from Tableau');
      }
    } finally {
      setFetchingMetrics(false);
    }
  }

  function buildPayload() {
    return {
      title: form.title,
      hotelName: form.hotelName,
      destination: form.destination || undefined,
      propertyType: form.propertyType || undefined,
      dealId: form.dealId || undefined,
      roomNights: form.roomNights ? parseInt(form.roomNights) : undefined,
      revenue: form.revenue ? parseFloat(form.revenue) : undefined,
      adr: form.adr ? parseFloat(form.adr) : undefined,
      alos: form.alos ? parseFloat(form.alos) : undefined,
      leadTime: form.leadTime ? parseInt(form.leadTime) : undefined,
      bookings: form.bookings ? parseInt(form.bookings) : undefined,
      packagesSold: form.packagesSold ? parseInt(form.packagesSold) : undefined,
      upgradePercentage: form.upgradePercentage ? parseFloat(form.upgradePercentage) : undefined,
      narrative: form.narrative || undefined,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      images: form.images,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const payload = buildPayload();

    try {
      if (editingId) {
        await updateCaseStudy(editingId, payload);
      } else {
        await createCaseStudy(payload);
      }
      setShowForm(false);
      setLoading(true);
      await load();
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { candidates?: DuplicateCandidate[] } } })?.response;
      if (!editingId && resp?.status === 409 && resp.data?.candidates) {
        setPendingDuplicates(resp.data.candidates);
        setPendingPayload(payload);
        return;
      }
      setError(editingId ? 'Failed to update' : 'Failed to create');
    }
  }

  async function confirmDuplicateCreate() {
    if (!pendingPayload) return;
    try {
      await createCaseStudy(pendingPayload, true);
      setPendingDuplicates(null);
      setPendingPayload(null);
      setShowForm(false);
      setLoading(true);
      await load();
    } catch {
      setError('Failed to create');
    }
  }

  async function handlePdfUpload(file: File) {
    setParsingPdf(true);
    setPdfMessage('');
    setError('');
    try {
      const draft: CaseStudyDraft = await parseCaseStudyPdf(file);
      setForm({
        title: draft.title ?? '',
        hotelName: draft.hotelName ?? '',
        destination: draft.destination ?? '',
        propertyType: draft.propertyType ?? '',
        dealId: '',
        roomNights: '', revenue: '', adr: '', alos: '', leadTime: '', bookings: '',
        packagesSold: '', upgradePercentage: '',
        narrative: draft.narrative ?? '',
        tags: draft.tags?.join(', ') ?? '',
        images: draft.images,
      });
      setEditingId(null);
      setShowForm(true);
      setMetricsMessage('');
      const parts: string[] = [];
      parts.push(`Extracted via ${draft.llm.provider}/${draft.llm.model}`);
      if (draft.llm.costUsd !== null) parts.push(`$${draft.llm.costUsd.toFixed(4)}`);
      if (draft.warnings.length > 0) parts.push(draft.warnings.join(' '));
      if (draft.duplicateCandidates.length > 0) {
        parts.push(`⚠ ${draft.duplicateCandidates.length} possible duplicate(s): ${draft.duplicateCandidates.map((c) => c.hotelName).join(', ')}`);
      }
      if (!draft.destinationMatched && draft.destination) {
        parts.push(`Destination "${draft.destination}" has no deal-tier match — consider editing.`);
      }
      setPdfMessage(parts.join(' · '));
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { message?: string | string[] } } })?.response;
      const raw = resp?.data?.message;
      const msg = Array.isArray(raw) ? raw.join('; ') : (raw ?? (err as Error)?.message ?? 'Unknown error');
      setError(`Failed to parse PDF: ${msg}`);
    } finally {
      setParsingPdf(false);
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
        <div className="flex gap-2">
          <label className={`rounded-md border border-[#01B18B] px-4 py-2 text-sm text-[#01B18B] hover:bg-[#E6F9F5] cursor-pointer inline-flex items-center gap-2 ${parsingPdf ? 'opacity-50 pointer-events-none' : ''}`}>
            {parsingPdf ? <Spinner size="sm" className="text-[#01B18B]" /> : null}
            {parsingPdf ? 'Parsing…' : 'Upload Pitch Deck PDF'}
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) handlePdfUpload(file);
              }}
            />
          </label>
          <button
            onClick={openCreate}
            className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977]"
          >
            Add Case Study
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {pdfMessage && <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">{pdfMessage}</div>}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by title or hotel..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? 'Edit Case Study' : 'New Case Study'}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Hotel Name</label>
              <input type="text" required value={form.hotelName} onChange={(e) => setForm({ ...form, hotelName: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Destination</label>
              <DestinationCombobox
                options={destinationOptions}
                value={form.destination}
                onChange={(sel) => setForm({ ...form, destination: sel.label })}
                placeholder="Search or type a destination..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Property Type</label>
              <input type="text" value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
              <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Deal ID</label>
              <div className="mt-1 flex gap-2">
                <input type="text" value={form.dealId} onChange={(e) => setForm({ ...form, dealId: e.target.value })}
                  placeholder="e.g. 12345"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
                <button
                  type="button"
                  disabled={!form.dealId.trim() || fetchingMetrics}
                  onClick={handleFetchMetrics}
                  className="shrink-0 rounded-md border border-[#01B18B] px-3 py-2 text-sm text-[#01B18B] hover:bg-[#E6F9F5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {fetchingMetrics ? <Spinner size="sm" className="text-[#01B18B]" /> : null}
                  Fetch Metrics
                </button>
              </div>
              {metricsMessage && (
                <p className={`mt-1 text-xs ${metricsMessage.includes('populated') ? 'text-[#01B18B]' : 'text-amber-600'}`}>
                  {metricsMessage}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Room Nights</label>
              <input type="number" value={form.roomNights} onChange={(e) => setForm({ ...form, roomNights: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Revenue ($)</label>
              <input type="number" step="0.01" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ADR ($)</label>
              <input type="number" step="0.01" value={form.adr} onChange={(e) => setForm({ ...form, adr: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ALOS (days)</label>
              <input type="number" step="0.1" max="99" value={form.alos} onChange={(e) => setForm({ ...form, alos: e.target.value })}
                placeholder="e.g. 3.5"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Bookings</label>
              <input type="number" value={form.bookings} onChange={(e) => setForm({ ...form, bookings: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Lead Time (days)</label>
              <input type="number" value={form.leadTime} onChange={(e) => setForm({ ...form, leadTime: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Packages Sold</label>
              <input type="number" value={form.packagesSold} onChange={(e) => setForm({ ...form, packagesSold: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Upgrade %</label>
              <input type="number" step="0.01" value={form.upgradePercentage} onChange={(e) => setForm({ ...form, upgradePercentage: e.target.value })}
                placeholder="e.g. 12.5"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Narrative</label>
            <textarea rows={3} value={form.narrative} onChange={(e) => setForm({ ...form, narrative: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {form.images.map((url) => (
                <div key={url} className="relative group w-20 h-20 rounded border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewingImage(url)}
                    className="block w-full h-full"
                    aria-label="Preview image"
                  >
                    <img src={uploadUrl(url) ?? ''} alt="" className="w-full h-full object-cover cursor-zoom-in" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, images: form.images.filter((u) => u !== url) })}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <ImagePicker
                hotelName={form.hotelName}
                destination={form.destination}
                existingUrls={form.images}
                onPicked={(url) => setForm((prev) => ({ ...prev, images: [...prev.images, url] }))}
                onError={(msg) => setError(msg)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977]">
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
                <th className="pb-3 pr-4 w-20"></th>
                <th className="pb-3 pr-4">Hotel</th>
                <th className="pb-3 pr-4">Destination</th>
                <th className="pb-3 pr-4 text-right">Room Nights</th>
                <th className="pb-3 pr-4 text-right">Revenue</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 text-sm">
                  <td className="py-3 pr-4">
                    {item.images?.[0] ? (
                      <img
                        src={uploadUrl(item.images[0]) ?? ''}
                        alt={item.hotelName}
                        className="w-16 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-16 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                        —
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-900">{item.hotelName}</div>
                    <div className="text-xs text-gray-500">{item.title}</div>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{item.destination ?? '-'}</td>
                  <td className="py-3 pr-4 text-right font-mono text-gray-700">{formatNum(item.roomNights?.toString() ?? null)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-gray-700">{item.revenue ? `$${formatNum(item.revenue)}` : '-'}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} className="text-[#01B18B] hover:underline text-xs">Edit</button>
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

      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setViewingImage(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setViewingImage(null); }}
            className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300"
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={uploadUrl(viewingImage) ?? ''}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[90vh] object-contain rounded"
          />
        </div>
      )}

      {pendingDuplicates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Possible Duplicate</h3>
            <p className="mt-2 text-sm text-gray-600">
              A case study with a similar hotel name already exists:
            </p>
            <ul className="mt-3 space-y-1.5">
              {pendingDuplicates.map((c) => (
                <li key={c.id} className="flex justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-gray-900">{c.hotelName}</span>
                    {c.destination && <span className="text-gray-500"> · {c.destination}</span>}
                  </span>
                  <span className="text-xs text-gray-500">{Math.round(c.similarity * 100)}% match</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => { setPendingDuplicates(null); setPendingPayload(null); }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDuplicateCreate}
                className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977]"
              >
                Create anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

