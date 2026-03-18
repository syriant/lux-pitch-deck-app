import { useState, useEffect } from 'react';
import { getObjectiveTemplates, type ObjectiveTemplate } from '@/api/objectives.api';
import { getDifferentiators, type Differentiator } from '@/api/differentiators.api';
import { setDeckObjectives, setDeckDifferentiators, getDeckObjectives, getDeckDifferentiators } from '@/api/decks.api';

interface Step4Props {
  deckId: string;
  onBack: () => void;
  onNext: () => void;
}

export function Step4Objectives({ deckId, onBack, onNext }: Step4Props) {
  const [templates, setTemplates] = useState<ObjectiveTemplate[]>([]);
  const [allDifferentiators, setAllDifferentiators] = useState<Differentiator[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [freeText, setFreeText] = useState('');
  const [freeTexts, setFreeTexts] = useState<string[]>([]);
  const [suggestedDiffIds, setSuggestedDiffIds] = useState<Set<string>>(new Set());
  const [selectedDiffIds, setSelectedDiffIds] = useState<Set<string>>(new Set());
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

          for (const obj of savedObjs) {
            const matchingTemplate = tmpl.find((t) => t.text === obj.objectiveText);
            if (matchingTemplate) {
              selectedIds.add(matchingTemplate.id);
            } else {
              freeItems.push(obj.objectiveText);
            }
          }
          setSelectedTemplateIds(selectedIds);
          setFreeTexts(freeItems);
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

  // Auto-suggest differentiators when objectives change
  useEffect(() => {
    const suggested = new Set<string>();
    for (const id of selectedTemplateIds) {
      const tmpl = templates.find((t) => t.id === id);
      if (tmpl?.differentiatorIds) {
        for (const dId of tmpl.differentiatorIds) {
          suggested.add(dId);
        }
      }
    }
    setSuggestedDiffIds(suggested);

    // Auto-select suggested ones that aren't already selected
    setSelectedDiffIds((prev) => {
      const next = new Set(prev);
      for (const dId of suggested) {
        next.add(dId);
      }
      return next;
    });
  }, [selectedTemplateIds, templates]);

  function toggleTemplate(id: string) {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
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
  }

  async function handleSaveAndNext() {
    setSaving(true);
    setError('');
    try {
      const objectives = [
        ...Array.from(selectedTemplateIds).map((id) => {
          const tmpl = templates.find((t) => t.id === id);
          return { text: tmpl?.text ?? '', source: 'template' };
        }),
        ...freeTexts.map((text) => ({ text, source: 'freetext' })),
      ];

      await Promise.all([
        setDeckObjectives(deckId, objectives),
        setDeckDifferentiators(deckId, Array.from(selectedDiffIds)),
      ]);
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
        Select objectives from templates or add your own. Differentiators are auto-suggested based on your selections.
      </p>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-6 mb-6">
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
                    .map((tmpl) => (
                      <label
                        key={tmpl.id}
                        className={`flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm ${
                          selectedTemplateIds.has(tmpl.id)
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTemplateIds.has(tmpl.id)}
                          onChange={() => toggleTemplate(tmpl.id)}
                          className="mt-0.5"
                        />
                        <span>{tmpl.text}</span>
                      </label>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Free text */}
          <div className="mt-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1.5">Custom Objectives</div>
            {freeTexts.map((text, i) => (
              <div key={i} className="flex items-center gap-2 mb-1 rounded-md border border-gray-200 px-3 py-2 text-sm">
                <span className="flex-1">{text}</span>
                <button onClick={() => removeFreeText(i)} className="text-red-500 text-xs hover:underline">Remove</button>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFreeText(); } }}
                placeholder="Type a custom objective..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            {suggestedDiffIds.size > 0 && (
              <span className="ml-2 font-normal text-gray-400 text-xs">
                ({suggestedDiffIds.size} auto-suggested)
              </span>
            )}
          </h3>
          <div className="space-y-1">
            {allDifferentiators.map((diff) => {
              const isSuggested = suggestedDiffIds.has(diff.id);
              const isSelected = selectedDiffIds.has(diff.id);

              return (
                <label
                  key={diff.id}
                  className={`flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm ${
                    isSelected
                      ? isSuggested
                        ? 'border-green-300 bg-green-50'
                        : 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDifferentiator(diff.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium">{diff.title}</div>
                    {isSuggested && (
                      <div className="text-xs text-green-600">Auto-suggested</div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
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
          className="rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Next: Case Studies'}
        </button>
      </div>
    </div>
  );
}
