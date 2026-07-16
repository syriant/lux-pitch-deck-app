import { useState, useEffect } from 'react';
import {
  getCaseStudies,
  getCaseStudyFacets,
  type CaseStudyFacets,
  deleteCaseStudy,
  parseCaseStudyPdfAuto,
  type CaseStudy,
  type CaseStudyDraft,
  type CaseStudySummaryDraft,
} from '@/api/case-studies.api';
import { getDestinations, type DestinationOption } from '@/api/deal-tiers.api';
import { uploadUrl } from '@/api/upload.api';
import { Spinner } from '@/components/common/Spinner';
import {
  CaseStudyForm,
  caseStudyToFormValues,
  draftToFormValues,
  emptyCaseStudyForm,
  summariseDraft,
  type CaseStudyFormValues,
} from '@/components/case-studies/CaseStudyForm';
import { CaseStudySummaryReview } from '@/components/case-studies/CaseStudySummaryReview';

export function CaseStudies() {
  const [items, setItems] = useState<CaseStudy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [facets, setFacets] = useState<CaseStudyFacets>({ destinations: [], propertyTypes: [] });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<CaseStudyFormValues>(emptyCaseStudyForm);
  // Remounts the form so a fresh open never inherits the previous open's state.
  const [formInstance, setFormInstance] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<CaseStudy | null>(null);
  const [destinationOptions, setDestinationOptions] = useState<string[]>([]);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [summary, setSummary] = useState<{ drafts: CaseStudySummaryDraft[]; warnings: string[] } | null>(null);
  const [pdfMessage, setPdfMessage] = useState('');
  // Why the PDF yielded no images (flattened slides / none present), shown in
  // the form's images section.
  const [imagesNote, setImagesNote] = useState('');

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
        destination: destinationFilter || undefined,
        propertyType: propertyTypeFilter || undefined,
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

  useEffect(() => { setLoading(true); load(); }, [page, search, destinationFilter, propertyTypeFilter]);

  useEffect(() => {
    getCaseStudyFacets().then(setFacets).catch(() => {});
  }, []);

  function openCreate() {
    setFormInitial(emptyCaseStudyForm);
    setEditingId(null);
    setImagesNote('');
    setFormInstance((n) => n + 1);
    setShowForm(true);
  }

  function openEdit(item: CaseStudy) {
    setFormInitial(caseStudyToFormValues(item));
    setEditingId(item.id);
    setImagesNote('');
    setFormInstance((n) => n + 1);
    setShowForm(true);
  }

  function applyDraft(draft: CaseStudyDraft) {
    const { imagesNote: note, message } = summariseDraft(draft);
    setFormInitial(draftToFormValues(draft));
    setEditingId(null);
    setImagesNote(note);
    setPdfMessage(message);
    setFormInstance((n) => n + 1);
    setShowForm(true);
  }

  // One button: the API decides whether the PDF is a single-hotel deck (opens
  // the create form) or a multi-hotel summary (opens the per-card review).
  async function handleAutoUpload(file: File) {
    setParsingPdf(true);
    setPdfMessage('');
    setImagesNote('');
    setError('');
    try {
      const res = await parseCaseStudyPdfAuto(file);
      if (res.documentType === 'summary' && res.summary) {
        if (res.summary.drafts.length === 0) {
          setPdfMessage('No property cards were found in that PDF.');
          return;
        }
        setSummary({ drafts: res.summary.drafts, warnings: res.summary.warnings });
      } else if (res.draft) {
        applyDraft(res.draft);
      } else {
        setPdfMessage('Nothing could be extracted from that PDF.');
      }
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
            {parsingPdf ? 'Parsing…' : 'Upload PDF'}
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) handleAutoUpload(file);
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

      {summary && (
        <CaseStudySummaryReview
          drafts={summary.drafts}
          warnings={summary.warnings}
          onClose={() => { setSummary(null); void load(); }}
          onCreated={() => { void load(); }}
        />
      )}

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
        {facets.destinations.length > 0 && (
          <select
            value={destinationFilter}
            onChange={(e) => { setDestinationFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
          >
            <option value="">All destinations</option>
            {facets.destinations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
        {facets.propertyTypes.length > 0 && (
          <select
            value={propertyTypeFilter}
            onChange={(e) => { setPropertyTypeFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
          >
            <option value="">All property types</option>
            {facets.propertyTypes.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
      </div>

      {showForm && (
        <CaseStudyForm
          key={formInstance}
          caseStudyId={editingId ?? undefined}
          initial={formInitial}
          destinationOptions={destinationOptions}
          imagesNote={imagesNote}
          onSaved={() => { setShowForm(false); setLoading(true); void load(); }}
          onCancel={() => setShowForm(false)}
        />
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
                    {item.createdByName && (
                      <div className="text-xs text-gray-400">Added by {item.createdByName}</div>
                    )}
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

    </div>
  );
}

