import { useState, type FormEvent } from 'react';
import {
  createProperty,
  updateProperty,
  deleteProperty,
  type DeckProperty,
} from '@/api/decks.api';

interface Step1Props {
  deckId: string;
  properties: DeckProperty[];
  onPropertiesChange: () => Promise<void>;
  onNext: () => void;
}

interface PropertyForm {
  propertyName: string;
  destination: string;
}

const emptyForm: PropertyForm = { propertyName: '', destination: '' };

export function Step1Hotels({ deckId, properties, onPropertiesChange, onNext }: Step1Props) {
  const [showForm, setShowForm] = useState(properties.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyForm>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(prop: DeckProperty) {
    setForm({
      propertyName: prop.propertyName,
      destination: prop.destination ?? '',
    });
    setEditingId(prop.id);
    setShowForm(true);
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
        });
      } else {
        await createProperty(deckId, {
          propertyName: form.propertyName,
          destination: form.destination || undefined,
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
                  <div className="text-sm text-gray-500">{prop.destination}</div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(prop)} className="text-blue-600 hover:underline text-xs">Edit</button>
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Destination</label>
            <input
              type="text"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              placeholder="e.g. Gold Coast, Australia"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
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
          className="rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Next: Pricing Tool
        </button>
      </div>
    </div>
  );
}
