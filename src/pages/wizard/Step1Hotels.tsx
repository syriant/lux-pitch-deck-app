import { useState, useEffect, type FormEvent } from 'react';
import {
  createProperty,
  updateProperty,
  deleteProperty,
  type DeckProperty,
} from '@/api/decks.api';
import { getDestinations, type DestinationOption } from '@/api/deal-tiers.api';
import { DestinationCombobox, type DestinationSelection } from '@/components/common/DestinationCombobox';

interface Step1Props {
  deckId: string;
  properties: DeckProperty[];
  onPropertiesChange: () => Promise<void>;
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

export function Step1Hotels({ deckId, properties, onPropertiesChange, onNext }: Step1Props) {
  const [showForm, setShowForm] = useState(properties.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyForm>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [destinationOptions, setDestinationOptions] = useState<string[]>([]);

  useEffect(() => {
    getDestinations()
      .then((opts) => {
        const labels = opts.map(formatDestinationLabel).sort((a, b) => a.localeCompare(b));
        setDestinationOptions(labels);
      })
      .catch(() => {
        // Silently fail — user can still type manually
      });
  }, []);

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
      <h2 className="text-xl font-bold text-gray-900 mb-1">Hotels & Destinations</h2>
      <p className="text-sm text-gray-500 mb-6">Add one or more properties to this deck.</p>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

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
      ) : (
        <button
          onClick={openAdd}
          className="mb-6 rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700"
        >
          + Add another property
        </button>
      )}

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
