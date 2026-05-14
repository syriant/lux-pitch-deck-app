import { useState, useEffect, useMemo } from 'react';
import { getObjectiveTemplates, type ObjectiveTemplate } from '@/api/objectives.api';
import { getDifferentiators, type Differentiator } from '@/api/differentiators.api';
import { setDeckObjectives, setDeckDifferentiators, getDeckObjectives, getDeckDifferentiators, updateDeck, type FullDeck, type DeckDifferentiatorFull } from '@/api/decks.api';
import { SlideRenderer } from '@/components/preview/SlideRenderer';

const MAX_DIFFERENTIATORS = 6;

// Slides that are hidden by default unless at least one differentiator
// from the matching category is selected. The PCM can override visibility
// in the preview, but re-saving the wizard re-asserts the rule below.
// `label` is used in the wizard's slide-preview column.
const SLIDE_VISIBILITY_RULES: Array<{ slideId: 'reach' | 'demographics'; diffCategory: string; label: string }> = [
  { slideId: 'reach', diffCategory: 'reach', label: 'Our Reach' },
  { slideId: 'demographics', diffCategory: 'demographics', label: 'Our Customers' },
];

function parseHiddenSlides(json: string | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

interface Step4Props {
  deckId: string;
  deck: FullDeck;
  registerSave?: (fn: (() => Promise<void>) | null) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step4Objectives({ deckId, deck, registerSave, onBack, onNext }: Step4Props) {
  const [templates, setTemplates] = useState<ObjectiveTemplate[]>([]);
  const [allDifferentiators, setAllDifferentiators] = useState<Differentiator[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [freeText, setFreeText] = useState('');
  const [freeTexts, setFreeTexts] = useState<string[]>([]);
  // primaryKey identifies the user-chosen primary: `tmpl:{id}` or `free:{index}`.
  const [primaryKey, setPrimaryKey] = useState<string | null>(null);
  const [suggestedDiffIds, setSuggestedDiffIds] = useState<Set<string>>(new Set());
  const [selectedDiffIds, setSelectedDiffIds] = useState<Set<string>>(new Set());
  const [hiddenSlides, setHiddenSlides] = useState<string[]>(() =>
    parseHiddenSlides(deck.customFields?.['hiddenSlides']),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [tmpl, diffs, savedObjs, savedDiffs] = await Promise.all([
          getObjectiveTemplates(),
          getDifferentiators(),
          getDeckObjectives(deckId),
          getDeckDifferentiators(deckId),
        ]);
        setTemplates(tmpl.filter((t) => t.active));
        setAllDifferentiators(diffs.filter((d) => d.active));

        // Pre-populate from saved data
        if (savedObjs.length > 0) {
          const selectedIds = new Set<string>();
          const freeItems: string[] = [];
          let savedPrimary: string | null = null;

          for (const obj of savedObjs) {
            const matchingTemplate = tmpl.find((t) => t.text === obj.objectiveText);
            if (matchingTemplate) {
              selectedIds.add(matchingTemplate.id);
              if (obj.isPrimary) savedPrimary = `tmpl:${matchingTemplate.id}`;
            } else {
              const idx = freeItems.length;
              freeItems.push(obj.objectiveText);
              if (obj.isPrimary) savedPrimary = `free:${idx}`;
            }
          }
          setSelectedTemplateIds(selectedIds);
          setFreeTexts(freeItems);
          setPrimaryKey(savedPrimary);
        }

        if (savedDiffs.length > 0) {
          setSelectedDiffIds(new Set(savedDiffs.map((d) => d.differentiatorId)));
        }
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [deckId]);

  // Build the ordered list of differentiator IDs suggested by the currently
  // selected objectives. Primary objective's differentiators come first, then
  // remaining objectives in template display order, deduplicated.
  function computeOrderedSuggestions(
    templateIds: Set<string>,
    primaryK: string | null,
  ): string[] {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const push = (tmpl?: ObjectiveTemplate) => {
      if (!tmpl?.differentiatorIds) return;
      for (const dId of tmpl.differentiatorIds) {
        if (!seen.has(dId)) {
          ordered.push(dId);
          seen.add(dId);
        }
      }
    };
    if (primaryK?.startsWith('tmpl:')) {
      const primaryId = primaryK.slice(5);
      if (templateIds.has(primaryId)) push(templates.find((t) => t.id === primaryId));
    }
    for (const tmpl of templates) {
      if (templateIds.has(tmpl.id)) push(tmpl);
    }
    return ordered;
  }

  // Keep the visual "suggested" set in sync with the current objectives.
  // This is purely derived state — never modifies selectedDiffIds, so reload
  // doesn't resurrect a differentiator the user explicitly deselected.
  useEffect(() => {
    setSuggestedDiffIds(new Set(computeOrderedSuggestions(selectedTemplateIds, primaryKey)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateIds, templates, primaryKey]);

  function toggleTemplate(id: string) {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (primaryKey === `tmpl:${id}`) setPrimaryKey(null);
      } else {
        next.add(id);
        // Newly-ticked objective triggers auto-fill of its suggested
        // differentiators, up to the cap. Untick or reload never auto-fills,
        // so prior deselections survive.
        const suggested = computeOrderedSuggestions(next, primaryKey);
        setSelectedDiffIds((prevDiffs) => {
          const nextDiffs = new Set(prevDiffs);
          for (const dId of suggested) {
            if (nextDiffs.size >= MAX_DIFFERENTIATORS) break;
            nextDiffs.add(dId);
          }
          return nextDiffs;
        });
      }
      return next;
    });
  }

  function toggleDifferentiator(id: string) {
    setSelectedDiffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_DIFFERENTIATORS) return prev;
        next.add(id);
      }
      return next;
    });
  }

  function addFreeText() {
    const text = freeText.trim();
    if (!text) return;
    setFreeTexts((prev) => [...prev, text]);
    setFreeText('');
  }

  function removeFreeText(index: number) {
    setFreeTexts((prev) => prev.filter((_, i) => i !== index));
    if (primaryKey === `free:${index}`) setPrimaryKey(null);
    else if (primaryKey?.startsWith('free:')) {
      const removedIdx = Number(primaryKey.slice(5));
      if (removedIdx > index) setPrimaryKey(`free:${removedIdx - 1}`);
    }
  }

  async function persist() {
    if (loading) return;
    const objectives = [
      ...Array.from(selectedTemplateIds).map((id) => {
        const tmpl = templates.find((t) => t.id === id);
        return { text: tmpl?.text ?? '', source: 'template', isPrimary: primaryKey === `tmpl:${id}` };
      }),
      ...freeTexts.map((text, i) => ({ text, source: 'freetext', isPrimary: primaryKey === `free:${i}` })),
    ];
    await Promise.all([
      setDeckObjectives(deckId, objectives),
      setDeckDifferentiators(deckId, Array.from(selectedDiffIds)),
    ]);

    // Reconcile category-driven slide visibility: each slide listed in
    // SLIDE_VISIBILITY_RULES is hidden unless at least one differentiator
    // in the matching category is selected. The PCM can override per slide
    // in the preview, but re-saving here re-asserts the wizard's intent.
    let nextHidden: string[] = hiddenSlides;
    let changed = false;
    for (const { slideId, diffCategory } of SLIDE_VISIBILITY_RULES) {
      const categoryDiffIds = allDifferentiators
        .filter((d) => d.category === diffCategory)
        .map((d) => d.id);
      if (categoryDiffIds.length === 0) continue;
      const anySelected = categoryDiffIds.some((id) => selectedDiffIds.has(id));
      const isHidden = nextHidden.includes(slideId);
      if (anySelected && isHidden) {
        nextHidden = nextHidden.filter((s) => s !== slideId);
        changed = true;
      } else if (!anySelected && !isHidden) {
        nextHidden = [...nextHidden, slideId];
        changed = true;
      }
    }
    if (!changed) return;
    const updatedFields = {
      ...(deck.customFields ?? {}),
      hiddenSlides: JSON.stringify(nextHidden),
    };
    await updateDeck(deckId, { customFields: updatedFields });
    setHiddenSlides(nextHidden);
  }

  // Register save with the wizard so Save & Exit / Preview / step-jump persist
  // the current selection. Re-register when state changes so the closure captures
  // the latest values.
  useEffect(() => {
    registerSave?.(persist);
    return () => registerSave?.(null);
  }, [registerSave, loading, selectedTemplateIds, freeTexts, primaryKey, selectedDiffIds, templates, allDifferentiators, hiddenSlides]);

  async function handleSaveAndNext() {
    setSaving(true);
    setError('');
    try {
      await persist();
      onNext();
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const categoryLabels: Record<string, string> = {
    revenue: 'Revenue',
    volume: 'Volume',
    adr: 'ADR',
    awareness: 'Awareness',
    marketing: 'Marketing',
    audience: 'Audience',
  };

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  // Group templates by category
  const categories = [...new Set(templates.map((t) => t.category ?? 'other'))];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Campaign Objectives</h2>
      <p className="text-sm text-gray-500 mb-6">
        Select objectives from templates or add your own. Tap the star next to a selection to mark it as the Primary
        objective on the slide. Differentiators are auto-suggested based on your selections — up to {MAX_DIFFERENTIATORS} fit
        on the slide.
      </p>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Left: Objectives */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Objective Templates</h3>
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat}>
                <div className="text-xs font-medium text-gray-500 uppercase mb-1.5">
                  {categoryLabels[cat] ?? cat}
                </div>
                <div className="space-y-1">
                  {templates
                    .filter((t) => (t.category ?? 'other') === cat)
                    .map((tmpl) => {
                      const isSelected = selectedTemplateIds.has(tmpl.id);
                      const isPrimary = primaryKey === `tmpl:${tmpl.id}`;
                      return (
                        <label
                          key={tmpl.id}
                          className={`flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm ${
                            isSelected ? 'border-[#01B18B]/50 bg-[#E6F9F5]' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTemplate(tmpl.id)}
                            className="mt-0.5"
                          />
                          <span className="flex-1">{tmpl.text}</span>
                          {isSelected && (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); setPrimaryKey(isPrimary ? null : `tmpl:${tmpl.id}`); }}
                              title={isPrimary ? 'Primary objective' : 'Mark as primary'}
                              className={`shrink-0 text-base leading-none ${isPrimary ? 'text-[#01B18B]' : 'text-gray-300 hover:text-[#01B18B]'}`}
                            >
                              {isPrimary ? '★' : '☆'}
                            </button>
                          )}
                        </label>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {/* Free text */}
          <div className="mt-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1.5">Custom Objectives</div>
            {freeTexts.map((text, i) => {
              const isPrimary = primaryKey === `free:${i}`;
              return (
                <div key={i} className="flex items-center gap-2 mb-1 rounded-md border border-gray-200 px-3 py-2 text-sm">
                  <span className="flex-1">{text}</span>
                  <button
                    type="button"
                    onClick={() => setPrimaryKey(isPrimary ? null : `free:${i}`)}
                    title={isPrimary ? 'Primary objective' : 'Mark as primary'}
                    className={`text-base leading-none ${isPrimary ? 'text-[#01B18B]' : 'text-gray-300 hover:text-[#01B18B]'}`}
                  >
                    {isPrimary ? '★' : '☆'}
                  </button>
                  <button onClick={() => removeFreeText(i)} className="text-red-500 text-xs hover:underline">Remove</button>
                </div>
              );
            })}
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFreeText(); } }}
                placeholder="Type a custom objective..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
              />
              <button
                onClick={addFreeText}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Right: Differentiators */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Differentiators
            <span className="ml-2 font-normal text-gray-400 text-xs">
              ({selectedDiffIds.size} of {MAX_DIFFERENTIATORS} selected
              {suggestedDiffIds.size > 0 ? `, ${suggestedDiffIds.size} suggested` : ''})
            </span>
          </h3>
          {selectedDiffIds.size >= MAX_DIFFERENTIATORS && (
            <p className="mb-2 text-xs text-amber-600">
              Maximum {MAX_DIFFERENTIATORS} differentiators — deselect one to swap.
            </p>
          )}
          <div className="space-y-1">
            {allDifferentiators.map((diff) => {
              const isSuggested = suggestedDiffIds.has(diff.id);
              const isSelected = selectedDiffIds.has(diff.id);
              const atCap = selectedDiffIds.size >= MAX_DIFFERENTIATORS;
              const disabled = !isSelected && atCap;

              return (
                <label
                  key={diff.id}
                  className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? isSuggested
                        ? 'border-green-300 bg-green-50'
                        : 'border-[#01B18B]/50 bg-[#E6F9F5]'
                      : isSuggested
                        ? 'border-green-200 bg-green-50/40 hover:bg-green-50'
                        : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  title={disabled ? `Maximum ${MAX_DIFFERENTIATORS} differentiators reached` : undefined}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => toggleDifferentiator(diff.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium">{diff.title}</div>
                    {isSuggested && (
                      <div className="text-xs text-green-600">
                        {isSelected ? 'Auto-suggested' : 'Suggested — deselect another to add'}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Right: Live DifferentiatorsSlide preview */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Slide Preview
            {selectedDiffIds.size > 0 && (
              <span className="ml-2 font-normal text-gray-400 text-xs">
                ({selectedDiffIds.size} on slide)
              </span>
            )}
          </h3>
          <DifferentiatorsPreview deck={deck} allDifferentiators={allDifferentiators} selectedDiffIds={selectedDiffIds} />
        </div>
      </div>

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
          {saving ? 'Saving...' : 'Next: Case Studies'}
        </button>
      </div>
    </div>
  );
}

interface DifferentiatorsPreviewProps {
  deck: FullDeck;
  allDifferentiators: Differentiator[];
  selectedDiffIds: Set<string>;
}

function DifferentiatorsPreview({ deck, allDifferentiators, selectedDiffIds }: DifferentiatorsPreviewProps) {
  const thumbWidth = 300;
  const scale = thumbWidth / 1280;
  const thumbHeight = thumbWidth * (9 / 16);

  const previewDeck = useMemo<FullDeck>(() => {
    const selected: DeckDifferentiatorFull[] = allDifferentiators
      .filter((d) => selectedDiffIds.has(d.id))
      .map((d, idx) => ({
        id: `preview-${d.id}`,
        deckId: deck.id,
        differentiatorId: d.id,
        sortOrder: idx,
        differentiator: {
          id: d.id,
          title: d.title,
          description: d.description ?? null,
          category: d.category ?? null,
        },
      }));
    return { ...deck, differentiators: selected };
  }, [deck, allDifferentiators, selectedDiffIds]);

  const triggeredSlides = useMemo(() => {
    return SLIDE_VISIBILITY_RULES.filter(({ diffCategory }) => {
      const categoryIds = allDifferentiators
        .filter((d) => d.category === diffCategory)
        .map((d) => d.id);
      return categoryIds.some((id) => selectedDiffIds.has(id));
    });
  }, [allDifferentiators, selectedDiffIds]);

  if (selectedDiffIds.size === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-4 text-xs text-gray-400 text-center">
        Select differentiators to preview how they will appear on the slide.
      </div>
    );
  }

  const selected = allDifferentiators.filter((d) => selectedDiffIds.has(d.id));

  return (
    <div className="space-y-4">
      <ThumbCard label="Why Partner With Us" width={thumbWidth} height={thumbHeight}>
        <SlideRenderer
          slide={{ id: 'differentiators', type: 'differentiators', label: 'Why Partner With Us' }}
          deck={previewDeck}
          scale={scale}
        />
      </ThumbCard>

      {triggeredSlides.map(({ slideId, label }) => (
        <ThumbCard key={slideId} label={label} width={thumbWidth} height={thumbHeight}>
          <SlideRenderer
            slide={{ id: slideId, type: slideId, label }}
            deck={previewDeck}
            scale={scale}
          />
        </ThumbCard>
      ))}

      <div className="space-y-2" style={{ width: thumbWidth }}>
        {selected.map((diff) => (
          <div
            key={diff.id}
            className="rounded-md p-3"
            style={{ backgroundColor: '#dff0ee' }}
          >
            <div
              className="w-8 border-t-2 mb-2"
              style={{ borderColor: '#00b2a0' }}
            />
            <div
              className="text-sm font-bold mb-1"
              style={{ color: '#00b2a0' }}
            >
              {diff.title}
            </div>
            {diff.description && (
              <div className="text-xs text-gray-700 leading-relaxed">
                {diff.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ThumbCard({
  label, width, height, children,
}: {
  label: string;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ width }}>
      <div
        className="rounded border border-gray-200 shadow-sm overflow-hidden"
        style={{ width, height }}
      >
        {children}
      </div>
      <div className="mt-1 text-[11px] font-medium text-gray-500">{label}</div>
    </div>
  );
}
