import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { type TemplateSlide } from '@/api/templates.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { buildSlideList } from '@/components/preview/slide-types';
import { SlideRenderer } from '@/components/preview/SlideRenderer';
import { SlideEditorContext } from '@/components/preview/SlideEditorContext';
import { SLIDE_DEFAULTS } from '@/components/preview/slide-defaults';
import { buildTemplatePreviewDeck } from './template-preview-deck';

interface TemplateSlideEditorProps {
  slides: TemplateSlide[];
  templateDefaults: Record<string, string>;
  onTemplateDefaultsChange: (next: Record<string, string>) => void;
}

// Horizontal thumbnail sizing — small enough to fit 6–7 in view before horizontal scroll
const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 90; // 16:9
const THUMB_SCALE = THUMB_WIDTH / 1280;

const REACH_REGIONS = [
  'North America',
  'United Kingdom',
  'Europe',
  'Middle East',
  'India',
  'Asia',
  'Australia',
  'New Zealand',
];

export function TemplateSlideEditor({
  slides,
  templateDefaults,
  onTemplateDefaultsChange,
}: TemplateSlideEditorProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);

  const previewDeck = useMemo(
    () => buildTemplatePreviewDeck({ slides, templateDefaults }),
    [slides, templateDefaults],
  );

  const slideList = useMemo(() => buildSlideList(previewDeck), [previewDeck]);

  // Clamp active index in case slides changed
  const safeActiveIndex = Math.min(activeIndex, Math.max(slideList.length - 1, 0));
  const activeSlide = slideList[safeActiveIndex];

  // Scroll active thumbnail into view when it changes
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const activeEl = strip.querySelector<HTMLButtonElement>(`[data-slide-index="${safeActiveIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }, [safeActiveIndex]);

  // Field change handler — only handles 'custom' edits, writes to local templateDefaults
  const handleFieldChange = useCallback<FieldChangeHandler>(
    (entityType, _entityId, field, value) => {
      if (entityType !== 'custom') {
        // Property/objective/option/case-study edits are no-ops in the template editor
        // (they would only affect the placeholder data, not be saved anywhere)
        return;
      }
      onTemplateDefaultsChange({ ...templateDefaults, [field]: value });
    },
    [templateDefaults, onTemplateDefaultsChange],
  );

  // Reset handler — removes the key and its sibling .size and .align entries
  const handleResetTemplateDefault = useCallback(
    (fieldKey: string) => {
      const next = { ...templateDefaults };
      delete next[fieldKey];
      delete next[`${fieldKey}.size`];
      delete next[`${fieldKey}.align`];
      onTemplateDefaultsChange(next);
    },
    [templateDefaults, onTemplateDefaultsChange],
  );

  // Belt-and-braces: prevent Enter keys inside contentEditables from bubbling up and
  // accidentally submitting the outer template form.
  function handleKeyDownCapture(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      const target = e.target as HTMLElement;
      if (target.isContentEditable) {
        e.stopPropagation();
      }
    }
  }

  if (slideList.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        Add slides above to preview them.
      </div>
    );
  }

  return (
    <SlideEditorContext.Provider
      value={{
        templateDefaults,
        onResetTemplateDefault: handleResetTemplateDefault,
      }}
    >
      <div onKeyDownCapture={handleKeyDownCapture}>
        {/* Horizontal thumbnail strip */}
        <div
          ref={stripRef}
          className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 mb-3"
        >
          <div className="flex gap-2 items-start min-w-max">
            {slideList.map((slide, i) => {
              const isActive = i === safeActiveIndex;
              return (
                <button
                  type="button"
                  key={slide.id}
                  data-slide-index={i}
                  onClick={() => setActiveIndex(i)}
                  className={`group flex flex-col items-center shrink-0 cursor-pointer ${
                    isActive ? '' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={slide.label}
                >
                  <div
                    className={`rounded border-2 overflow-hidden bg-white shadow-sm transition-colors ${
                      isActive
                        ? 'border-[#01B18B] shadow'
                        : 'border-gray-200 group-hover:border-gray-400'
                    }`}
                    style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
                  >
                    <div
                      style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT, overflow: 'hidden' }}
                    >
                      <SlideRenderer slide={slide} deck={previewDeck} scale={THUMB_SCALE} />
                    </div>
                  </div>
                  <div
                    className={`mt-1 text-[10px] text-center truncate ${
                      isActive ? 'text-[#01B18B] font-semibold' : 'text-gray-500'
                    }`}
                    style={{ maxWidth: THUMB_WIDTH }}
                  >
                    {i + 1}. {slide.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main preview — full width, capped at max-w-5xl (1024px) to exactly match the
            deck preview's font proportions. No scale transform = no layout weirdness. */}
        <div className="rounded-lg border border-gray-200 bg-gray-100 p-6">
          {activeSlide && (
            <div className="w-full max-w-5xl mx-auto">
              <SlideRenderer
                slide={activeSlide}
                deck={previewDeck}
                onFieldChange={handleFieldChange}
              />
              <div className="mt-3 text-center text-xs text-gray-500">
                {safeActiveIndex + 1} / {slideList.length} — {activeSlide.label}
              </div>
            </div>
          )}
        </div>

        {/* Reach map labels editor — only show when active slide is reach */}
        {activeSlide?.type === 'reach' && (
          <ReachLabelsEditor
            templateDefaults={templateDefaults}
            onTemplateDefaultsChange={onTemplateDefaultsChange}
          />
        )}

        {/* Helper text */}
        <p className="mt-3 text-xs text-gray-500">
          Click any text on the slide to edit it. Hover for font-size, alignment, and reset controls.
          Edits are saved when you click <strong>Save Template</strong>.
        </p>
      </div>
    </SlideEditorContext.Provider>
  );
}

interface ReachLabelsEditorProps {
  templateDefaults: Record<string, string>;
  onTemplateDefaultsChange: (next: Record<string, string>) => void;
}

function ReachLabelsEditor({ templateDefaults, onTemplateDefaultsChange }: ReachLabelsEditorProps) {
  function setRegion(region: string, value: string) {
    onTemplateDefaultsChange({ ...templateDefaults, [`reach.${region}`]: value });
  }

  function resetRegion(region: string) {
    const next = { ...templateDefaults };
    delete next[`reach.${region}`];
    onTemplateDefaultsChange(next);
  }

  return (
    <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h4 className="text-sm font-semibold text-gray-800 mb-1">Reach map member counts</h4>
      <p className="text-xs text-gray-500 mb-3">
        These labels are drawn on the map canvas and can't be edited inline.
      </p>
      <div className="grid grid-cols-4 gap-3">
        {REACH_REGIONS.map((region) => {
          const key = `reach.${region}`;
          const isOverridden = templateDefaults[key] !== undefined;
          const value = templateDefaults[key] ?? SLIDE_DEFAULTS[key]?.value ?? '';
          return (
            <div key={region}>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">{region}</label>
              <div className="flex gap-1 items-center">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setRegion(region, e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
                />
                {isOverridden && (
                  <button
                    type="button"
                    onClick={() => resetRegion(region)}
                    title="Reset to factory default"
                    className="text-sm text-gray-400 hover:text-gray-700 px-1"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
