import { useState, useRef, type ChangeEvent } from 'react';
import { parsePricingTool, type ParsedPricingTool } from '@/api/parser.api';
import { type DeckPropertyFull, type FullDeck, type SetOptionRequest, type TacticalDetails, setPropertyOptions, updateProperty, updateOption } from '@/api/decks.api';
import { TacticalPackagesSection } from './TacticalPackagesSection';
import { CampaignDatesEditor } from './CampaignDatesEditor';
import { formatMoney } from '@/components/preview/currency';

interface Step2Props {
  deckId: string;
  deck: FullDeck;
  properties: DeckPropertyFull[];
  onDeckChange: () => void;
  onBack: () => void;
  onNext: () => void;
}

function isTacticalTemplate(deck: FullDeck): boolean {
  return (deck.slideOrder ?? []).some((s) => s.type.startsWith('tactical-'));
}

interface PropertyParseState {
  loading: boolean;
  error: string;
  result: ParsedPricingTool | null;
  hasSavedOptions?: boolean;
  pricingToolFile?: string | null;
}

export function Step2Pricing({ deckId, deck, properties, onDeckChange, onBack, onNext }: Step2Props) {
  // Pre-populate parse states from existing saved options
  const [parseStates, setParseStates] = useState<Record<string, PropertyParseState>>(() => {
    const init: Record<string, PropertyParseState> = {};
    for (const p of properties) {
      if (p.options.length > 0 || p.pricingToolFile) {
        init[p.id] = {
          loading: false,
          error: '',
          result: null,
          hasSavedOptions: p.options.length > 0,
          pricingToolFile: p.pricingToolFile ?? null,
        };
      }
    }
    return init;
  });
  const [expandedProperty, setExpandedProperty] = useState<string | null>(
    properties.length === 1 ? properties[0].id : null,
  );
  const [versionWarnings, setVersionWarnings] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function setVersionWarning(propertyId: string) {
    setVersionWarnings((prev) => new Set(prev).add(propertyId));
  }

  function dismissVersionWarning(propertyId: string) {
    setVersionWarnings((prev) => {
      const next = new Set(prev);
      next.delete(propertyId);
      return next;
    });
  }

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
          // Seasonal rows. Some carry an explicit supplement (v5 "Period" block);
          // others are High/Shoulder month ranges whose per-night amount lives in
          // the day-of-week rows below — those keep a null amount so the deck
          // shows the months as context rather than a misleading "£0.00".
          ...result.surcharges.seasonal
            .filter((s) => s.optionNumber === opt.optionNumber)
            .map((s) => ({ name: s.dates, amount: s.supplement, period: s.period })),
          // Day-of-week surcharges carry up to three seasonal values
          // (all-year / high / shoulder). Emit a labelled entry per non-zero
          // value, named by the day, so the deck shows e.g. "Saturday – £35"
          // and "Saturday (high season) – £50" rather than a single generic
          // "Day of week – £0.00" that drops high/shoulder.
          ...result.surcharges.dayOfWeek
            .filter((s) => s.optionNumber === opt.optionNumber)
            .flatMap((s) => {
              const entries: { name: string; amount: number; period: string }[] = [];
              if (s.allYear) entries.push({ name: s.day, amount: s.allYear, period: s.day });
              if (s.high) entries.push({ name: s.day, amount: s.high, period: `${s.day} (high season)` });
              if (s.shoulder) entries.push({ name: s.day, amount: s.shoulder, period: `${s.day} (shoulder)` });
              return entries;
            }),
        ];

        // Per-option inclusions (parsed from each option's block in the Hotel
        // Proposal sheet). Falls back to the flat "Inclusions Import" list
        // if a particular option's block is empty — mostly a safety net for
        // older sheets where the per-option block isn't filled in.
        const fallbackInclusionNames = result.inclusions.map((inc) => inc.assetName);
        const optInclusions = opt.inclusions.length > 0 ? opt.inclusions : fallbackInclusionNames;

        // Tactical details (room-night forecast + extra guest policy) parsed
        // from the Prices-Forecasting sheet. Extra guest surcharge carries both
        // net and sell; the deck-wide basis toggle picks which to display.
        const guest = opt.extraGuestSurcharge;
        const tacticalDetails: TacticalDetails = {};
        if (opt.roomNightForecast != null) tacticalDetails.roomNightForecast = opt.roomNightForecast;
        // Per-option travel dates from this option's sheet. Older tools (v4.0/
        // v3.4) don't have per-option Prices-Forecasting sheets, so fall back to
        // the deck-level travel range so the campaign-dates editor pre-fills
        // instead of showing an empty range. Campaign dates have no source in the
        // tool — entered manually per option.
        const travelStart = opt.travelFrom ?? result.metadata.travelFrom;
        const travelEnd = opt.travelTo ?? result.metadata.travelTo;
        if (travelStart) tacticalDetails.travelStart = travelStart;
        if (travelEnd) tacticalDetails.travelEnd = travelEnd;
        if (guest) {
          tacticalDetails.extraGuestPolicy = [
            { guest: 'Adult', age: '12+', inclusions: 'Breakfast', feePerNight: null, feeLabel: null, feePerNightNet: guest.adult.net, feePerNightSell: guest.adult.sell },
            { guest: 'Child', age: '4 – 11', inclusions: 'Breakfast', feePerNight: null, feeLabel: null, feePerNightNet: guest.child.net, feePerNightSell: guest.child.sell },
            { guest: 'Infant', age: '0 – 3', inclusions: 'Room Only', feePerNight: null, feeLabel: 'Free of Charge', feePerNightNet: null, feePerNightSell: null },
          ];
        }
        const hasTactical = Object.keys(tacticalDetails).length > 0;

        // The tactical-package "rooms" table is per-option, not per-deal-row,
        // so it rides on the first row for this option. Slides + the wizard
        // editor read it off the first matching optionNumber row.
        for (let di = 0; di < opt.dealOptions.length; di++) {
          const deal = opt.dealOptions[di];
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
            inclusions: optInclusions.length > 0 ? optInclusions : null,
            marketingAssets: null,
            rooms: di === 0 && opt.rooms.length > 0 ? opt.rooms : null,
            tacticalDetails: di === 0 && hasTactical ? tacticalDetails : null,
          });
        }
      }

      await setPropertyOptions(deckId, propertyId, options);

      // Persist original file URL + grade/tier
      const firstOpt = result.options[0];
      const propertyUpdates: Parameters<typeof updateProperty>[2] = {
        pricingToolFile: result.originalFile.url,
      };
      if (firstOpt?.tier != null) propertyUpdates.tier = firstOpt.tier;
      if (result.metadata.grade) propertyUpdates.grade = result.metadata.grade;
      if (result.metadata.currency) propertyUpdates.currency = result.metadata.currency;
      await updateProperty(deckId, propertyId, propertyUpdates);

      setParseStates((prev) => ({
        ...prev,
        [propertyId]: {
          loading: false,
          error: '',
          result,
          hasSavedOptions: true,
          pricingToolFile: result.originalFile.url,
        },
      }));
      setExpandedProperty(propertyId);

      if (!result.version.startsWith('5.1')) {
        setVersionWarning(propertyId);
      }

      // Refresh the parent deck so prop.options reflects what was just saved.
      // Without this, the tactical section sees zero options and SavedOptionsView
      // can't render its checkboxes against the persisted rows.
      onDeckChange();
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
  // While any pricing tool is parsing+saving we lock down the rest of the page.
  // Without this a PCM can tick/untick rows or edit tactical data on cards that
  // are about to be replaced by setPropertyOptions when the upload completes.
  const anyLoading = Object.values(parseStates).some((s) => s?.loading);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Pricing Tool Upload</h2>
      <p className="text-sm text-gray-500 mb-6">Upload a pricing tool for each property.</p>

      <fieldset
        disabled={anyLoading}
        className={anyLoading ? 'opacity-60 cursor-progress' : undefined}
        aria-busy={anyLoading || undefined}
      >
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
                  <div className="mb-4 flex items-center gap-4 flex-wrap">
                    <input
                      ref={(el) => { fileInputRefs.current[prop.id] = el; }}
                      type="file"
                      accept=".xlsx,.xlsm,.xls"
                      onChange={(e) => handleFileChange(prop.id, e)}
                      className="block text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-[#01B18B] file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-[#009977]"
                    />
                    {state?.pricingToolFile && (
                      <a
                        href={state.pricingToolFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-[#01B18B] hover:text-[#009977] underline"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download original
                      </a>
                    )}
                  </div>

                  {versionWarnings.has(prop.id) && state?.result && !state.result.version.startsWith('5.1') && (
                    <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          Pricing Tool v{state.result.version} detected
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          This tool is not version 5.1. Some features (e.g. tier detection, asset entitlements) may not work correctly. We recommend using a v5.1 pricing tool for full functionality.
                        </p>
                      </div>
                      <button
                        onClick={() => dismissVersionWarning(prop.id)}
                        className="shrink-0 text-amber-600 hover:text-amber-800 text-sm"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {state?.loading && <div className="text-sm text-gray-500">Parsing...</div>}
                  {state?.error && <div className="text-sm text-red-600">{state.error}</div>}

                  {state?.result && <ParseSummary result={state.result} />}

                  {prop.options.length > 0 && (
                    <SavedOptionsView
                      deckId={deckId}
                      options={prop.options}
                      currency={state?.result?.metadata.currency ?? prop.currency}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CampaignDatesEditor deck={deck} properties={properties} onDeckChange={onDeckChange} />

      {isTacticalTemplate(deck) && (
        <TacticalPackagesSection
          deck={deck}
          properties={properties}
          onDeckChange={onDeckChange}
        />
      )}

      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 px-6 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!allParsed}
          className="rounded-md bg-[#01B18B] px-6 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
          title={allParsed ? '' : 'Upload a pricing tool for each property'}
        >
          Next: Images
        </button>
      </div>
      </fieldset>
    </div>
  );
}

function ParseSummary({ result }: { result: ParsedPricingTool }) {
  return (
    <div className="space-y-3 mb-4">
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <ul className="list-disc list-inside text-xs text-amber-700">
            {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-4 gap-3 text-sm rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
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

      {/* Inclusion library — flat list from "Inclusions Import" sheet, kept
          as a reference (it carries RRP). Per-option inclusions live inside
          SavedOptionsView below. */}
      {result.inclusions.length > 0 && (
        <details className="rounded-md border border-gray-200 px-3 py-2">
          <summary className="text-xs font-semibold text-gray-700 cursor-pointer">
            Inclusion library
            <span className="ml-2 font-normal text-gray-500">({result.inclusions.length} items — reference only)</span>
          </summary>
          <ul className="text-xs text-gray-600 space-y-0.5 mt-2">
            {result.inclusions.map((inc, i) => (
              <li key={i}>
                {inc.assetName}
                {inc.rrp != null && <span className="text-gray-400 ml-1">(RRP ${inc.rrp})</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function SavedOptionsView({ deckId, options, currency }: { deckId: string; options: import('@/api/decks.api').DeckOption[]; currency?: string | null }) {
  // Cost (net rate) is in the property's local currency; Sell is always AUD
  // (the pricing tool enters sell in AUD), so the two columns can differ.
  const costCode = (currency ?? 'AUD').toUpperCase();
  // Local mirror of each row's `selected` flag, keyed by option id. We optimistically
  // flip this on click and revert if the server rejects — keeps the checkbox snappy
  // without waiting for a round-trip.
  const [selectedById, setSelectedById] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const o of options) init[o.id] = o.selected;
    return init;
  });

  async function toggleRow(id: string, next: boolean) {
    const prev = selectedById[id];
    setSelectedById((s) => ({ ...s, [id]: next }));
    try {
      await updateOption(deckId, id, { selected: next });
    } catch {
      setSelectedById((s) => ({ ...s, [id]: prev }));
    }
  }

  async function toggleAllForOption(ids: string[], next: boolean) {
    const prev = { ...selectedById };
    setSelectedById((s) => {
      const out = { ...s };
      for (const id of ids) out[id] = next;
      return out;
    });
    try {
      await Promise.all(ids.map((id) => updateOption(deckId, id, { selected: next })));
    } catch {
      setSelectedById(prev);
    }
  }

  const grouped = new Map<number, typeof options>();
  for (const opt of options) {
    const group = grouped.get(opt.optionNumber) ?? [];
    group.push(opt);
    grouped.set(opt.optionNumber, group);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-green-50 border border-green-200 p-3 text-xs text-green-700">
        Pricing data saved from a previous upload. Untick rows to exclude them from the slide; upload a new file to replace the data.
      </div>

      {Array.from(grouped.entries()).map(([optNum, opts]) => {
        const ids = opts.map((o) => o.id);
        const selectedCount = ids.filter((id) => selectedById[id]).length;
        const allSelected = selectedCount === ids.length;
        const noneSelected = selectedCount === 0;

        return (
          <div key={optNum}>
            <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = !allSelected && !noneSelected; }}
                  onChange={(e) => toggleAllForOption(ids, e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#01B18B]"
                />
                <span>Option {optNum} — {opts[0].tierLabel ?? ''}</span>
              </label>
              <span className="font-normal text-gray-500">
                {selectedCount} of {opts.length} room types selected
              </span>
            </h4>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-1 pr-2 w-6"></th>
                  <th className="pb-1 pr-2">Room Type</th>
                  <th className="pb-1 pr-2">Nights</th>
                  <th className="pb-1 pr-2 text-right">Sell (AUD)</th>
                  <th className="pb-1 pr-2 text-right">Cost{costCode !== 'AUD' ? ` (${costCode})` : ''}</th>
                  <th className="pb-1 text-right">Alloc</th>
                </tr>
              </thead>
              <tbody>
                {opts.map((d) => {
                  const isSelected = selectedById[d.id] ?? true;
                  return (
                    <tr key={d.id} className={`border-b border-gray-50 ${isSelected ? '' : 'text-gray-400'}`}>
                      <td className="py-1 pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleRow(d.id, e.target.checked)}
                          className="h-3.5 w-3.5 accent-[#01B18B] cursor-pointer"
                        />
                      </td>
                      <td className="py-1 pr-2">{d.roomType ?? '-'}</td>
                      <td className="py-1 pr-2">{d.nights ?? '-'}</td>
                      <td className="py-1 pr-2 text-right font-mono">{d.sellPrice ? `$${Number(d.sellPrice).toLocaleString()}` : '-'}</td>
                      <td className="py-1 pr-2 text-right font-mono">{formatMoney(d.costPrice, currency) ?? '-'}</td>
                      <td className="py-1 text-right">{d.allocation ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {opts[0].inclusions && opts[0].inclusions.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-gray-500">Inclusions: </span>
                <span className="text-xs text-gray-600">{opts[0].inclusions.join(', ')}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
