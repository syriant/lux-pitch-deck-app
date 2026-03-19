import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getFullDeck, updateDeck as updateDeckApi, updateProperty, setDeckObjectives, updateOption,
  type FullDeck,
} from '@/api/decks.api';
import { updateCaseStudy } from '@/api/case-studies.api';
import { buildSlideList, type SlideDefinition } from '@/components/preview/slide-types';
import { SlideStrip } from '@/components/preview/SlideStrip';
import { SlideRenderer } from '@/components/preview/SlideRenderer';

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
  const [slides, setSlides] = useState<SlideDefinition[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await getFullDeck(id);
        setDeck(d);
        setSlides(buildSlideList(d));
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
          // Update the specific objective text, then save full array
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
          // Save to deck.customFields — merge with existing
          const updated = { ...(deck.customFields ?? {}), [field]: value };
          await updateDeckApi(id, { customFields: updated });
          setDeck((prev) => {
            if (!prev) return prev;
            return { ...prev, customFields: updated };
          });
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
        // Silently fail for now — could add toast notifications later
        console.error(`Failed to save ${entityType}.${field}`);
      }

      // Rebuild slides from updated deck
      setDeck((prev) => {
        if (prev) setSlides(buildSlideList(prev));
        return prev;
      });
    },
    [deck, id],
  );

  const handleGalleryAdd = useCallback(async (url: string) => {
    if (!deck || !id) return;
    const updated = [...(deck.gallery ?? []), url];
    await updateDeckApi(id, { gallery: updated });
    setDeck((prev) => prev ? { ...prev, gallery: updated } : prev);
  }, [deck, id]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setSlides((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      // Persist the reorder as slideOrder if deck has a template
      if (id && deck?.templateId) {
        // Deduplicate: collapse per-property slides back to a single entry
        const seen = new Set<string>();
        const slideOrder = next.reduce<Array<{ type: string; label: string; required?: boolean; perProperty?: boolean }>>((acc, s) => {
          // Strip property suffix from id to get base type
          const baseType = s.type;
          if (seen.has(baseType)) return acc;
          seen.add(baseType);

          // Find original template slide definition for metadata
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
      // Don't navigate when editing text
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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

  if (loading) return <div className="p-8 text-gray-500">Loading preview...</div>;
  if (error || !deck) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error || 'Deck not found'}</div>
      </div>
    );
  }

  const activeSlide = slides[activeIndex];

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/decks/${id}/edit`)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back to Wizard
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-semibold text-gray-900">{deck.name}</h1>
          <span className="text-xs text-gray-400">
            {slides.length} slides
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnail strip */}
        <SlideStrip
          slides={slides}
          deck={deck}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onReorder={handleReorder}
        />

        {/* Main slide view */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          {activeSlide && (
            <div className="w-full max-w-5xl">
              <SlideRenderer slide={activeSlide} deck={deck} onFieldChange={handleFieldChange} onGalleryAdd={handleGalleryAdd} />
              <div className="mt-3 text-center text-xs text-gray-400">
                {activeIndex + 1} / {slides.length} — {activeSlide.label}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
