import { useState, useEffect } from 'react';
import { lookupDealTier, type LookupResult } from '@/api/deal-tiers.api';
import { type DeckPropertyFull, updateProperty, updateOption } from '@/api/decks.api';
import { useNavigate } from 'react-router-dom';

interface Step6Props {
  deckId: string;
  properties: DeckPropertyFull[];
  onBack: () => void;
}

export function Step6Assets({ deckId, properties, onBack }: Step6Props) {
  const navigate = useNavigate();
  const [lookups, setLookups] = useState<Record<string, LookupResult | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Track toggled assets per property: { propertyId: { "channel name": boolean } }
  const [assetToggles, setAssetToggles] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    async function load() {
      const results: Record<string, LookupResult | null> = {};
      const toggles: Record<string, Record<string, boolean>> = {};

      for (const prop of properties) {
        // Check if property already has saved marketing assets on its options
        const existingAssets = prop.options[0]?.marketingAssets;
        if (existingAssets && Object.keys(existingAssets).length > 0) {
          toggles[prop.id] = { ...existingAssets };
        }

        if (!prop.destination) {
          results[prop.id] = null;
          continue;
        }

        const parts = [prop.destination, ...prop.destination.split(/[,\-–]/).map((s) => s.trim()).filter(Boolean)];
        let found = false;
        for (const part of parts) {
          try {
            const lookup = await lookupDealTier(part, undefined, 0);
            results[prop.id] = lookup;
            found = true;

            // Persist grade and tier
            await updateProperty(deckId, prop.id, {
              grade: lookup.grade,
              tier: lookup.tier,
            }).catch(() => {});

            // Merge lookup channels with any existing saved state
            // Saved state takes precedence; new channels from lookup default to true
            const existing = toggles[prop.id] ?? {};
            const merged: Record<string, boolean> = {};
            for (const channel of Object.keys(lookup.assetEntitlements)) {
              merged[channel] = existing[channel] ?? true;
            }
            toggles[prop.id] = merged;

            break;
          } catch {
            // try next part
          }
        }
        if (!found) results[prop.id] = null;
      }

      setLookups(results);
      setAssetToggles(toggles);
      setLoading(false);
    }
    load();
  }, [properties, deckId]);

  function toggleAsset(propertyId: string, channel: string) {
    setAssetToggles((prev) => ({
      ...prev,
      [propertyId]: {
        ...(prev[propertyId] ?? {}),
        [channel]: !(prev[propertyId]?.[channel] ?? true),
      },
    }));
  }

  async function handleSaveAndPreview() {
    setSaving(true);
    setError('');
    try {
      // Save marketing assets onto options for each property
      for (const prop of properties) {
        const toggles = assetToggles[prop.id];
        if (!toggles || prop.options.length === 0) continue;

        // Save all channels with their toggle state
        const assets: Record<string, boolean> = { ...toggles };

        for (const opt of prop.options) {
          await updateOption(deckId, opt.id, { marketingAssets: assets });
        }
      }
      navigate(`/decks/${deckId}/preview`);
    } catch {
      setError('Failed to save marketing assets');
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 text-gray-500">Loading asset recommendations...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Marketing Assets</h2>
      <p className="text-sm text-gray-500 mb-6">
        Auto-recommended based on deal tier rules. Toggle channels on/off per property.
      </p>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-6 mb-6">
        {properties.map((prop) => {
          const lookup = lookups[prop.id];
          const toggles = assetToggles[prop.id] ?? {};

          return (
            <div key={prop.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{prop.propertyName}</h3>
              {prop.destination && (
                <p className="text-sm text-gray-500 mb-3">{prop.destination}</p>
              )}

              {!lookup ? (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                  No deal tier match found for this destination.
                </div>
              ) : (
                <>
                  <div className="flex gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-500">Grade:</span>{' '}
                      <span className="font-medium">{lookup.grade}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tier:</span>{' '}
                      <span className="font-medium">{lookup.tier}</span>
                    </div>
                  </div>

                  {Object.keys(lookup.assetEntitlements).length > 0 ? (
                    <div className="space-y-1.5">
                      {Object.entries(lookup.assetEntitlements).map(([channel, value]) => {
                        const enabled = toggles[channel] ?? true;
                        return (
                          <label
                            key={channel}
                            className={`flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer text-sm ${
                              enabled ? 'border-[#01B18B]/30 bg-[#E6F9F5]' : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => toggleAsset(prop.id, channel)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-800">{channel}</div>
                              <div className="text-xs text-gray-500">{value}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No asset entitlements for this tier</p>
                  )}

                  {prop.options.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      No campaign options saved yet — upload a pricing tool in Step 2 first.
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 px-6 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleSaveAndPreview}
          disabled={saving}
          className="rounded-md bg-green-600 px-6 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Preview Deck'}
        </button>
      </div>
    </div>
  );
}
