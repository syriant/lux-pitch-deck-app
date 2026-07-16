import { useState, type FormEvent } from 'react';
import {
  createCaseStudy,
  updateCaseStudy,
  type CaseStudy,
  type CaseStudyDraft,
  type DuplicateCandidate,
} from '@/api/case-studies.api';
import { fetchTableauMetrics } from '@/api/tableau.api';
import { uploadUrl } from '@/api/upload.api';
import { ingestBase64Images, approveLibraryImages } from '@/api/image-library.api';
import { DestinationCombobox } from '@/components/common/DestinationCombobox';
import { Spinner } from '@/components/common/Spinner';
import { ImagePicker } from './ImagePicker';

export interface CaseStudyFormValues {
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
  sourcePdfUrl: string | null;
}

export const emptyCaseStudyForm: CaseStudyFormValues = {
  title: '', hotelName: '', destination: '', propertyType: '', dealId: '',
  roomNights: '', revenue: '', adr: '', alos: '', leadTime: '', bookings: '',
  packagesSold: '', upgradePercentage: '',
  narrative: '', tags: '', images: [], sourcePdfUrl: null,
};

export function caseStudyToFormValues(item: CaseStudy): CaseStudyFormValues {
  return {
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
    sourcePdfUrl: item.sourcePdfUrl,
  };
}

export function draftToFormValues(draft: CaseStudyDraft): CaseStudyFormValues {
  return {
    title: draft.title ?? '',
    hotelName: draft.hotelName ?? '',
    destination: draft.destination ?? '',
    propertyType: draft.propertyType ?? '',
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
    tags: draft.tags?.join(', ') ?? '',
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
 * Step 5. Owns field state, Tableau metrics fetch, image management (hero /
 * remove / preview), base64 image ingest on submit, and the duplicate-409
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
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [pendingDuplicates, setPendingDuplicates] = useState<DuplicateCandidate[] | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Parameters<typeof createCaseStudy>[0] | null>(null);
  const imagesNote = form.images.length === 0 ? (initialImagesNote ?? '') : '';

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
        tile: 'relative group w-16 h-16 rounded border overflow-hidden',
        tileLabel: 'text-[8px]',
        button: 'rounded-md bg-[#01B18B] px-4 py-1.5 text-sm text-white hover:bg-[#009977] disabled:opacity-50',
        cancel: 'rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50',
        pickerSize: 'sm' as const,
      }
    : {
        container: 'mb-6 rounded-lg border border-gray-200 bg-white p-6 space-y-4',
        heading: 'text-lg font-semibold',
        grid: 'grid grid-cols-2 gap-4',
        metricsGrid: 'grid grid-cols-5 gap-4',
        label: 'block text-sm font-medium text-gray-700',
        input: 'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]',
        hint: 'mt-1 text-xs text-gray-500',
        tile: 'relative group w-20 h-20 rounded border overflow-hidden',
        tileLabel: 'text-[9px]',
        button: 'rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50',
        cancel: 'rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50',
        pickerSize: undefined,
      };

  async function handleFetchMetrics() {
    if (!form.dealId.trim()) return;
    setFetchingMetrics(true);
    setMetricsMessage('');
    try {
      const m = await fetchTableauMetrics(form.dealId.trim());
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
      setMetricsMessage('Metrics populated from Tableau');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setMetricsMessage(status === 503
        ? 'Tableau is not configured yet — enter metrics manually'
        : 'Failed to fetch metrics from Tableau');
    } finally {
      setFetchingMetrics(false);
    }
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
      propertyType: form.propertyType || undefined,
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
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
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
    <form onSubmit={handleSubmit} className={s.container}>
      <h3 className={s.heading}>{caseStudyId ? 'Edit Case Study' : 'New Case Study'}</h3>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

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
        <div>
          <label className={s.label}>Property Type</label>
          <input type="text" value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
            placeholder="e.g. Resort, Boutique Hotel" className={s.input} />
        </div>
        <div>
          <label className={s.label}>Tags (comma-separated)</label>
          <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="e.g. beach, family, luxury" className={s.input} />
        </div>
        <div>
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

      <div>
        <label className={`${s.label} mb-1`}>Images</label>
        {imagesNote && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mb-2">{imagesNote}</p>
        )}
        {form.images.length > 1 && (
          <p className={`${s.hint} mb-1 mt-0`}>The first image is the hero shown on the case study slide — hover an image to set it.</p>
        )}
        <div className="flex gap-2 flex-wrap mb-2">
          {form.images.map((url, idx) => (
            <div key={url} className={`${s.tile} ${idx === 0 ? 'border-[#01B18B] ring-1 ring-[#01B18B]' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => setViewingImage(url)}
                className="block w-full h-full"
                aria-label="Preview image"
              >
                <img src={uploadUrl(url) ?? ''} alt="" className="w-full h-full object-cover cursor-zoom-in" />
              </button>
              {idx === 0 && form.images.length > 1 && (
                <span className={`absolute bottom-0 left-0 right-0 bg-[#01B18B] text-white ${s.tileLabel} font-medium text-center py-0.5`}>Hero</span>
              )}
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, images: [url, ...form.images.filter((u) => u !== url)] })}
                  className={`absolute bottom-0 left-0 right-0 bg-black/70 text-white ${s.tileLabel} py-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}
                >
                  Set as hero
                </button>
              )}
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
            onAddFetched={addFetchedImages}
            onError={(msg) => setError(msg)}
            size={s.pickerSize}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className={s.button}>
          {saving ? 'Saving...' : (submitLabel ?? (caseStudyId ? 'Save Changes' : 'Create'))}
        </button>
        <button type="button" onClick={onCancel} className={s.cancel}>
          Cancel
        </button>
      </div>

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
  );
}
