import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getFullDeck, updateDeck as updateDeckApi, updateProperty, setDeckObjectives, updateOption,
  type FullDeck,
} from '@/api/decks.api';
import { updateCaseStudy } from '@/api/case-studies.api';
import { buildSlideList, parseCustomPages, type SlideDefinition } from '@/components/preview/slide-types';
import { fileToSlideImages } from '@/components/preview/file-to-slide-images';
import { uploadImage } from '@/api/upload.api';
import { SlideStrip } from '@/components/preview/SlideStrip';
import { SlideRenderer } from '@/components/preview/SlideRenderer';
import { exportPptx, exportPdf, exportToSalesforce } from '@/api/export.api';
import { getSalesforceStatus } from '@/api/salesforce.api';
import { AppShell } from '@/components/layout/AppShell';

export type FieldChangeHandler = (
  entityType: 'property' | 'objective' | 'option' | 'case-study' | 'custom',
  entityId: string,
  field: string,
  value: string,
) => void;

export function DeckPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<FullDeck | null>(null);
  const deckRef = useRef<FullDeck | null>(null);
  const [slides, setSlides] = useState<SlideDefinition[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPdfCompressed, setExportingPdfCompressed] = useState(false);
  const [addingPage, setAddingPage] = useState(false);
  const [hiddenSlides, setHiddenSlides] = useState<string[]>([]);
  const [sfConfigured, setSfConfigured] = useState(false);
  const [sfUploading, setSfUploading] = useState(false);
  const [sfConfirmOpen, setSfConfirmOpen] = useState(false);
  const [sfResult, setSfResult] = useState<{ ok: boolean; text: string; url?: string | null } | null>(null);

  useEffect(() => {
    getSalesforceStatus().then((s) => setSfConfigured(s.configured)).catch(() => setSfConfigured(false));
  }, []);

  const sfOppId = deck?.salesforceOpportunityId ?? null;
  const sfAlreadyUploaded = !!(sfOppId && deck?.customFields?.[`salesforce.contentDocumentId.${sfOppId}`]);

  async function runSalesforceUpload() {
    if (!id) return;
    setSfConfirmOpen(false);
    setSfUploading(true);
    setSfResult(null);
    try {
      const r = await exportToSalesforce(id);
      setSfResult({
        ok: true,
        text: `${r.updated ? 'Updated' : 'Attached'} ${r.filename} ${r.updated ? 'in' : 'on'} ${r.opportunityName ?? 'the opportunity'}`,
        url: r.recordUrl,
      });
      // Reflect the stored document id locally so a subsequent send overwrites it.
      setDeck((prev) => prev ? { ...prev, customFields: { ...prev.customFields, [`salesforce.contentDocumentId.${r.opportunityId}`]: r.contentDocumentId } } : prev);
    } catch {
      setSfResult({ ok: false, text: 'Failed to send to Salesforce' });
    } finally {
      setSfUploading(false);
    }
  }

  // Keep ref in sync for use in callbacks
  useEffect(() => { deckRef.current = deck; }, [deck]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        let d = await getFullDeck(id);

        // Auto-assign gallery images on first load (when no image.* customFields exist)
        const gallery = d.gallery?.filter((g): g is string => typeof g === 'string' && g.length > 0) ?? [];
        const hasImageFields = Object.keys(d.customFields ?? {}).some((k) => k.startsWith('image.'));
        if (!hasImageFields && gallery.length > 0) {
          const builtSlides = buildSlideList(d);
          // Static image slots
          const slots: string[] = [
            'image.objectives', 'image.differentiators', 'image.reach',
            'image.campaignOptions', 'image.demographics',
          ];
          // Per-property image slots
          for (const prop of d.properties) {
            slots.push(`image.regionStats.${prop.id}`);
          }
          // Per-slide case study image slots
          for (const s of builtSlides) {
            if (s.type === 'case-study') {
              slots.push(`image.caseStudy.${s.id}`);
            }
          }
          const assignments: Record<string, string> = {};
          for (let i = 0; i < slots.length; i++) {
            assignments[slots[i]] = gallery[i % gallery.length];
          }
          const updated = { ...(d.customFields ?? {}), ...assignments };
          d = { ...d, customFields: updated };
          await updateDeckApi(id, { customFields: updated }).catch(() => {});
        }

        setDeck(d);
        setSlides(buildSlideList(d));
        // Restore hidden slides from customFields
        const saved = d.customFields?.['hiddenSlides'];
        if (saved) {
          try { setHiddenSlides(JSON.parse(saved)); } catch { /* ignore */ }
        }
      } catch {
        setError('Failed to load deck');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleFieldChange: FieldChangeHandler = useCallback(
    async (entityType, entityId, field, value) => {
      if (!deck || !id) return;

      try {
        if (entityType === 'property') {
          await updateProperty(id, entityId, { [field]: value });
          setDeck((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              properties: prev.properties.map((p) =>
                p.id === entityId ? { ...p, [field]: value } : p,
              ),
            };
          });
        } else if (entityType === 'objective') {
          const updated = deck.objectives.map((o) =>
            o.id === entityId ? { ...o, objectiveText: value } : o,
          );
          await setDeckObjectives(
            id,
            updated.map((o) => ({ text: o.objectiveText, source: o.source })),
          );
          setDeck((prev) => {
            if (!prev) return prev;
            return { ...prev, objectives: updated };
          });
        } else if (entityType === 'option') {
          await updateOption(id, entityId, { [field]: value });
          setDeck((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              properties: prev.properties.map((p) => ({
                ...p,
                options: p.options.map((o) =>
                  o.id === entityId ? { ...o, [field]: value } : o,
                ),
              })),
            };
          });
        } else if (entityType === 'custom') {
          const current = deckRef.current?.customFields ?? {};
          const updated = { ...current, [field]: value };
          setDeck((prev) => {
            if (!prev) return prev;
            return { ...prev, customFields: updated };
          });
          deckRef.current = deckRef.current ? { ...deckRef.current, customFields: updated } : null;
          await updateDeckApi(id, { customFields: updated });
        } else if (entityType === 'case-study') {
          await updateCaseStudy(entityId, { [field]: value });
          setDeck((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              properties: prev.properties.map((p) => ({
                ...p,
                caseStudies: p.caseStudies.map((cs) =>
                  cs.caseStudyId === entityId
                    ? { ...cs, caseStudy: { ...cs.caseStudy, [field]: value } }
                    : cs,
                ),
              })),
            };
          });
        }
      } catch {
        console.error(`Failed to save ${entityType}.${field}`);
      }

      setDeck((prev) => {
        if (prev) setSlides(buildSlideList(prev));
        return prev;
      });
    },
    [deck, id],
  );

  const handleToggleHidden = useCallback(async (slideId: string) => {
    if (!id) return;
    setHiddenSlides((prev) => {
      const next = prev.includes(slideId) ? prev.filter((s) => s !== slideId) : [...prev, slideId];
      // Persist to customFields
      const current = deckRef.current?.customFields ?? {};
      const updated = { ...current, hiddenSlides: JSON.stringify(next) };
      setDeck((d) => d ? { ...d, customFields: updated } : d);
      if (deckRef.current) {
        deckRef.current = { ...deckRef.current, customFields: updated };
      }
      updateDeckApi(id, { customFields: updated }).catch(() => {
        console.error('Failed to persist hidden slides');
      });
      return next;
    });
  }, [id]);

  // Persist the custom-pages list into customFields (same pattern as hiddenSlides).
  const persistCustomPages = useCallback((pages: Array<{ id: string; imageKey: string; label?: string }>) => {
    if (!id) return;
    const base = deckRef.current;
    const current = base?.customFields ?? {};
    const updated = { ...current, customPages: JSON.stringify(pages) };
    const nextDeck = base ? { ...base, customFields: updated } : null;
    setDeck(nextDeck);
    if (base) deckRef.current = nextDeck;
    if (nextDeck) setSlides(buildSlideList(nextDeck));
    updateDeckApi(id, { customFields: updated }).catch(() => console.error('Failed to persist custom pages'));
  }, [id]);

  // Upload a one-pager (PDF or image). PDFs are rasterized to 16:9 image(s) in
  // the browser; each page becomes a custom-page slide appended to the deck.
  const handleAddOnePager = useCallback(async (file: File) => {
    if (!id) return;
    setAddingPage(true);
    setError('');
    try {
      const blobs = await fileToSlideImages(file);
      const ext = '.jpg';
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const newPages: Array<{ id: string; imageKey: string; label?: string }> = [];
      for (let i = 0; i < blobs.length; i++) {
        const imgFile = new File([blobs[i]], `${baseName}-${i + 1}${ext}`, { type: 'image/jpeg' });
        const { url } = await uploadImage(imgFile);
        newPages.push({
          id: crypto.randomUUID(),
          imageKey: url,
          label: blobs.length > 1 ? `${baseName} (${i + 1})` : baseName,
        });
      }
      const existing = parseCustomPages(deckRef.current ?? ({} as FullDeck));
      persistCustomPages([...existing, ...newPages]);
    } catch (err) {
      console.error(err);
      setError('Failed to add one-pager. Make sure it is a PDF or image.');
    } finally {
      setAddingPage(false);
    }
  }, [id, persistCustomPages]);

  const handleRemoveCustomPage = useCallback((slideId: string) => {
    const pageId = slideId.replace(/^custom-page-/, '');
    const existing = parseCustomPages(deckRef.current ?? ({} as FullDeck));
    persistCustomPages(existing.filter((p) => p.id !== pageId));
    setActiveIndex((prev) => Math.max(0, prev - 1));
  }, [persistCustomPages]);

  const handleGalleryAdd = useCallback(async (url: string) => {
    if (!id) return;
    // Use ref to get latest gallery, not stale closure
    const current = deckRef.current;
    const gallery = (current?.gallery ?? []).filter((g): g is string => typeof g === 'string' && g.length > 0);
    const updated = [...gallery, url];
    setDeck((prev) => prev ? { ...prev, gallery: updated } : prev);
    try {
      await updateDeckApi(id, { gallery: updated });
    } catch {
      console.error('Failed to update gallery');
    }
  }, [id]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setSlides((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      if (!id) return next;

      // Persist custom-page positions (their index in the final list) whenever
      // any are present, so a drag of either a base slide or a page sticks.
      if (next.some((s) => s.type === 'custom-page')) {
        const pages = next
          .map((s, idx) => ({ s, idx }))
          .filter(({ s }) => s.type === 'custom-page')
          .map(({ s, idx }) => ({
            id: s.id.replace(/^custom-page-/, ''),
            imageKey: s.customImageKey ?? '',
            label: s.label,
            position: idx,
          }));
        const current = deckRef.current?.customFields ?? {};
        const updatedCf = { ...current, customPages: JSON.stringify(pages) };
        setDeck((d) => (d ? { ...d, customFields: updatedCf } : d));
        if (deckRef.current) deckRef.current = { ...deckRef.current, customFields: updatedCf };
        updateDeckApi(id, { customFields: updatedCf }).catch(() => console.error('Failed to persist custom pages'));
      }

      // Persist base slide order (excluding custom pages) when template-driven.
      if (deck?.templateId) {
        const seen = new Set<string>();
        const slideOrder = next.reduce<Array<{ type: string; label: string; required?: boolean; perProperty?: boolean }>>((acc, s) => {
          if (s.type === 'custom-page') return acc; // not part of slideOrder
          const baseType = s.type;
          if (seen.has(baseType)) return acc;
          seen.add(baseType);

          const original = deck.slideOrder?.find((ts) => ts.type === baseType);
          acc.push({
            type: baseType,
            label: original?.label ?? s.label,
            required: original?.required,
            perProperty: original?.perProperty,
          });
          return acc;
        }, []);

        updateDeckApi(id, { slideOrder }).catch(() => {
          console.error('Failed to persist slide order');
        });
      }

      return next;
    });
    setActiveIndex((prev) => {
      if (prev === fromIndex) return toIndex;
      if (fromIndex < prev && toIndex >= prev) return prev - 1;
      if (fromIndex > prev && toIndex <= prev) return prev + 1;
      return prev;
    });
  }, [id, deck]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLElement && e.target.isContentEditable) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slides.length]);

  if (loading) {
    return (
      <AppShell sidebar={false}>
        <div className="p-8 text-[#7E8188]">Loading preview...</div>
      </AppShell>
    );
  }

  if (error || !deck) {
    return (
      <AppShell sidebar={false}>
        <div className="p-8">
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error || 'Deck not found'}</div>
        </div>
      </AppShell>
    );
  }

  const activeSlide = slides[activeIndex];
  const isActiveHidden = activeSlide ? hiddenSlides.includes(activeSlide.id) : false;

  return (
    <AppShell sidebar={false} breadcrumb={deck.name}>
      <div className="h-full flex flex-col bg-gray-100">
        {/* Main area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Thumbnail strip */}
          <SlideStrip
            slides={slides}
            deck={deck}
            activeIndex={activeIndex}
            hiddenSlides={hiddenSlides}
            onSelect={setActiveIndex}
            onReorder={handleReorder}
            onToggleHidden={handleToggleHidden}
          />

          {/* Main slide view */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            {activeSlide && (
              <div className="w-full max-w-5xl">
                {isActiveHidden && (
                  <div className="mb-3 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
                    <div className="flex items-center gap-2 text-amber-800">
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l1.687 1.687C2.347 6.106 1.293 7.764.6 9.36a1.59 1.59 0 0 0 0 1.28C2.062 13.95 5.42 16.5 10 16.5c1.62 0 3.107-.32 4.42-.86l2.3 2.3a.75.75 0 1 0 1.06-1.06L3.28 2.22Zm6.345 9.527a3 3 0 0 1-3.872-3.872l1.207 1.207a1.5 1.5 0 0 0 1.458 1.458l1.207 1.207ZM10 5a5.96 5.96 0 0 0-1.55.205l1.27 1.27a3 3 0 0 1 3.305 3.305l2.062 2.062c1.041-.943 1.94-2.108 2.713-3.502a1.59 1.59 0 0 0 0-1.28C17.938 6.05 14.58 3.5 10 3.5c-.18 0-.357.005-.532.015L10 5Z" />
                      </svg>
                      <span>
                        This slide is hidden — it will not appear in PPTX or PDF exports.
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleHidden(activeSlide.id)}
                      className="rounded border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                    >
                      Show slide
                    </button>
                  </div>
                )}
                {activeSlide.type === 'custom-page' && (
                  <div className="mb-3 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm">
                    <span className="text-gray-600">Uploaded one-pager — drag it in the slide strip to reposition.</span>
                    <button
                      onClick={() => handleRemoveCustomPage(activeSlide.id)}
                      className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Remove page
                    </button>
                  </div>
                )}
                <div className={isActiveHidden ? 'opacity-40 grayscale' : ''}>
                  <SlideRenderer slide={activeSlide} deck={deck} onFieldChange={handleFieldChange} onGalleryAdd={handleGalleryAdd} />
                </div>
                <div className="mt-3 text-center text-xs text-gray-400">
                  {activeIndex + 1} / {slides.length} — {activeSlide.label}
                  {isActiveHidden && <span className="ml-2 font-medium text-amber-600">(hidden)</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 shrink-0">
          <div className="text-sm text-[#7E8188]">
            {sfResult ? (
              <span className={sfResult.ok ? 'text-[#01806a]' : 'text-red-600'}>
                {sfResult.text}
                {sfResult.ok && sfResult.url && (
                  <> · <a href={sfResult.url} target="_blank" rel="noreferrer" className="underline">View in Salesforce</a></>
                )}
              </span>
            ) : (
              <>{slides.length} slides</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className={`rounded-md border border-gray-300 px-3 py-1.5 text-sm text-[#7E8188] hover:bg-gray-50 cursor-pointer ${addingPage ? 'opacity-50 pointer-events-none' : ''}`} title="Add a one-pager (PDF or image) as an extra page">
              {addingPage ? 'Adding…' : '+ One-pager'}
              <input
                type="file"
                accept="application/pdf,.pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) handleAddOnePager(file);
                }}
              />
            </label>
            <button
              onClick={() => navigate(`/decks/${id}/edit`)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-[#7E8188] hover:bg-gray-50"
            >
              Back to Wizard
            </button>
            <button
              onClick={async () => {
                if (!id || exportingPdf) return;
                setExportingPdf(true);
                try {
                  await exportPdf(id);
                } catch {
                  console.error('PDF export failed');
                } finally {
                  setExportingPdf(false);
                }
              }}
              disabled={exportingPdf || exportingPdfCompressed}
              className="rounded-md border border-[#01B18B] px-4 py-1.5 text-sm text-[#01B18B] hover:bg-[#E6F9F5] disabled:opacity-70 flex items-center gap-1.5"
            >
              {exportingPdf && (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {exportingPdf ? 'Generating PDF...' : 'Export PDF'}
            </button>
            <button
              onClick={async () => {
                if (!id || exportingPdfCompressed) return;
                setExportingPdfCompressed(true);
                try {
                  await exportPdf(id, { compressed: true });
                } catch {
                  console.error('Compressed PDF export failed');
                } finally {
                  setExportingPdfCompressed(false);
                }
              }}
              disabled={exportingPdf || exportingPdfCompressed}
              title="Smaller file size, suitable for email — slightly softer image quality"
              className="rounded-md border border-[#01B18B] px-4 py-1.5 text-sm text-[#01B18B] hover:bg-[#E6F9F5] disabled:opacity-70 flex items-center gap-1.5"
            >
              {exportingPdfCompressed && (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {exportingPdfCompressed ? 'Generating…' : 'Export Compressed PDF'}
            </button>
            {sfOppId && sfConfigured && (
              <button
                onClick={() => {
                  if (sfUploading) return;
                  if (sfAlreadyUploaded) setSfConfirmOpen(true);
                  else void runSalesforceUpload();
                }}
                disabled={sfUploading}
                title="Render to PDF and attach it to the linked Salesforce opportunity"
                className="rounded-md border border-[#01B18B] px-4 py-1.5 text-sm text-[#01B18B] hover:bg-[#E6F9F5] disabled:opacity-70 flex items-center gap-1.5"
              >
                {sfUploading && (
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {sfUploading ? 'Sending…' : sfAlreadyUploaded ? 'Update in Salesforce' : 'Send to Salesforce'}
              </button>
            )}
            <button
              onClick={async () => {
                if (!id || exporting) return;
                setExporting(true);
                try {
                  await exportPptx(id);
                } catch {
                  console.error('Export failed');
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className="rounded-md bg-[#01B18B] px-4 py-1.5 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export PPTX'}
            </button>
          </div>
        </div>
      </div>

      {sfConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Overwrite Salesforce file?</h3>
            <p className="mb-5 text-sm text-gray-600">
              A PDF is already attached to this opportunity. Sending again overwrites it with the
              current deck as a new version — the previous version stays in Salesforce&apos;s file history.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSfConfirmOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void runSalesforceUpload()}
                className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977]"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
