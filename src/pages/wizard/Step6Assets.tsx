import { useState, useEffect } from 'react';
import { lookupDealTier, type LookupResult } from '@/api/deal-tiers.api';
import { type DeckProperty } from '@/api/decks.api';
import { useNavigate } from 'react-router-dom';

interface Step6Props {
  deckId: string;
  properties: DeckProperty[];
  onBack: () => void;
}

export function Step6Assets({ deckId, properties, onBack }: Step6Props) {
  const navigate = useNavigate();
  const [lookups, setLookups] = useState<Record<string, LookupResult | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const results: Record<string, LookupResult | null> = {};

      for (const prop of properties) {
        if (!prop.destination) {
          results[prop.id] = null;
          continue;
        }

        // Try the full destination, then individual parts (e.g. "Gold Coast, Australia" → "Gold Coast" → "Australia")
        const parts = [prop.destination, ...prop.destination.split(/[,\-–]/).map((s) => s.trim()).filter(Boolean)];
        let found = false;
        for (const part of parts) {
          try {
            results[prop.id] = await lookupDealTier(part, undefined, 0);
            found = true;
            break;
          } catch {
            // try next part
          }
        }
        if (!found) results[prop.id] = null;
      }

      setLookups(results);
      setLoading(false);
    }
    load();
  }, [properties]);

  if (loading) return <div className="p-4 text-gray-500">Loading asset recommendations...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Marketing Assets</h2>
      <p className="text-sm text-gray-500 mb-6">
        Auto-recommended marketing assets based on deal tier rules. These can be overridden per property.
      </p>


      <div className="space-y-6 mb-6">
        {properties.map((prop) => {
          const lookup = lookups[prop.id];

          return (
            <div key={prop.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{prop.propertyName}</h3>
              {prop.destination && (
                <p className="text-sm text-gray-500 mb-3">{prop.destination}</p>
              )}

              {!lookup ? (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                  No deal tier match found for this destination. Set the destination in Step 1 to enable asset recommendations.
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
                    <div className="rounded-md border border-gray-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-3 py-1.5 font-medium">Marketing Channel</th>
                            <th className="px-3 py-1.5 font-medium">Entitlement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(lookup.assetEntitlements).map(([channel, value]) => (
                            <tr key={channel} className="border-t border-gray-100">
                              <td className="px-3 py-1.5 font-medium text-gray-700">{channel}</td>
                              <td className="px-3 py-1.5 text-gray-600">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No asset entitlements for this tier</p>
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
          onClick={() => navigate(`/decks/${deckId}/preview`)}
          className="rounded-md bg-green-600 px-6 py-2 text-sm text-white hover:bg-green-700"
        >
          Preview Deck
        </button>
      </div>
    </div>
  );
}
