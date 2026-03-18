import { useState, useRef, type ChangeEvent } from 'react';
import { parsePricingTool, type ParsedPricingTool } from '@/api/parser.api';
import { type DeckPropertyFull, type SetOptionRequest, setPropertyOptions, updateProperty } from '@/api/decks.api';

interface Step2Props {
  deckId: string;
  properties: DeckPropertyFull[];
  onBack: () => void;
  onNext: () => void;
}

interface PropertyParseState {
  loading: boolean;
  error: string;
  result: ParsedPricingTool | null;
  hasSavedOptions?: boolean;
}

export function Step2Pricing({ deckId, properties, onBack, onNext }: Step2Props) {
  // Pre-populate parse states from existing saved options
  const [parseStates, setParseStates] = useState<Record<string, PropertyParseState>>(() => {
    const init: Record<string, PropertyParseState> = {};
    for (const p of properties) {
      if (p.options.length > 0) {
        init[p.id] = { loading: false, error: '', result: null, hasSavedOptions: true };
      }
    }
    return init;
  });
  const [expandedProperty, setExpandedProperty] = useState<string | null>(
    properties.length === 1 ? properties[0].id : null,
  );
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFileChange(propertyId: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseStates((prev) => ({
      ...prev,
      [propertyId]: { loading: true, error: '', result: null },
    }));

    try {
      const result = await parsePricingTool(file);

      // Save parsed options to database
      const options: SetOptionRequest[] = [];
      for (const opt of result.options) {
        const optSurcharges = [
          ...result.surcharges.seasonal
            .filter((s) => s.optionNumber === opt.optionNumber)
            .map((s) => ({ name: s.dates, amount: s.supplement ?? 0, period: s.period })),
          ...result.surcharges.dayOfWeek
            .filter((s) => s.optionNumber === opt.optionNumber)
            .map((s) => ({ name: s.day, amount: s.allYear, period: 'Day of week' })),
        ];

        const inclusionNames = result.inclusions.map((inc) => inc.assetName);

        for (const deal of opt.dealOptions) {
          options.push({
            optionNumber: opt.optionNumber,
            tierLabel: opt.tierLabel,
            roomType: deal.roomType,
            sellPrice: deal.sellPrice?.toString() ?? null,
            costPrice: deal.costPrice?.toString() ?? null,
            nights: deal.nights,
            allocation: deal.allocationPerDay,
            surcharges: optSurcharges.length > 0 ? optSurcharges : null,
            blackoutDates: result.blackoutDates.length > 0
              ? result.blackoutDates.map((d) => ({ from: d, to: d }))
              : null,
            inclusions: inclusionNames.length > 0 ? inclusionNames : null,
            marketingAssets: null,
          });
        }
      }

      await setPropertyOptions(deckId, propertyId, options);

      // Update property grade/tier if parser extracted them
      const firstOpt = result.options[0];
      if (firstOpt?.tier != null || result.metadata.grade) {
        await updateProperty(deckId, propertyId, {
          grade: result.metadata.grade ?? undefined,
          tier: firstOpt?.tier ?? undefined,
        });
      }

      setParseStates((prev) => ({
        ...prev,
        [propertyId]: { loading: false, error: '', result },
      }));
      setExpandedProperty(propertyId);
    } catch {
      setParseStates((prev) => ({
        ...prev,
        [propertyId]: { loading: false, error: 'Failed to parse or save pricing data', result: null },
      }));
    }

    const ref = fileInputRefs.current[propertyId];
    if (ref) ref.value = '';
  }

  const allParsed = properties.every((p) => parseStates[p.id]?.result || parseStates[p.id]?.hasSavedOptions);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Pricing Tool Upload</h2>
      <p className="text-sm text-gray-500 mb-6">Upload a pricing tool for each property.</p>

      <div className="space-y-4 mb-6">
        {properties.map((prop) => {
          const state = parseStates[prop.id];
          const isExpanded = expandedProperty === prop.id;

          return (
            <div key={prop.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedProperty(isExpanded ? null : prop.id)}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${(state?.result || state?.hasSavedOptions) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <div className="font-medium text-gray-900">{prop.propertyName}</div>
                    {prop.destination && <div className="text-xs text-gray-500">{prop.destination}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(state?.result || state?.hasSavedOptions) && (
                    <span className="text-xs text-green-600 font-medium">
                      {state?.result ? 'Parsed' : 'Saved'}
                    </span>
                  )}
                  <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4">
                  <div className="mb-4">
                    <input
                      ref={(el) => { fileInputRefs.current[prop.id] = el; }}
                      type="file"
                      accept=".xlsx,.xlsm,.xls"
                      onChange={(e) => handleFileChange(prop.id, e)}
                      className="block text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-blue-700"
                    />
                  </div>

                  {state?.loading && <div className="text-sm text-gray-500">Parsing...</div>}
                  {state?.error && <div className="text-sm text-red-600">{state.error}</div>}

                  {state?.result && <ParsedResult result={state.result} />}

                  {!state?.result && state?.hasSavedOptions && (
                    <SavedOptionsView options={prop.options} />
                  )}
                </div>
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
          onClick={onNext}
          disabled={!allParsed}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          title={allParsed ? '' : 'Upload a pricing tool for each property'}
        >
          Next: Images
        </button>
      </div>
    </div>
  );
}

function ParsedResult({ result }: { result: ParsedPricingTool }) {
  return (
    <div className="space-y-4">
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <ul className="list-disc list-inside text-xs text-amber-700">
            {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs text-gray-500">Version</div>
          <div className="font-medium">{result.version}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Currency</div>
          <div className="font-medium">{result.metadata.currency ?? '-'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Travel From</div>
          <div className="font-medium">{result.metadata.travelFrom ?? '-'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Travel To</div>
          <div className="font-medium">{result.metadata.travelTo ?? '-'}</div>
        </div>
      </div>

      {/* Options summary */}
      {result.options.map((opt) => (
        <div key={opt.optionNumber}>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">
            Option {opt.optionNumber} — {opt.tierLabel}
            <span className="ml-2 font-normal text-gray-500">
              {opt.dealOptions.length} deals
              {opt.grossMargin != null && ` | GM: $${Math.round(opt.grossMargin).toLocaleString()}`}
              {opt.tier != null && ` | Tier ${opt.tier}`}
            </span>
          </h4>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-1 pr-2">Room Type</th>
                <th className="pb-1 pr-2">Nights</th>
                <th className="pb-1 pr-2 text-right">Sell</th>
                <th className="pb-1 pr-2 text-right">Cost</th>
                <th className="pb-1 text-right">Alloc</th>
              </tr>
            </thead>
            <tbody>
              {opt.dealOptions.map((d, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1 pr-2">{d.roomType}</td>
                  <td className="py-1 pr-2">{d.nights}</td>
                  <td className="py-1 pr-2 text-right font-mono">{d.sellPrice ? `$${d.sellPrice}` : '-'}</td>
                  <td className="py-1 pr-2 text-right font-mono">${d.costPrice}</td>
                  <td className="py-1 text-right">{d.allocationPerDay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Inclusions */}
      {result.inclusions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">
            Inclusions ({result.inclusions.length})
          </h4>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {result.inclusions.map((inc, i) => (
              <li key={i}>
                {inc.assetName}
                {inc.rrp != null && <span className="text-gray-400 ml-1">(RRP ${inc.rrp})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SavedOptionsView({ options }: { options: import('@/api/decks.api').DeckOption[] }) {
  const grouped = new Map<number, typeof options>();
  for (const opt of options) {
    const group = grouped.get(opt.optionNumber) ?? [];
    group.push(opt);
    grouped.set(opt.optionNumber, group);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-green-50 border border-green-200 p-3 text-xs text-green-700">
        Pricing data saved from a previous upload. Upload a new file to replace.
      </div>

      {Array.from(grouped.entries()).map(([optNum, opts]) => (
        <div key={optNum}>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">
            Option {optNum} — {opts[0].tierLabel ?? ''}
            <span className="ml-2 font-normal text-gray-500">{opts.length} room types</span>
          </h4>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-1 pr-2">Room Type</th>
                <th className="pb-1 pr-2">Nights</th>
                <th className="pb-1 pr-2 text-right">Sell</th>
                <th className="pb-1 pr-2 text-right">Cost</th>
                <th className="pb-1 text-right">Alloc</th>
              </tr>
            </thead>
            <tbody>
              {opts.map((d) => (
                <tr key={d.id} className="border-b border-gray-50">
                  <td className="py-1 pr-2">{d.roomType ?? '-'}</td>
                  <td className="py-1 pr-2">{d.nights ?? '-'}</td>
                  <td className="py-1 pr-2 text-right font-mono">{d.sellPrice ? `$${Number(d.sellPrice).toLocaleString()}` : '-'}</td>
                  <td className="py-1 pr-2 text-right font-mono">{d.costPrice ? `$${Number(d.costPrice).toLocaleString()}` : '-'}</td>
                  <td className="py-1 text-right">{d.allocation ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {opts[0].inclusions && opts[0].inclusions.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-500">Inclusions: </span>
              <span className="text-xs text-gray-600">{opts[0].inclusions.join(', ')}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
