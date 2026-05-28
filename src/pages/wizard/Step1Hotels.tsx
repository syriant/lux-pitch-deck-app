import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  createProperty,
  updateProperty,
  deleteProperty,
  updateDeck,
  type DeckProperty,
} from '@/api/decks.api';
import { getDestinations, type DestinationOption } from '@/api/deal-tiers.api';
import {
  getSalesforceStatus,
  fetchSalesforceOpportunity,
  type OpportunitySummary,
} from '@/api/salesforce.api';
import { DestinationCombobox, type DestinationSelection } from '@/components/common/DestinationCombobox';
import { DealTiersMissingBanner } from '@/components/common/DealTiersMissingBanner';
import { substitutePlaceholders } from '@/components/preview/DeckRenderContext';

const HOTEL_INTRO_FIELD = 'hotelIntro.valueProp';
const HOTEL_INTRO_FALLBACK_LIMIT = 200;
const HOTEL_INTRO_DEBOUNCE_MS = 700;

interface Step1Props {
  deckId: string;
  properties: DeckProperty[];
  customFields: Record<string, string>;
  templateDefaults: Record<string, string>;
  salesforceOpportunityId: string | null;
  onPropertiesChange: () => Promise<void>;
  onDeckChange: () => Promise<void>;
  onNext: () => void;
}

interface PropertyForm {
  propertyName: string;
  destination: string;
  isCustomDestination: boolean;
}

const emptyForm: PropertyForm = { propertyName: '', destination: '', isCustomDestination: false };

function formatDestinationLabel(opt: DestinationOption): string {
  if (opt.subDestination) {
    return `${opt.destination}, ${opt.subDestination}`;
  }
  return opt.destination;
}

