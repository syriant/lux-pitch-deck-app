import { type DeckPropertyFull, type FullDeck, type DeckOption } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface DealOptionsSlideProps {
  property?: DeckPropertyFull;
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

function groupByOption(options: DeckOption[]): Map<number, DeckOption[]> {
  const map = new Map<number, DeckOption[]>();
  for (const opt of options) {
    const group = map.get(opt.optionNumber) ?? [];
    group.push(opt);
    map.set(opt.optionNumber, group);
  }
  return map;
}

export function DealOptionsSlide({ property, deck, onFieldChange }: DealOptionsSlideProps) {
  const hasOptions = property && property.options.length > 0;
  const cf = { ...deck?.templateDefaults, ...deck?.customFields };
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      {/* Header */}
      <div className="px-[5%] pt-[4%] pb-3 flex items-start justify-between">
        <SlideRichText
          fieldKey="deal.headline"
          customFields={cf}
          onFieldChange={onFieldChange}
          className="font-bold"
          style={{ color: GREEN }}
        />
        {onFieldChange && hasOptions && cf && Object.keys(cf).some((k) => k.startsWith(`deal.${property.id}.`)) && (
          <button
            type="button"
            onClick={async () => {
              const keysToRemove = Object.keys(cf).filter((k) => k.startsWith(`deal.${property.id}.`));
              for (const k of keysToRemove) {
                await onFieldChange('custom', '', k, '');
              }
            }}
            className="text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer whitespace-nowrap ml-2"
            title="Reset table text to match current deal options"
          >
            Refresh from options
          </button>
        )}
      </div>

      {!hasOptions ? (
        <div className="flex-1 mx-[5%] mb-[5%] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-400">No deal options configured</p>
            <p className="text-[10px] text-gray-300 mt-1">Upload a pricing tool in the wizard (Step 2)</p>
          </div>
        </div>
      ) : (
        <OptionsTable property={property} customFields={cf} onFieldChange={onFieldChange} />
      )}

      {/* Rates disclaimer + footer bar */}
      <div className="px-[5%] pb-1">
        <SlideRichText
          fieldKey="deal.disclaimer"
          customFields={cf}
          onFieldChange={onFieldChange}
          style={{ color: '#333' }}
        />
      </div>
      <div className="flex items-center justify-between px-[3%] py-2 bg-white/70">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-bold text-gray-900">{hotelName}</span>
          <span className="text-[10px] text-gray-600 ml-1"><strong>updated</strong> {date}</span>
        </div>
        <div className="flex items-center gap-3">
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-3.5 invert" />
        </div>
      </div>
    </div>
  );
}

function OptionsTable({ property, customFields, onFieldChange }: { property: DeckPropertyFull; customFields?: Record<string, string>; onFieldChange?: FieldChangeHandler }) {
  const groups = groupByOption(property.options);
  const optNums = Array.from(groups.keys()).sort();

  const optionLabels = optNums.map((num) => {
    const first = groups.get(num)![0];
    return first.tierLabel ?? `Option ${num === 1 ? 'One' : num === 2 ? 'Two' : 'Three'}`;
  });

  // Build rows
  type Row = { key: string; label: string; cells: string[] };
  const rows: Row[] = [];

  // Marketing Assets row
  rows.push({
    key: 'assets',
    label: 'Marketing Assets',
    cells: optNums.map((num) => {
      const first = groups.get(num)![0];
      if (!first.marketingAssets) return '-';
      return Object.entries(first.marketingAssets)
        .filter(([, v]) => v)
        .map(([k]) => `• ${k}`)
        .join('\n') || '-';
    }),
  });

  // Inclusions row
  rows.push({
    key: 'inclusions',
    label: 'Inclusions Value Adds',
    cells: optNums.map((num) => {
      const first = groups.get(num)![0];
      return first.inclusions?.map((inc) => `• ${inc}`).join('\n') ?? '-';
    }),
  });

  // Rates row
  rows.push({
    key: 'rates',
    label: 'Per night rate',
    cells: optNums.map((num) => {
      const rooms = groups.get(num)!;
      return rooms.map((r) =>
        `${r.roomType ?? 'Room'} – $${r.sellPrice ? Number(r.sellPrice).toLocaleString() : '?'} per night`
      ).join('\n');
    }),
  });

  // Surcharges
  if (property.options.some((o) => o.surcharges && o.surcharges.length > 0)) {
    rows.push({
      key: 'surcharge',
      label: 'Surcharge – Season',
      cells: optNums.map((num) => {
        const first = groups.get(num)![0];
        return first.surcharges?.map((s) =>
          `${s.period ?? s.name} - $${s.amount} per night`
        ).join('\n') ?? '-';
      }),
    });
  }

  return (
    <div className="flex-1 px-[5%] pb-2 overflow-visible">
      <table className="w-full text-[9px] border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left w-[14%]" style={{ backgroundColor: GREEN }} />
            {optionLabels.map((label, i) => (
              <th key={i} className="p-2 text-center font-bold text-white" style={{ backgroundColor: GREEN }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const rowBg = ri % 2 === 0 ? 'bg-[#edf7f5]' : 'bg-white';
            return (
              <tr key={ri} className="border-b border-gray-200">
                <td className={`p-2 font-bold align-top ${rowBg}`} style={{ color: GREEN }}>
                  {row.label}
                </td>
                {row.cells.map((cell, ci) => (
                  <td key={ci} className={`p-2 align-top ${rowBg}`}>
                    <SlideRichText
                      fieldKey={`deal.${property.id}.${row.key}.opt${optNums[ci]}`}
                      defaultValue={cell.replace(/\n/g, '<br>')}
                      defaultSize={9}
                      customFields={customFields}
                      onFieldChange={onFieldChange}
                      style={{ color: '#1a1a1a' }}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
