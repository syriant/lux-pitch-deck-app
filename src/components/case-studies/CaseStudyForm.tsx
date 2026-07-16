import { useState, useRef, type FormEvent } from 'react';
import {
  createCaseStudy,
  updateCaseStudy,
  type CaseStudy,
  type CaseStudyDraft,
  type DuplicateCandidate,
} from '@/api/case-studies.api';
import { fetchTableauMetrics } from '@/api/tableau.api';
import { fetchSalesforceOpportunity } from '@/api/salesforce.api';
import { uploadUrl } from '@/api/upload.api';
import { ingestBase64Images, approveLibraryImages, uploadToLibrary } from '@/api/image-library.api';
import { FetchImagesModal } from '@/components/images/FetchImagesModal';
import { DestinationCombobox } from '@/components/common/DestinationCombobox';
import { Spinner } from '@/components/common/Spinner';

export interface CaseStudyFormValues {
  title: string;
  hotelName: string;
  destination: string;
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
  images: string[];
  sourcePdfUrl: string | null;
}

export const emptyCaseStudyForm: CaseStudyFormValues = {
  title: '', hotelName: '', destination: '', dealId: '',
  roomNights: '', revenue: '', adr: '', alos: '', leadTime: '', bookings: '',
  packagesSold: '', upgradePercentage: '',
  narrative: '', images: [], sourcePdfUrl: null,
};

export function caseStudyToFormValues(item: CaseStudy): CaseStudyFormValues {
  return {
    title: item.title,
    hotelName: item.hotelName,
    destination: item.destination ?? '',
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
    images: item.images ?? [],
    sourcePdfUrl: item.sourcePdfUrl,
  };
}

export function draftToFormValues(draft: CaseStudyDraft): CaseStudyFormValues {
  return {
    title: draft.title ?? '',
    hotelName: draft.hotelName ?? '',
    destination: draft.destination ?? '',
    dealId: '',
    roomNights: draft.roomNights != null ? String(draft.roomNights) : '',
    revenue: draft.revenue != null ? String(draft.revenue) : '',
    adr: draft.adr != null ? String(draft.adr) : '',
    alos: draft.alos != null ? String(draft.alos) : '',
    leadTime: draft.leadTime != null ? String(draft.leadTime) : '',
    bookings: draft.bookings != null ? String(draft.bookings) : '',
    packagesSold: draft.packagesSold != null ? String(draft.packagesSold) : '',
    upgradePercentage: draft.upgradePercentage != null ? String(draft.upgradePercentage) : '',
    narrative: draft.narrative ?? '',
    images: draft.images,
    sourcePdfUrl: draft.sourcePdfUrl,
  };
}

/**
 * Splits a parsed PDF draft's warnings into the note shown in the images
 * section (only when no images came through) and the info banner text.
 */
export function summariseDraft(draft: CaseStudyDraft): { imagesNote: string; message: string } {
  const imageWarnings = draft.warnings.filter((w) => /image|photo/i.test(w));
  const otherWarnings = draft.warnings.filter((w) => !/image|photo/i.test(w));

  const imagesNote = draft.images.length === 0
    ? (imageWarnings[0] ?? 'No photos were found in the PDF — use “Fetch hotel photos” or upload to add images.')
    : '';

  const parts: string[] = [];
  parts.push(`Extracted via ${draft.llm.provider}/${draft.llm.model}`);
  if (draft.llm.costUsd !== null) parts.push(`$${draft.llm.costUsd.toFixed(4)}`);
  if (otherWarnings.length > 0) parts.push(otherWarnings.join(' '));
  if (draft.duplicateCandidates.length > 0) {
    parts.push(`⚠ ${draft.duplicateCandidates.length} possible duplicate(s): ${draft.duplicateCandidates.map((c) => c.hotelName).join(', ')}`);
  }
  if (!draft.destinationMatched && draft.destination) {
    parts.push(`Destination "${draft.destination}" has no deal-tier match — consider editing.`);
  }
  return { imagesNote, message: parts.join(' · ') };
}

