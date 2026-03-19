import { useState, useEffect } from 'react';
import { getCaseStudies, type CaseStudy } from '@/api/case-studies.api';
import { type DeckPropertyFull, setPropertyCaseStudies } from '@/api/decks.api';

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
        Select case studies for each property from the library.
      </p>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

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

      {/* Search */}
      <input
        type="text"
        placeholder="Search case studies..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
      />

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : caseStudies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center mb-6">
          <p className="text-gray-500">No case studies in the library yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Add case studies via the <a href="/case-studies" className="text-[#01B18B] hover:underline">Case Study Library</a>.
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
                  <div className="text-xs text-gray-500">
                    {[cs.destination, cs.region].filter(Boolean).join(' · ') || 'No location'}
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
