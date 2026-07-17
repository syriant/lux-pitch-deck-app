import { useState, useEffect, useRef } from 'react';
import {
  getCaseStudies,
  parseCaseStudyPdfAuto,
  type CaseStudy,
  type CaseStudyDraft,
  type CaseStudySummaryDraft,
} from '@/api/case-studies.api';
import { type DeckPropertyFull, setPropertyCaseStudies, getDeckObjectives } from '@/api/decks.api';
import { getDestinations, type DestinationOption } from '@/api/deal-tiers.api';
import { DealTiersMissingBanner } from '@/components/common/DealTiersMissingBanner';
import { Spinner } from '@/components/common/Spinner';
import {
  CaseStudyForm,
  draftToFormValues,
  emptyCaseStudyForm,
  summariseDraft,
  type CaseStudyFormValues,
} from '@/components/case-studies/CaseStudyForm';
import { CaseStudySummaryReview } from '@/components/case-studies/CaseStudySummaryReview';

interface Step5Props {
  deckId: string;
  properties: DeckPropertyFull[];
  onBack: () => void;
  onNext: () => void;
}

export function Step5CaseStudies({ deckId, properties, onBack, onNext }: Step5Props) {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {};
    for (const p of properties) {
      const savedIds = p.caseStudies?.map((cs) => cs.caseStudyId) ?? [];
      init[p.id] = new Set(savedIds);
    }
    return init;
  });
  const [activeProperty, setActiveProperty] = useState(properties[0]?.id ?? '');

  // Inline create form (shared CaseStudyForm, compact styling)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formInitial, setFormInitial] = useState<CaseStudyFormValues>(emptyCaseStudyForm);
  // Remounts the form so a fresh open never inherits the previous open's state.
  const [formInstance, setFormInstance] = useState(0);
  const [destinationOptions, setDestinationOptions] = useState<string[]>([]);
  const [destinationsLoaded, setDestinationsLoaded] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [summary, setSummary] = useState<{ drafts: CaseStudySummaryDraft[]; warnings: string[] } | null>(null);

  // handleAutoUpload (below) replaces the separate single/summary handlers.
  const [pdfMessage, setPdfMessage] = useState('');
  const [imagesNote, setImagesNote] = useState('');
  // AI Title & Narrative is only offered when the deck has a primary objective
  // (set in Step 4) — without one there's nothing to anchor the headline to.
  const [hasPrimaryObjective, setHasPrimaryObjective] = useState(false);

  useEffect(() => {
    getDeckObjectives(deckId)
      .then((objs) => setHasPrimaryObjective(objs.some((o) => o.isPrimary)))
      .catch(() => setHasPrimaryObjective(false));
  }, [deckId]);

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
      .catch(() => {})
      .finally(() => setDestinationsLoaded(true));
  }, []);

  async function load() {
    try {
      const res = await getCaseStudies({ search: search || undefined, limit: 50 });
      setCaseStudies(res.data);
    } catch {
      setError('Failed to load case studies');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search]);

  // Auto-save selections when they change
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      for (const prop of properties) {
        const ids = Array.from(selected[prop.id] ?? []);
        await setPropertyCaseStudies(
          deckId,
          prop.id,
          ids.map((caseStudyId, i) => ({ caseStudyId, sortOrder: i })),
        );
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [selected]);

  function toggleCaseStudy(propertyId: string, csId: string) {
    setSelected((prev) => {
      const next = { ...prev };
      const set = new Set(next[propertyId]);
      if (set.has(csId)) {
        set.delete(csId);
      } else {
        set.add(csId);
      }
      next[propertyId] = set;
      return next;
    });
  }

  function openCreateForm() {
    setFormInitial(emptyCaseStudyForm);
    setPdfMessage('');
    setImagesNote('');
    setFormInstance((n) => n + 1);
    setShowCreateForm(true);
  }

  function handleCreated(created: CaseStudy) {
    setCaseStudies((prev) => [created, ...prev]);
    toggleCaseStudy(activeProperty, created.id);
    setShowCreateForm(false);
    setPdfMessage('');
    setImagesNote('');
  }

  function applyDraft(draft: CaseStudyDraft) {
    const { imagesNote: note, message } = summariseDraft(draft);
    setFormInitial(draftToFormValues(draft));
    setImagesNote(note);
    setPdfMessage(message);
    setFormInstance((n) => n + 1);
    setShowCreateForm(true);
  }

  // One button: the API classifies the PDF and we open either the create form
  // (single hotel) or the per-card summary review (multiple hotels).
  async function handleAutoUpload(file: File) {
    setParsingPdf(true);
    setPdfMessage('');
    setImagesNote('');
    setError('');
    try {
      const res = await parseCaseStudyPdfAuto(file);
      if (res.documentType === 'summary' && res.summary) {
        if (res.summary.drafts.length === 0) {
          setError('No property cards were found in that PDF.');
          return;
        }
        setSummary({ drafts: res.summary.drafts, warnings: res.summary.warnings });
      } else if (res.draft) {
        applyDraft(res.draft);
      } else {
        setError('Nothing could be extracted from that PDF.');
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

  const [saving, setSaving] = useState(false);

  async function handleSaveAndNext() {
    setSaving(true);
    setError('');
    try {
      for (const prop of properties) {
        const ids = Array.from(selected[prop.id] ?? []);
        await setPropertyCaseStudies(
          deckId,
          prop.id,
          ids.map((caseStudyId, i) => ({ caseStudyId, sortOrder: i })),
        );
      }
      onNext();
    } catch {
      setError('Failed to save case study selections');
    } finally {
      setSaving(false);
    }
  }

  const totalSelected = Object.values(selected).reduce((sum, s) => sum + s.size, 0);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Case Studies</h2>
      <p className="text-sm text-gray-500 mb-6">
        Select case studies for each property from the library, or create new ones.
      </p>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {destinationsLoaded && destinationOptions.length === 0 && <DealTiersMissingBanner />}

      {/* Property tabs */}
      {properties.length > 1 && (
        <div className="flex gap-1 mb-4">
          {properties.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProperty(p.id)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                activeProperty === p.id
                  ? 'bg-[#01B18B] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.propertyName}
              {selected[p.id]?.size > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">{selected[p.id].size}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Search + Upload PDF + Create button */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search case studies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
        />
        <label className={`rounded-md border border-[#01B18B] px-4 py-2 text-sm text-[#01B18B] hover:bg-[#E6F9F5] shrink-0 cursor-pointer inline-flex items-center gap-2 ${parsingPdf ? 'opacity-50 pointer-events-none' : ''}`}>
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
          onClick={openCreateForm}
          className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] shrink-0"
        >
          + Create New
        </button>
      </div>

      {summary && (
        <CaseStudySummaryReview
          drafts={summary.drafts}
          warnings={summary.warnings}
          onClose={() => { setSummary(null); void load(); }}
          onCreated={() => { void load(); }}
        />
      )}

      {pdfMessage && <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">{pdfMessage}</div>}

      {/* Inline create form (shared with the library page) */}
      {showCreateForm && (
        <CaseStudyForm
          key={formInstance}
          initial={formInitial}
          destinationOptions={destinationOptions}
          compact
          submitLabel="Create & Select"
          imagesNote={imagesNote}
          aiDeckId={hasPrimaryObjective ? deckId : undefined}
          onSaved={handleCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : caseStudies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center mb-6">
          <p className="text-gray-500">No case studies in the library yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Use the "Create New" button above to add one.
          </p>
        </div>
      ) : (
        <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
          {caseStudies.map((cs) => {
            const isSelected = selected[activeProperty]?.has(cs.id);

            return (
              <label
                key={cs.id}
                className={`flex items-start gap-3 rounded-md border px-4 py-3 cursor-pointer text-sm ${
                  isSelected ? 'border-[#01B18B]/50 bg-[#E6F9F5]' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCaseStudy(activeProperty, cs.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{cs.hotelName}</div>
                  {cs.title && <div className="text-xs text-gray-600">{cs.title}</div>}
                  <div className="text-xs text-gray-500">
                    {cs.destination || 'No location'}
                    {cs.roomNights != null && ` · ${cs.roomNights} RN`}
                    {cs.revenue && ` · $${Number(cs.revenue).toLocaleString()}`}
                  </div>
                  {cs.tags && cs.tags.length > 0 && (
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {cs.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {totalSelected > 0 && (
        <p className="mb-4 text-sm text-gray-500">{totalSelected} case study{totalSelected !== 1 ? 'ies' : ''} selected</p>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 px-6 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleSaveAndNext}
          disabled={saving}
          className="rounded-md bg-[#01B18B] px-6 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Next: Marketing Assets'}
        </button>
      </div>

    </div>
  );
}