interface CaseStudyFormProps {
  /** Set to edit an existing case study; omit to create. */
  caseStudyId?: string;
  initial?: CaseStudyFormValues;
  destinationOptions: string[];
  /** Wizard inline styling: tighter spacing, tinted background. */
  compact?: boolean;
  submitLabel?: string;
  /** Why the images section starts empty (e.g. PDF had no extractable photos). */
  imagesNote?: string;
  onSaved: (item: CaseStudy) => void;
  onCancel: () => void;
}

/**
 * The one Add/Edit Case Study form, shared by the library page and wizard
 * Step 5. Owns field state, Tableau metrics fetch, the wizard-style image
 * gallery (Cover = first image, shown on the case study slide) with the
 * shared fetch modal, base64 image ingest on submit, and the duplicate-409
 * confirm flow. Mount it fresh per open (conditional render + key).
 */
export function CaseStudyForm({
  caseStudyId,
  initial,
  destinationOptions,
  compact = false,
  submitLabel,
  imagesNote: initialImagesNote,
  onSaved,
  onCancel,
}: CaseStudyFormProps) {
  const [form, setForm] = useState<CaseStudyFormValues>(initial ?? emptyCaseStudyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetchingMetrics, setFetchingMetrics] = useState(false);
  const [metricsMessage, setMetricsMessage] = useState('');
  const [pendingDuplicates, setPendingDuplicates] = useState<DuplicateCandidate[] | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Parameters<typeof createCaseStudy>[0] | null>(null);
  const [showFetchModal, setShowFetchModal] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const imagesNote = form.images.length === 0 ? (initialImagesNote ?? '') : '';
  // The cover is simply the first image — it's what the case study slide shows.
  const cover = form.images[0] ?? null;

  async function handleCoverUpload(file: File) {
    setUploadingCover(true);
    try {
      const row = await uploadToLibrary({
        file,
        hotelName: form.hotelName.trim() || undefined,
        destination: form.destination.trim() || undefined,
        source: 'manual_upload',
      });
      setForm((prev) => ({ ...prev, images: [row.url, ...prev.images.filter((u) => u !== row.url)] }));
    } catch {
      setError('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleUploadFiles(files: FileList) {
    setUploadingImages(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const row = await uploadToLibrary({
          file,
          hotelName: form.hotelName.trim() || undefined,
          destination: form.destination.trim() || undefined,
          source: 'manual_upload',
        });
        urls.push(row.url);
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls.filter((u) => !prev.images.includes(u))] }));
    } catch {
      setError('Failed to upload image');
    } finally {
      setUploadingImages(false);
    }
  }

  // Density-dependent classes; everything else is identical between contexts.
  const s = compact
    ? {
        container: 'mb-4 rounded-lg border border-[#01B18B]/30 bg-[#E6F9F5] p-4 space-y-3',
        heading: 'text-sm font-semibold text-gray-900',
        grid: 'grid grid-cols-2 gap-3',
        metricsGrid: 'grid grid-cols-5 gap-3',
        label: 'block text-xs font-medium text-gray-600 mb-1',
        input: 'block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none',
        hint: 'mt-1 text-[11px] text-gray-500',
        button: 'rounded-md bg-[#01B18B] px-4 py-1.5 text-sm text-white hover:bg-[#009977] disabled:opacity-50',
        cancel: 'rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50',
      }
    : {
        container: 'mb-6 rounded-lg border border-gray-200 bg-white p-6 space-y-4',
        heading: 'text-lg font-semibold',
        grid: 'grid grid-cols-2 gap-4',
        metricsGrid: 'grid grid-cols-5 gap-4',
        label: 'block text-sm font-medium text-gray-700',
        input: 'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]',
        hint: 'mt-1 text-xs text-gray-500',
        button: 'rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50',
        cancel: 'rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50',
      };

  // One click pulls Tableau metrics and the Salesforce opportunity (hotel name
  // + destination) in parallel. Salesforce values only fill fields that are
  // still empty — they never overwrite what the user has typed.
  async function handleFetchMetrics() {
    const dealId = form.dealId.trim();
    if (!dealId) return;
    setFetchingMetrics(true);
    setMetricsMessage('');

    const [metricsRes, oppRes] = await Promise.allSettled([
      fetchTableauMetrics(dealId),
      fetchSalesforceOpportunity(dealId),
    ]);
    const parts: string[] = [];

    if (metricsRes.status === 'fulfilled') {
      const m = metricsRes.value;
      setForm((prev) => ({
        ...prev,
        roomNights: m.roomNights?.toString() ?? prev.roomNights,
        revenue: m.revenue?.toString() ?? prev.revenue,
        adr: m.adr?.toString() ?? prev.adr,
        alos: m.alos?.toString() ?? prev.alos,
        leadTime: m.leadTime?.toString() ?? prev.leadTime,
        bookings: m.bookings?.toString() ?? prev.bookings,
        packagesSold: m.packagesSold?.toString() ?? prev.packagesSold,
        upgradePercentage: m.upgradePercentage?.toString() ?? prev.upgradePercentage,
      }));
      parts.push('Metrics populated from Tableau');
    } else {
      const status = (metricsRes.reason as { response?: { status?: number } })?.response?.status;
      parts.push(status === 503
        ? 'Tableau is not configured yet — enter metrics manually'
        : 'Failed to fetch metrics from Tableau');
    }

    if (oppRes.status === 'fulfilled') {
      const opp = oppRes.value;
      setForm((prev) => ({
        ...prev,
        hotelName: prev.hotelName || (opp.hotelName ?? ''),
        destination: prev.destination || (opp.destination ?? ''),
      }));
      if (opp.hotelName || opp.destination) parts.push('Hotel details from Salesforce');
    } else {
      const status = (oppRes.reason as { response?: { status?: number } })?.response?.status;
      // 404 = opportunity not found; 503 = integration not configured.
      parts.push(status === 404
        ? 'No Salesforce opportunity found for that ID'
        : 'Hotel details unavailable from Salesforce');
    }

    setMetricsMessage(parts.join(' · '));
    setFetchingMetrics(false);
  }

  // Pull clean hotel photos from LUX/Google. Adding to the case study is the
  // explicit approval that promotes pending fetched images into the library.
  async function addFetchedImages(urls: string[]) {
    await approveLibraryImages(urls).catch(() => {});
    setForm((prev) => ({ ...prev, images: [...prev.images, ...urls.filter((u) => !prev.images.includes(u))] }));
  }

  async function resolveImagesForSubmit(): Promise<string[]> {
    const dataUrls = form.images.filter((u) => u.startsWith('data:'));
    if (dataUrls.length === 0) return form.images;

    const ingested = await ingestBase64Images({
      items: dataUrls.map((dataUrl) => ({ dataUrl })),
      hotelName: form.hotelName.trim() || null,
      destination: form.destination.trim() || null,
      source: 'pitch_deck',
    });

    // Preserve original order by walking form.images and substituting.
    let i = 0;
    return form.images.map((u) => (u.startsWith('data:') ? ingested[i++]?.url ?? u : u));
  }

  async function buildPayload() {
    const images = await resolveImagesForSubmit();
    return {
      title: form.title,
      hotelName: form.hotelName,
      destination: form.destination || undefined,
      dealId: form.dealId.trim() || undefined,
      roomNights: form.roomNights ? parseInt(form.roomNights) : undefined,
      revenue: form.revenue ? parseFloat(form.revenue) : undefined,
      adr: form.adr ? parseFloat(form.adr) : undefined,
      alos: form.alos ? parseFloat(form.alos) : undefined,
      leadTime: form.leadTime ? parseInt(form.leadTime) : undefined,
      bookings: form.bookings ? parseInt(form.bookings) : undefined,
      packagesSold: form.packagesSold ? parseInt(form.packagesSold) : undefined,
      upgradePercentage: form.upgradePercentage ? parseFloat(form.upgradePercentage) : undefined,
      narrative: form.narrative || undefined,
      images,
      sourcePdfUrl: form.sourcePdfUrl ?? undefined,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    let payload: Awaited<ReturnType<typeof buildPayload>>;
    try {
      payload = await buildPayload();
    } catch {
      setError('Failed to ingest extracted images');
      setSaving(false);
      return;
    }

    try {
      const saved = caseStudyId
        ? await updateCaseStudy(caseStudyId, payload)
        : await createCaseStudy(payload);
      onSaved(saved);
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { candidates?: DuplicateCandidate[] } } })?.response;
      if (!caseStudyId && resp?.status === 409 && resp.data?.candidates) {
        setPendingDuplicates(resp.data.candidates);
        setPendingPayload(payload);
        return;
      }
      setError(caseStudyId ? 'Failed to update' : 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDuplicateCreate() {
    if (!pendingPayload) return;
    setSaving(true);
    try {
      const created = await createCaseStudy(pendingPayload, true);
      setPendingDuplicates(null);
      setPendingPayload(null);
      onSaved(created);
    } catch {
      setError('Failed to create');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className={s.container}>
      <h3 className={s.heading}>{caseStudyId ? 'Edit Case Study' : 'New Case Study'}</h3>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="max-w-md">
        <label className={s.label}>Salesforce Deal ID</label>
        <div className="mt-1 flex gap-2">
          <input type="text" value={form.dealId} onChange={(e) => setForm({ ...form, dealId: e.target.value })}
            placeholder="e.g. 006RF00000LYwIPYA1" className={`${s.input} mt-0`} />
          <button
            type="button"
            disabled={!form.dealId.trim() || fetchingMetrics}
            onClick={handleFetchMetrics}
            className="shrink-0 rounded-md border border-[#01B18B] px-3 py-2 text-sm text-[#01B18B] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
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

      <div className={s.grid}>
        <div>
          <label className={s.label}>Title *</label>
          <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. 8-week campaign driving 250 room nights" className={s.input} />
        </div>
        <div>
          <label className={s.label}>Hotel Name *</label>
          <input type="text" required value={form.hotelName} onChange={(e) => setForm({ ...form, hotelName: e.target.value })}
            className={s.input} />
        </div>
        <div>
          <label className={s.label}>Destination</label>
          <DestinationCombobox
            options={destinationOptions}
            value={form.destination}
            onChange={(sel) => setForm({ ...form, destination: sel.label })}
            placeholder="Search or type a destination..."
          />
        </div>
      </div>

      <div className={s.metricsGrid}>
        <div>
          <label className={s.label}>Room Nights</label>
          <input type="number" value={form.roomNights} onChange={(e) => setForm({ ...form, roomNights: e.target.value })}
            className={s.input} />
        </div>
        <div>
          <label className={s.label}>Revenue ($)</label>
          <input type="number" step="0.01" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })}
            className={s.input} />
        </div>
        <div>
          <label className={s.label}>ADR ($)</label>
          <input type="number" step="0.01" value={form.adr} onChange={(e) => setForm({ ...form, adr: e.target.value })}
            className={s.input} />
        </div>
        <div>
          <label className={s.label}>ALOS (days)</label>
          <input type="number" step="0.1" max="99" value={form.alos} onChange={(e) => setForm({ ...form, alos: e.target.value })}
            placeholder="e.g. 3.5" className={s.input} />
        </div>
        <div>
          <label className={s.label}>Bookings</label>
          <input type="number" value={form.bookings} onChange={(e) => setForm({ ...form, bookings: e.target.value })}
            className={s.input} />
        </div>
        <div>
          <label className={s.label}>Lead Time (days)</label>
          <input type="number" value={form.leadTime} onChange={(e) => setForm({ ...form, leadTime: e.target.value })}
            className={s.input} />
        </div>
        <div>
          <label className={s.label}>Packages Sold</label>
          <input type="number" value={form.packagesSold} onChange={(e) => setForm({ ...form, packagesSold: e.target.value })}
            className={s.input} />
        </div>
        <div>
          <label className={s.label}>Upgrade %</label>
          <input type="number" step="0.01" value={form.upgradePercentage} onChange={(e) => setForm({ ...form, upgradePercentage: e.target.value })}
            placeholder="e.g. 12.5" className={s.input} />
        </div>
      </div>

      <div>
        <label className={s.label}>Narrative</label>
        <textarea rows={compact ? 2 : 3} value={form.narrative} onChange={(e) => setForm({ ...form, narrative: e.target.value })}
          placeholder="e.g. Revenue achieved — {revenue} across {bookings} bookings."
          className={s.input} />
        <p className={s.hint}>
          Insert metric tokens and they fill in from Tableau on the slide:{' '}
          <code>{'{revenue}'}</code>, <code>{'{room_nights}'}</code>, <code>{'{bookings}'}</code>,{' '}
          <code>{'{packages_sold}'}</code>, <code>{'{adr}'}</code>, <code>{'{alos}'}</code>,{' '}
          <code>{'{lead_time}'}</code>, <code>{'{upgrade_percentage}'}</code>.
        </p>
      </div>

      {/* Images — same look and flow as the wizard's image step. The first
          image is the Cover, used on the case study slide (no hero here). */}
      <div>
        <label className={`${s.label} mb-2`}>Cover Image (case study slide)</label>
        <input ref={coverRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleCoverUpload(f); e.target.value = ''; }} />
        <div className="relative w-full max-w-sm">
          {uploadingCover ? (
            <div className="w-full h-32 rounded-lg border-2 border-dashed border-[#01B18B] bg-[#E6F9F5] flex flex-col items-center justify-center gap-2">
              <Spinner className="text-[#01B18B]" />
              <span className="text-xs text-[#01B18B]">Uploading cover...</span>
            </div>
          ) : cover ? (
            <div className="relative group h-32 w-full rounded-lg overflow-hidden border border-gray-200">
              <img src={uploadUrl(cover) ?? ''} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button type="button" onClick={() => coverRef.current?.click()} className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-700">Replace</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              className="w-full h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center text-gray-400 text-sm"
            >
              + Upload cover
            </button>
          )}
          {/* Hidden mirror of the cover so native form validation ("Please
              fill out this field") anchors its bubble to the cover slot. */}
          <input
            type="text"
            required
            value={cover ?? ''}
            onChange={() => {}}
            tabIndex={-1}
            aria-hidden="true"
            className="absolute bottom-0 left-1/2 h-px w-px opacity-0 pointer-events-none"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={s.label}>Image Gallery ({form.images.length} images)</label>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files?.length) void handleUploadFiles(e.target.files); e.target.value = ''; }} />
          <div className="flex items-center gap-2">
            {form.hotelName.trim() && (
              <button
                type="button"
                onClick={() => setShowFetchModal(true)}
                className="rounded-md border border-[#01B18B] px-3 py-1.5 text-xs text-[#01B18B] hover:bg-[#E6F9F5]"
              >
                Fetch for {form.hotelName.trim()}
              </button>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingImages}
              className="rounded-md bg-[#01B18B] px-3 py-1.5 text-xs text-white hover:bg-[#009977] disabled:opacity-50"
            >
              {uploadingImages ? <><Spinner size="sm" className="text-white inline-block mr-1.5" /> Uploading...</> : '+ Add Images'}
            </button>
          </div>
        </div>

        {imagesNote && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mb-2">{imagesNote}</p>
        )}

        {form.images.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-400">No images yet. Fetch photos for the hotel or upload your own.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {form.images.map((url, idx) => (
              <div key={url} className="relative group rounded-lg overflow-hidden border border-gray-200">
                <img src={uploadUrl(url) ?? ''} alt="" className="w-full h-24 object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, images: [url, ...form.images.filter((u) => u !== url)] })}
                      className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700"
                    >
                      Set as Cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, images: form.images.filter((u) => u !== url) })}
                    className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-medium text-white"
                  >
                    Remove
                  </button>
                </div>
                {idx === 0 && (
                  <div className="absolute top-1 left-1 rounded bg-[#01B18B] px-1.5 py-0.5 text-[9px] font-medium text-white">
                    Cover
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!cover && (
        <p className="text-xs text-amber-600">Please upload a cover image before proceeding.</p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className={s.button}>
          {saving ? 'Saving...' : (submitLabel ?? (caseStudyId ? 'Save Changes' : 'Create'))}
        </button>
        <button type="button" onClick={onCancel} className={s.cancel}>
          Cancel
        </button>
      </div>

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
                type="button"
                onClick={() => { setPendingDuplicates(null); setPendingPayload(null); }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDuplicateCreate}
                disabled={saving}
                className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
              >
                Create anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </form>

    {/* Outside the <form> so the panel's buttons can never trigger a submit. */}
    {showFetchModal && form.hotelName.trim() && (
      <FetchImagesModal
        hotelName={form.hotelName.trim()}
        destination={form.destination.trim() || null}
        existingUrls={new Set(form.images)}
        onClose={() => setShowFetchModal(false)}
        onAdd={addFetchedImages}
        addTargetLabel="case study"
      />
    )}
    </>
  );
}
