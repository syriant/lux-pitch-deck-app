import { useState, useEffect, useRef, type FormEvent } from 'react';
import { getCaseStudies, createCaseStudy, type CaseStudy } from '@/api/case-studies.api';
import { type DeckPropertyFull, setPropertyCaseStudies } from '@/api/decks.api';
import { getDestinations, type DestinationOption } from '@/api/deal-tiers.api';
import { uploadImage, uploadUrl } from '@/api/upload.api';
import { DestinationCombobox } from '@/components/common/DestinationCombobox';
import { Spinner } from '@/components/common/Spinner';

interface Step5Props {
  deckId: string;
  properties: DeckPropertyFull[];
  onBack: () => void;
  onNext: () => void;
}

interface InlineForm {
  title: string;
  hotelName: string;
  destination: string;
  propertyType: string;
  tags: string;
  roomNights: string;
  revenue: string;
  adr: string;
  alos: string;
  leadTime: string;
  bookings: string;
  narrative: string;
}

const emptyForm: InlineForm = {
  title: '',
  hotelName: '',
  destination: '',
  propertyType: '',
  tags: '',
  roomNights: '',
  revenue: '',
  adr: '',
  alos: '',
  leadTime: '',
  bookings: '',
  narrative: '',
};

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

  // Inline create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<InlineForm>(emptyForm);
  const [createImages, setCreateImages] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [destinationOptions, setDestinationOptions] = useState<string[]>([]);

  useEffect(() => {
    getDestinations()
      .then((opts) => {
        const labels = opts.map((o: DestinationOption) =>
          o.subDestination ? `${o.destination}, ${o.subDestination}` : o.destination,
        ).sort((a: string, b: string) => a.localeCompare(b));
        setDestinationOptions(labels);
      })
      .catch(() => {});
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
    setCreateForm(emptyForm);
    setCreateImages([]);
    setShowCreateForm(true);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const tags = createForm.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const created = await createCaseStudy({
        title: createForm.title,
        hotelName: createForm.hotelName,
        destination: createForm.destination || undefined,
        propertyType: createForm.propertyType || undefined,
        tags: tags.length > 0 ? tags : undefined,
        roomNights: createForm.roomNights ? Number(createForm.roomNights) : undefined,
        revenue: createForm.revenue ? Number(createForm.revenue) : undefined,
        adr: createForm.adr ? Number(createForm.adr) : undefined,
        alos: createForm.alos ? Number(createForm.alos) : undefined,
        leadTime: createForm.leadTime ? Number(createForm.leadTime) : undefined,
        bookings: createForm.bookings ? Number(createForm.bookings) : undefined,
        narrative: createForm.narrative || undefined,
        images: createImages.length > 0 ? createImages : undefined,
      });
      // Add to list and auto-select for the active property
      setCaseStudies((prev) => [created, ...prev]);
      toggleCaseStudy(activeProperty, created.id);
      setShowCreateForm(false);
      setCreateForm(emptyForm);
    } catch {
      setError('Failed to create case study');
    } finally {
      setCreating(false);
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

      {/* Search + Create button */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search case studies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
        />
        <button
          onClick={openCreateForm}
          className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] shrink-0"
        >
          + Create New
        </button>
      </div>

      {/* Inline create form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="mb-4 rounded-lg border border-[#01B18B]/30 bg-[#E6F9F5] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">New Case Study</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input
                type="text"
                required
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g. 8-week campaign driving 250 room nights"
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hotel Name *</label>
              <input
                type="text"
                required
                value={createForm.hotelName}
                onChange={(e) => setCreateForm({ ...createForm, hotelName: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Destination</label>
              <DestinationCombobox
                options={destinationOptions}
                value={createForm.destination}
                onChange={(sel) => setCreateForm({ ...createForm, destination: sel.label })}
                placeholder="Search or type a destination..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Property Type</label>
              <input
                type="text"
                value={createForm.propertyType}
                onChange={(e) => setCreateForm({ ...createForm, propertyType: e.target.value })}
                placeholder="e.g. Resort, Boutique Hotel"
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={createForm.tags}
                onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
                placeholder="e.g. beach, family, luxury"
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Room Nights</label>
              <input
                type="number"
                value={createForm.roomNights}
                onChange={(e) => setCreateForm({ ...createForm, roomNights: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Revenue ($)</label>
              <input
                type="number"
                step="0.01"
                value={createForm.revenue}
                onChange={(e) => setCreateForm({ ...createForm, revenue: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ADR ($)</label>
              <input
                type="number"
                step="0.01"
                value={createForm.adr}
                onChange={(e) => setCreateForm({ ...createForm, adr: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ALOS (days)</label>
              <input
                type="number"
                step="0.1"
                max="99"
                value={createForm.alos}
                onChange={(e) => setCreateForm({ ...createForm, alos: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bookings</label>
              <input
                type="number"
                value={createForm.bookings}
                onChange={(e) => setCreateForm({ ...createForm, bookings: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Narrative</label>
            <textarea
              rows={2}
              value={createForm.narrative}
              onChange={(e) => setCreateForm({ ...createForm, narrative: e.target.value })}
              placeholder="Brief summary of the campaign results..."
              className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Images</label>
            <div className="flex gap-2 flex-wrap">
              {createImages.map((url) => (
                <div key={url} className="relative group w-16 h-16 rounded border border-gray-200 overflow-hidden">
                  <img src={uploadUrl(url) ?? ''} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCreateImages((prev) => prev.filter((u) => u !== url))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <ImageUploadTile
                onUploaded={(url) => setCreateImages((prev) => [...prev, url])}
                onError={() => setError('Failed to upload image')}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-[#01B18B] px-4 py-1.5 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create & Select'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
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

function ImageUploadTile({ onUploaded, onError }: { onUploaded: (url: string) => void; onError: () => void }) {
  const [uploading, setUploading] = useState(false);
  return (
    <label className={`w-16 h-16 rounded border-2 border-dashed flex items-center justify-center cursor-pointer text-lg ${
      uploading ? 'border-[#01B18B] bg-[#E6F9F5]' : 'border-gray-300 hover:border-gray-400 text-gray-400'
    }`}>
      {uploading ? <Spinner size="sm" className="text-[#01B18B]" /> : '+'}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            const result = await uploadImage(file);
            onUploaded(result.url);
          } catch {
            onError();
          } finally {
            setUploading(false);
          }
          e.target.value = '';
        }}
      />
    </label>
  );
}
