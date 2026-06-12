import { useState } from 'react';
import {
  createCaseStudy,
  type CaseStudy,
  type CaseStudySummaryDraft,
  type DuplicateCandidate,
} from '@/api/case-studies.api';
import { approveLibraryImages } from '@/api/image-library.api';
import { uploadUrl } from '@/api/upload.api';
import { FetchImagesModal } from '@/components/images/FetchImagesModal';

interface RowState {
  title: string;
  hotelName: string;
  destination: string;
  propertyType: string;
  narrative: string;
  tags: string;
  roomNights: string;
  revenue: string;
  bookings: string;
  pcmNotes: string;
  images: string[];
  sourcePdfUrl: string | null;
  status: 'pending' | 'creating' | 'created' | 'error';
  error: string;
  duplicates: DuplicateCandidate[] | null;
}

function draftToRow(d: CaseStudySummaryDraft): RowState {
  return {
    title: d.title ?? '',
    hotelName: d.hotelName ?? '',
    destination: d.destination ?? '',
    propertyType: d.propertyType ?? '',
    narrative: d.narrative ?? '',
    tags: d.tags?.join(', ') ?? '',
    roomNights: d.roomNights != null ? String(d.roomNights) : '',
    revenue: d.revenue != null ? String(d.revenue) : '',
    bookings: d.bookings != null ? String(d.bookings) : '',
    pcmNotes: d.pcmNotes ?? '',
    images: d.images ?? [],
    sourcePdfUrl: d.sourcePdfUrl,
    status: 'pending',
    error: '',
    duplicates: d.duplicateCandidates.length > 0 ? d.duplicateCandidates : null,
  };
}

interface Props {
  drafts: CaseStudySummaryDraft[];
  warnings: string[];
  onClose: () => void;
  /** Called after each successful create (e.g. to refresh a list). */
  onCreated: (caseStudy: CaseStudy) => void;
}

/**
 * Review screen for a multi-property case-study summary PDF. Renders one
 * pre-filled, editable form per extracted card; each can be created
 * independently (with duplicate handling) and have images fetched.
 */
