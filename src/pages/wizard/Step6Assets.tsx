import { useState, useEffect, useRef, useCallback } from 'react';
import { lookupDealTier, type LookupResult } from '@/api/deal-tiers.api';
import { getFullDeck, type DeckPropertyFull, type DeckOption, updateProperty, updateOption } from '@/api/decks.api';
import { useNavigate } from 'react-router-dom';

interface Step6Props {
  deckId: string;
  properties: DeckPropertyFull[];
  onBack: () => void;
}

/** Group options by optionNumber, picking a representative for display */
interface OptionGroup {
  optionNumber: number;
  tierLabel: string | null;
  options: DeckOption[]; // all room-type rows sharing this optionNumber
}

function groupOptionsByNumber(options: DeckOption[]): OptionGroup[] {
  const map = new Map<number, DeckOption[]>();
  for (const opt of options) {
    const group = map.get(opt.optionNumber) ?? [];
    group.push(opt);
    map.set(opt.optionNumber, group);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([optionNumber, opts]) => ({
      optionNumber,
      tierLabel: opts[0]?.tierLabel ?? null,
      options: opts,
    }));
}

export function Step6Assets({ deckId, properties, onBack }: Step6Props) {
  const navigate = useNavigate();
  const [localProperties, setLocalProperties] = useState<DeckPropertyFull[]>(properties);
  const [lookups, setLookups] = useState<Record<string, LookupResult | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Track toggled assets per option group (keyed by "propertyId-optionNumber"):
  // { "propId-1": { "channel name": boolean } }
  const [groupToggles, setGroupToggles] = useState<Record<string, Record<string, boolean>>>({});
  const propertiesRef = useRef(localProperties);
  propertiesRef.current = localProperties;

  const groupKey = (propId: string, optNum: number) => `${propId}-${optNum}`;

  // Persist marketing assets for all options in a group
  const saveGroupAssets = useCallback(async (propId: string, optNum: number, assets: Record<string, boolean>) => {
    const prop = propertiesRef.current.find((p) => p.id === propId);
    if (!prop) return;
    const opts = prop.options.filter((o) => o.optionNumber === optNum);
    await Promise.all(opts.map((o) => updateOption(deckId, o.id, { marketingAssets: assets })));
  }, [deckId]);

  useEffect(() => {
    async function load() {
      // Fetch fresh deck data to get options saved in earlier steps
      const freshDeck = await getFullDeck(deckId);
      const freshProperties = freshDeck.properties;
      setLocalProperties(freshProperties);
      propertiesRef.current = freshProperties;

      const results: Record<string, LookupResult | null> = {};
      const toggles: Record<string, Record<string, boolean>> = {};

      for (const prop of freshProperties) {
        // Load existing per-option-group assets (read from first option in each group)
        const groups = groupOptionsByNumber(prop.options);
        for (const group of groups) {
          const representative = group.options[0];
          if (representative?.marketingAssets && Object.keys(representative.marketingAssets).length > 0) {
            toggles[groupKey(prop.id, group.optionNumber)] = { ...representative.marketingAssets };
          }
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

            // Merge lookup channels with any existing saved state per option group
            for (const group of groups) {
              const key = groupKey(prop.id, group.optionNumber);
              const existing = toggles[key] ?? {};
              const merged: Record<string, boolean> = {};
              for (const channel of Object.keys(lookup.assetEntitlements)) {
                merged[channel] = existing[channel] ?? false;
              }
              toggles[key] = merged;
            }

            break;
          } catch {
            // try next part
          }
        }
        if (!found) results[prop.id] = null;
      }

      setLookups(results);
      setGroupToggles(toggles);
      setLoading(false);

      // Persist initial asset state to all options in each group
      for (const prop of freshProperties) {
        const groups = groupOptionsByNumber(prop.options);
        for (const group of groups) {
          const key = groupKey(prop.id, group.optionNumber);
          const assets = toggles[key];
          if (assets) {
            await Promise.all(
              group.options.map((o) => updateOption(deckId, o.id, { marketingAssets: assets }).catch(() => {})),
            );
          }
        }
      }
    }
    load();
  }, [deckId]);

  function toggleAsset(propId: string, optNum: number, channel: string) {
    const key = groupKey(propId, optNum);
    setGroupToggles((prev) => {
      const updated = {
        ...(prev[key] ?? {}),
        [channel]: !(prev[key]?.[channel] ?? false),
      };
      saveGroupAssets(propId, optNum, updated).catch(() => {});
      return { ...prev, [key]: updated };
    });
  }

  function toggleAll(propId: string, optNum: number, channels: string[], value: boolean) {
    const key = groupKey(propId, optNum);
    setGroupToggles((prev) => {
      const updated: Record<string, boolean> = {};
      for (const ch of channels) updated[ch] = value;
      saveGroupAssets(propId, optNum, updated).catch(() => {});
      return { ...prev, [key]: updated };
    });
  }

  async function handleSaveAndPreview() {
    setSaving(true);
    setError('');
    try {
      for (const prop of propertiesRef.current) {
        const groups = groupOptionsByNumber(prop.options);
        for (const group of groups) {
          const key = groupKey(prop.id, group.optionNumber);
          const assets = groupToggles[key];
          if (assets) {
            await Promise.all(
              group.options.map((o) => updateOption(deckId, o.id, { marketingAssets: assets })),
            );
          }
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
        Select marketing channels for each campaign option. Auto-recommended based on deal tier rules.
      </p>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-6 mb-6">
        {localProperties.map((prop) => {
          const lookup = lookups[prop.id];
          const channels = lookup ? Object.entries(lookup.assetEntitlements) : [];
          const groups = groupOptionsByNumber(prop.options);

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

                  {channels.length > 0 && groups.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 pr-3 font-medium text-gray-600 min-w-[180px]">Channel</th>
                            {groups.map((group) => (
                              <th key={group.optionNumber} className="text-center py-2 px-3 font-medium text-gray-600 min-w-[100px]">
                                <div className="text-xs leading-tight">
                                  <div>Opt {group.optionNumber}</div>
                                  {group.tierLabel && <div className="text-gray-400">{group.tierLabel}</div>}
                                  <div className="text-gray-300">{group.options.length} room {group.options.length === 1 ? 'type' : 'types'}</div>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {channels.map(([channel, description]) => (
                            <tr key={channel} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 pr-3">
                                <div className="font-medium text-gray-800">{channel}</div>
                                <div className="text-xs text-gray-400">{description}</div>
                              </td>
                              {groups.map((group) => {
                                const key = groupKey(prop.id, group.optionNumber);
                                const enabled = groupToggles[key]?.[channel] ?? false;
                                return (
                                  <td key={group.optionNumber} className="text-center py-2 px-3">
                                    <input
                                      type="checkbox"
                                      checked={enabled}
                                      onChange={() => toggleAsset(prop.id, group.optionNumber, channel)}
                                      className="w-4 h-4 accent-[#01B18B] cursor-pointer"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          {/* Select all / none row */}
                          <tr className="border-t border-gray-200">
                            <td className="py-2 pr-3 text-xs text-gray-400">Toggle all</td>
                            {groups.map((group) => {
                              const key = groupKey(prop.id, group.optionNumber);
                              const channelNames = channels.map(([ch]) => ch);
                              const allOn = channelNames.every((ch) => groupToggles[key]?.[ch] !== false);
                              return (
                                <td key={group.optionNumber} className="text-center py-2 px-3">
                                  <button
                                    onClick={() => toggleAll(prop.id, group.optionNumber, channelNames, !allOn)}
                                    className="text-xs text-[#01B18B] hover:underline"
                                  >
                                    {allOn ? 'None' : 'All'}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : channels.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No asset entitlements for this tier</p>
                  ) : (
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