export function Step1Hotels({
  deckId,
  properties,
  customFields,
  templateDefaults,
  salesforceOpportunityId,
  onPropertiesChange,
  onDeckChange,
  onNext,
}: Step1Props) {
  const [showForm, setShowForm] = useState(properties.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyForm>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [destinationOptions, setDestinationOptions] = useState<string[]>([]);
  const [destinationsLoaded, setDestinationsLoaded] = useState(false);

  // Salesforce import — opp-id field + Import button. Both disabled while we
  // wait for LUX to deliver Connected App credentials; the backend reports
  // configured:false until SALESFORCE_* env vars are set.
  const [sfOppId, setSfOppId] = useState<string>(salesforceOpportunityId ?? '');
  const [sfConfigured, setSfConfigured] = useState<boolean | null>(null);
  const [sfImporting, setSfImporting] = useState(false);
  const [sfMessage, setSfMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const [hotelIntro, setHotelIntro] = useState<string>(customFields[HOTEL_INTRO_FIELD] ?? '');
  const [introSavedAt, setIntroSavedAt] = useState<number | null>(null);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedIntroRef = useRef<string>(customFields[HOTEL_INTRO_FIELD] ?? '');

  useEffect(() => {
    const incoming = customFields[HOTEL_INTRO_FIELD] ?? '';
    if (incoming !== lastSavedIntroRef.current) {
      setHotelIntro(incoming);
      lastSavedIntroRef.current = incoming;
    }
  }, [customFields]);

  const destination = properties[0]?.destination ?? '';
  const resolvedDefault = substitutePlaceholders(
    templateDefaults[HOTEL_INTRO_FIELD] ?? '',
    { destination, hotelName: properties[0]?.propertyName ?? '' },
  );
  const introLimit = resolvedDefault.length > 0 ? resolvedDefault.length : HOTEL_INTRO_FALLBACK_LIMIT;
  const introCount = hotelIntro.length;
  const introOverLimit = introCount > introLimit;

  function commitIntro(value: string) {
    if (value === lastSavedIntroRef.current) return;
    const next: Record<string, string> = { ...customFields };
    if (value.trim() === '') {
      delete next[HOTEL_INTRO_FIELD];
    } else {
      next[HOTEL_INTRO_FIELD] = value;
    }
    lastSavedIntroRef.current = value;
    updateDeck(deckId, { customFields: next })
      .then(() => {
        setIntroSavedAt(Date.now());
        onDeckChange().catch(() => {});
      })
      .catch(() => setError('Failed to save hotel introduction'));
  }

  function handleIntroChange(value: string) {
    setHotelIntro(value);
    setIntroSavedAt(null);
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    introTimerRef.current = setTimeout(() => commitIntro(value), HOTEL_INTRO_DEBOUNCE_MS);
  }

  function handleIntroBlur() {
    if (introTimerRef.current) {
      clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
    commitIntro(hotelIntro);
  }

  useEffect(() => () => {
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
  }, []);

  useEffect(() => {
    getDestinations()
      .then((opts) => {
        const labels = opts.map(formatDestinationLabel).sort((a, b) => a.localeCompare(b));
        setDestinationOptions(labels);
      })
      .catch(() => {
        // Silently fail — user can still type manually
      })
      .finally(() => {
        setDestinationsLoaded(true);
      });
  }, []);

  useEffect(() => {
    getSalesforceStatus()
      .then((s) => setSfConfigured(s.configured))
      .catch(() => setSfConfigured(false));
  }, []);

  // Keep the input in sync if the deck reloads with a different stored id.
  useEffect(() => {
    setSfOppId(salesforceOpportunityId ?? '');
  }, [salesforceOpportunityId]);

  async function handleSalesforceImport() {
    const id = sfOppId.trim();
    if (!id) return;
    setSfImporting(true);
    setSfMessage(null);
    try {
      const opp: OpportunitySummary = await fetchSalesforceOpportunity(id);
      // Persist the opp id + any intro text on the deck, then either update
      // the existing single property or create one from the SF data.
      const nextCustomFields: Record<string, string> = { ...customFields };
      if (opp.hotelIntroduction) nextCustomFields[HOTEL_INTRO_FIELD] = opp.hotelIntroduction;
      await updateDeck(deckId, {
        salesforceOpportunityId: id,
        customFields: nextCustomFields,
      });
      const existing = properties[0];
      let targetPropertyId: string | null = null;
      if (existing) {
        await updateProperty(deckId, existing.id, {
          propertyName: opp.hotelName ?? existing.propertyName,
          destination: opp.destination ?? existing.destination ?? null,
        });
        targetPropertyId = existing.id;
      } else if (opp.hotelName) {
        const created = await createProperty(deckId, {
          propertyName: opp.hotelName,
          destination: opp.destination ?? undefined,
          isCustomDestination: false,
          sortOrder: 0,
        });
        targetPropertyId = created.id;
      }
      await onPropertiesChange();
      await onDeckChange();
      // Salesforce's Destination__c is free text — it might match a deal-tiers
      // destination exactly, but often doesn't (e.g. "Bali" vs "Bali, Indonesia").
      // Open the edit form pre-filled so the PCM is nudged to pick a real entry
      // from the dropdown rather than silently accepting custom text, which
      // would later miss deal-tier rules + reach stats keyed by destination.
      if (targetPropertyId) {
        setForm({
          propertyName: opp.hotelName ?? '',
          destination: opp.destination ?? '',
          isCustomDestination: true,
        });
        setEditingId(targetPropertyId);
        setShowForm(true);
      }
      setSfMessage({
        kind: 'info',
        text: `Imported from "${opp.opportunityName ?? id}". Confirm the destination matches an option in the dropdown so deal-tier rules apply.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch Salesforce opportunity';
      setSfMessage({ kind: 'error', text: msg });
    } finally {
      setSfImporting(false);
    }
  }

  function openAdd() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(prop: DeckProperty) {
    setForm({
      propertyName: prop.propertyName,
      destination: prop.destination ?? '',
      isCustomDestination: prop.isCustomDestination ?? false,
    });
    setEditingId(prop.id);
    setShowForm(true);
  }

  function handleDestinationChange(selection: DestinationSelection) {
    setForm((prev) => ({
      ...prev,
      destination: selection.label,
      isCustomDestination: selection.isCustom,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateProperty(deckId, editingId, {
          propertyName: form.propertyName,
          destination: form.destination || null,
          isCustomDestination: form.isCustomDestination,
        });
      } else {
        await createProperty(deckId, {
          propertyName: form.propertyName,
          destination: form.destination || undefined,
          isCustomDestination: form.isCustomDestination,
          sortOrder: properties.length,
        });
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await onPropertiesChange();
    } catch {
      setError('Failed to save property');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(propertyId: string) {
    try {
      await deleteProperty(deckId, propertyId);
      await onPropertiesChange();
    } catch {
      setError('Failed to delete property');
    }
  }

  const canProceed = properties.length > 0;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Hotel & Destination</h2>
      <p className="text-sm text-gray-500 mb-6">Add the hotel this deck is for.</p>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Salesforce import — disabled until the API reports configured:true. */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-800">Salesforce Opportunity ID</label>
          {sfConfigured === false && (
            <span className="text-[10px] uppercase tracking-wide text-gray-500">
              Coming soon — awaiting credentials
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Pre-fills hotel, destination, and Hotel Introduction from the linked opportunity in Salesforce.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={sfOppId}
            onChange={(e) => setSfOppId(e.target.value)}
            placeholder="e.g. 006XX000003DH8YYAW"
            disabled={!sfConfigured || sfImporting}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#01B18B]/30 disabled:bg-gray-50 disabled:cursor-not-allowed"
            title={sfConfigured === false ? 'Salesforce integration not yet configured — waiting on credentials from LUX' : ''}
          />
          <button
            type="button"
            onClick={handleSalesforceImport}
            disabled={!sfConfigured || sfImporting || !sfOppId.trim()}
            className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50 disabled:cursor-not-allowed"
            title={sfConfigured === false ? 'Salesforce integration not yet configured — waiting on credentials from LUX' : ''}
          >
            {sfImporting ? 'Importing…' : 'Import'}
          </button>
        </div>
        {sfMessage && (
          <div className={`mt-2 text-xs ${sfMessage.kind === 'error' ? 'text-red-600' : 'text-[#009977]'}`}>
            {sfMessage.text}
          </div>
        )}
      </div>

      {destinationsLoaded && destinationOptions.length === 0 && <DealTiersMissingBanner />}

      {properties.length > 0 && (
        <div className="mb-6 space-y-3">
          {properties.map((prop) => (
            <div key={prop.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div>
                <div className="font-medium text-gray-900">{prop.propertyName}</div>
                {prop.destination && (
                  <div className="text-sm text-gray-500">
                    {prop.destination}
                    {prop.isCustomDestination && (
                      <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Custom</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(prop)} className="text-[#01B18B] hover:underline text-xs">Edit</button>
                <button onClick={() => handleDelete(prop.id)} className="text-red-600 hover:underline text-xs">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-gray-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {editingId ? 'Edit Property' : 'Add Property'}
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hotel / Property Name</label>
            <input
              type="text"
              required
              value={form.propertyName}
              onChange={(e) => setForm({ ...form, propertyName: e.target.value })}
              placeholder="e.g. InterContinental Sanctuary Cove"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Destination</label>
            <DestinationCombobox
              options={destinationOptions}
              value={form.destination}
              onChange={handleDestinationChange}
              placeholder="Search or type a destination..."
            />
            {form.isCustomDestination && form.destination && (
              <p className="mt-1 text-xs text-amber-600">
                This destination is not in the Deal Tiers list and will be flagged for admin review.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Save' : 'Add Property'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : properties.length === 0 ? (
        // Single-hotel decks for now: only offer "add" until the first property
        // exists. Edit/Remove on the property above still allow changing it, and
        // the multi-property data model is left intact in case this is revisited.
        <button
          onClick={openAdd}
          className="mb-6 rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700"
        >
          + Add hotel
        </button>
      ) : null}

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
        <label className="block text-sm font-medium text-gray-700">
          Hotel Introduction
          <span className="ml-2 text-xs font-normal text-gray-500">
            shown on slide 2 — leave blank to use the template default
          </span>
        </label>
        <textarea
          rows={4}
          value={hotelIntro}
          onChange={(e) => handleIntroChange(e.target.value)}
          onBlur={handleIntroBlur}
          placeholder={resolvedDefault || 'Enter a short headline for slide 2…'}
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
        />
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className={introOverLimit ? 'text-red-600' : 'text-gray-500'}>
            {introCount}/{introLimit}
          </span>
          {introSavedAt && (
            <span className="text-[#01B18B]">Saved</span>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="rounded-md bg-[#01B18B] px-6 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
        >
          Next: Pricing Tool
        </button>
      </div>
    </div>
  );
}