export function CaseStudySummaryReview({ drafts, warnings, onClose, onCreated }: Props) {
  const [rows, setRows] = useState<RowState[]>(() => drafts.map(draftToRow));
  const [fetchRow, setFetchRow] = useState<number | null>(null);

  function patch(i: number, p: Partial<RowState>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  }

  function buildPayload(r: RowState) {
    return {
      title: r.title.trim(),
      hotelName: r.hotelName.trim(),
      destination: r.destination.trim() || undefined,
      propertyType: r.propertyType.trim() || undefined,
      narrative: r.narrative.trim() || undefined,
      tags: r.tags ? r.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      roomNights: r.roomNights ? parseInt(r.roomNights) : undefined,
      revenue: r.revenue ? parseFloat(r.revenue) : undefined,
      bookings: r.bookings ? parseInt(r.bookings) : undefined,
      pcmNotes: r.pcmNotes.trim() || undefined,
      images: r.images.length > 0 ? r.images : undefined,
      sourcePdfUrl: r.sourcePdfUrl ?? undefined,
    };
  }

  async function create(i: number, force: boolean) {
    const r = rows[i];
    if (!r.title.trim() || !r.hotelName.trim()) {
      patch(i, { error: 'Title and hotel name are required', status: 'error' });
      return;
    }
    patch(i, { status: 'creating', error: '' });
    try {
      const cs = await createCaseStudy(buildPayload(r), force);
      patch(i, { status: 'created', duplicates: null });
      onCreated(cs);
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { candidates?: DuplicateCandidate[] } } })?.response;
      if (resp?.status === 409 && resp.data?.candidates) {
        patch(i, { status: 'pending', duplicates: resp.data.candidates });
      } else {
        patch(i, { status: 'error', error: 'Failed to create' });
      }
    }
  }

  async function addImages(i: number, urls: string[]) {
    // Adding to a case study is the explicit approval that promotes any pending
    // fetched images into the library.
    await approveLibraryImages(urls).catch(() => {});
    setRows((prev) => prev.map((r, idx) =>
      idx === i ? { ...r, images: [...r.images, ...urls.filter((u) => !r.images.includes(u))] } : r));
    setFetchRow(null);
  }

  const createdCount = rows.filter((r) => r.status === 'created').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-lg bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Review extracted case studies</h3>
            <p className="text-xs text-gray-500">{drafts.length} propert{drafts.length === 1 ? 'y' : 'ies'} found · {createdCount} created</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {warnings.length > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <ul className="list-disc list-inside">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}

          {rows.map((r, i) => (
            <div key={i} className={`rounded-lg border p-4 ${r.status === 'created' ? 'border-[#01B18B] bg-[#F2FBF9]' : 'border-gray-200 bg-white'}`}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">{r.hotelName || `Property ${i + 1}`}</span>
                {r.status === 'created' && <span className="rounded-full bg-[#01B18B] px-2.5 py-1 text-xs font-medium text-white">Created ✓</span>}
              </div>

              {r.status === 'created' ? (
                <p className="text-sm text-gray-600">Saved to the case study library.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Title" value={r.title} onChange={(v) => patch(i, { title: v })} />
                    <Field label="Hotel name" value={r.hotelName} onChange={(v) => patch(i, { hotelName: v })} />
                    <Field label="Destination" value={r.destination} onChange={(v) => patch(i, { destination: v })} />
                    <Field label="Property type" value={r.propertyType} onChange={(v) => patch(i, { propertyType: v })} />
                    <Field label="Room nights" value={r.roomNights} onChange={(v) => patch(i, { roomNights: v })} />
                    <Field label="Revenue" value={r.revenue} onChange={(v) => patch(i, { revenue: v })} />
                    <Field label="Bookings" value={r.bookings} onChange={(v) => patch(i, { bookings: v })} />
                    <Field label="Tags (comma-separated)" value={r.tags} onChange={(v) => patch(i, { tags: v })} />
                  </div>
                  <div className="mt-3">
                    <Label>Narrative</Label>
                    <textarea
                      value={r.narrative}
                      onChange={(e) => patch(i, { narrative: e.target.value })}
                      rows={2}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
                    />
                  </div>
                  <div className="mt-3">
                    <Label>PCM notes (package price · LOS · inclusions)</Label>
                    <textarea
                      value={r.pcmNotes}
                      onChange={(e) => patch(i, { pcmNotes: e.target.value })}
                      rows={2}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
                    />
                  </div>

                  {/* Images */}
                  <div className="mt-3">
                    <Label>Images</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      {r.images.map((u, imgIdx) => (
                        <div key={u} className={`relative group h-16 w-16 rounded overflow-hidden border ${imgIdx === 0 ? 'border-[#01B18B] ring-1 ring-[#01B18B]' : 'border-gray-200'}`}>
                          <img src={uploadUrl(u) ?? ''} alt="" className="h-full w-full object-cover" />
                          {imgIdx === 0 && r.images.length > 1 && (
                            <span className="absolute bottom-0 left-0 right-0 bg-[#01B18B] text-white text-[8px] font-medium text-center py-0.5">Hero</span>
                          )}
                          {imgIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => patch(i, { images: [u, ...r.images.filter((x) => x !== u)] })}
                              className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >Set hero</button>
                          )}
                          <button
                            type="button"
                            onClick={() => patch(i, { images: r.images.filter((x) => x !== u) })}
                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-[10px] leading-none text-white"
                          >×</button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFetchRow(i)}
                        className="h-16 w-16 rounded border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-[#01B18B] hover:text-[#01B18B]"
                      >
                        + Find images
                      </button>
                    </div>
                  </div>

                  {r.duplicates && (
                    <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                      Possible duplicate{r.duplicates.length === 1 ? '' : 's'}: {r.duplicates.map((d) => d.hotelName).join(', ')}.
                      <button onClick={() => create(i, true)} className="ml-2 font-medium underline">Create anyway</button>
                    </div>
                  )}
                  {r.error && <div className="mt-2 text-sm text-red-700">{r.error}</div>}

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => create(i, false)}
                      disabled={r.status === 'creating'}
                      className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
                    >
                      {r.status === 'creating' ? 'Creating…' : 'Create case study'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            {createdCount > 0 ? 'Done' : 'Close'}
          </button>
        </div>
      </div>

      {fetchRow !== null && (
        <FetchImagesModal
          hotelName={rows[fetchRow].hotelName}
          destination={rows[fetchRow].destination || null}
          existingUrls={new Set(rows[fetchRow].images)}
          onClose={() => setFetchRow(null)}
          onAdd={(urls) => addImages(fetchRow, urls)}
          addTargetLabel="case study"
        />
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium text-gray-700 block mb-1">{children}</span>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
      />
    </label>
  );
}
