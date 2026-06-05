import { useEffect, useState } from 'react';
import {
  type FullDeck,
  type DeckPropertyFull,
  type DeckOption,
  type TacticalDetails,
  updateOption,
} from '@/api/decks.api';
import { uniqueOptionsByNumber } from '@/components/preview/slides/tactical-shared';

interface Props {
  deck: FullDeck;
  properties: DeckPropertyFull[];
  onDeckChange: () => void;
}

/**
 * Per-option Campaign period + Travel dates editor. Shown on the pricing step
 * for every template — the campaign-options comparison slide renders these per
 * column and collapses to one value when all options match. Travel dates
 * pre-fill from each option's pricing-tool sheet; campaign dates are manual.
 */
export function CampaignDatesEditor({ deck, properties, onDeckChange }: Props) {
  const withOptions = properties.filter((p) => p.options.length > 0);
  if (withOptions.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white mt-8 mb-4 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900">Campaign &amp; Travel Dates</h4>
        <p className="text-xs text-gray-500">Per option. The campaign-options slide collapses to one value when every option matches. Travel dates pre-fill from the pricing tool.</p>
      </div>
      <div className="px-4 py-4 space-y-5">
        {withOptions.map((prop) => (
          <PropertyDates key={prop.id} deck={deck} property={prop} onDeckChange={onDeckChange} />
        ))}
      </div>
    </div>
  );
}

function PropertyDates({ deck, property, onDeckChange }: { deck: FullDeck; property: DeckPropertyFull; onDeckChange: () => void }) {
  const options = uniqueOptionsByNumber(property.options);

  // Copy the first option's saved dates to the rest of the options.
  async function applyFirstToAll() {
    const src = options[0]?.tacticalDetails ?? {};
    const dates = {
      campaignStart: src.campaignStart ?? null,
      campaignEnd: src.campaignEnd ?? null,
      travelStart: src.travelStart ?? null,
      travelEnd: src.travelEnd ?? null,
    };
    await Promise.all(
      options.slice(1).map((o) =>
        updateOption(deck.id, o.id, { tacticalDetails: { ...(o.tacticalDetails ?? {}), ...dates } }),
      ),
    );
    onDeckChange();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">{property.propertyName}</span>
        {options.length > 1 && (
          <button type="button" onClick={applyFirstToAll} className="text-xs text-[#01B18B] hover:underline">
            Copy first option’s dates to all
          </button>
        )}
      </div>
      <div className="space-y-2">
        {options.map((opt) => (
          <OptionDateRow key={opt.id} deck={deck} option={opt} onDeckChange={onDeckChange} />
        ))}
      </div>
    </div>
  );
}

function OptionDateRow({ deck, option, onDeckChange }: { deck: FullDeck; option: DeckOption; onDeckChange: () => void }) {
  const td = option.tacticalDetails ?? {};
  // Fall back to legacy deck-level dates so existing decks still show values.
  const init = (k: 'campaignStart' | 'campaignEnd' | 'travelStart' | 'travelEnd') => td[k] ?? deck[k] ?? '';
  const [campaignStart, setCampaignStart] = useState(init('campaignStart'));
  const [campaignEnd, setCampaignEnd] = useState(init('campaignEnd'));
  const [travelStart, setTravelStart] = useState(init('travelStart'));
  const [travelEnd, setTravelEnd] = useState(init('travelEnd'));

  useEffect(() => {
    setCampaignStart(init('campaignStart'));
    setCampaignEnd(init('campaignEnd'));
    setTravelStart(init('travelStart'));
    setTravelEnd(init('travelEnd'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option.id, td.campaignStart, td.campaignEnd, td.travelStart, td.travelEnd]);

  async function save() {
    const next: TacticalDetails = {
      ...(option.tacticalDetails ?? {}),
      campaignStart: campaignStart || null,
      campaignEnd: campaignEnd || null,
      travelStart: travelStart || null,
      travelEnd: travelEnd || null,
    };
    await updateOption(deck.id, option.id, { tacticalDetails: next });
    onDeckChange();
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
      <div className="text-xs text-gray-600 md:pb-2">{option.tierLabel ?? `Option ${option.optionNumber}`}</div>
      <LabelledDate label="Campaign Start" value={campaignStart} onChange={setCampaignStart} onBlur={save} />
      <LabelledDate label="Campaign End" value={campaignEnd} onChange={setCampaignEnd} onBlur={save} />
      <LabelledDate label="Travel Start" value={travelStart} onChange={setTravelStart} onBlur={save} />
      <LabelledDate label="Travel End" value={travelEnd} onChange={setTravelEnd} onBlur={save} />
    </div>
  );
}

function LabelledDate({ label, value, onChange, onBlur }: { label: string; value: string; onChange: (v: string) => void; onBlur: () => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700 block mb-1">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#01B18B] focus:outline-none"
      />
    </label>
  );
}
