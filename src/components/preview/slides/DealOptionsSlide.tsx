import { type DeckPropertyFull, type DeckOption } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface DealOptionsSlideProps {
  property?: DeckPropertyFull;
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

export function DealOptionsSlide({ property }: DealOptionsSlideProps) {
  const hasOptions = property && property.options.length > 0;

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      {/* Header */}
      <div className="px-[5%] pt-[4%] pb-3">
        <h2 className="text-xl font-bold" style={{ color: GREEN }}>
          Your tailored campaign options
        </h2>
      </div>

      {!hasOptions ? (
        <div className="flex-1 mx-[5%] mb-[5%] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-400">No deal options configured</p>
            <p className="text-[10px] text-gray-300 mt-1">Upload a pricing tool in the wizard (Step 2)</p>
          </div>
        </div>
      ) : (
        <OptionsTable property={property} />
      )}

      {/* Footer */}
      <div className="flex items-end justify-between px-[5%] pb-[3%]">
        <p className="text-[9px] font-semibold" style={{ color: '#333' }}>
          Rates provided are inclusive of taxes and fees, and Luxury Escapes' marketing investment.
        </p>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: GREEN }} />
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#333' }}>
            LUXURY<span className="font-normal">ESCAPES</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function OptionsTable({ property }: { property: DeckPropertyFull }) {
  const groups = groupByOption(property.options);
  const optNums = Array.from(groups.keys()).sort();

  const optionLabels = optNums.map((num) => {
    const first = groups.get(num)![0];
    return first.tierLabel ?? `Option ${num === 1 ? 'One' : num === 2 ? 'Two' : 'Three'}`;
  });

  // Build rows
  type Row = { label: string; cells: string[] };
  const rows: Row[] = [];

  // Marketing Assets row
  rows.push({
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
    label: 'Inclusions Value Adds',
    cells: optNums.map((num) => {
      const first = groups.get(num)![0];
      return first.inclusions?.map((inc) => `• ${inc}`).join('\n') ?? '-';
    }),
  });

  // Rates row
  rows.push({
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
    <div className="flex-1 px-[5%] pb-2 overflow-hidden">
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
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-200">
              <td className="p-2 font-bold align-top" style={{ color: GREEN }}>
                {row.label}
              </td>
              {row.cells.map((cell, ci) => (
                <td key={ci} className="p-2 align-top bg-white whitespace-pre-line" style={{ color: '#333' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
