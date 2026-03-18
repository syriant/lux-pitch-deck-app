import { type DeckPropertyFull, type DeckOption } from '@/api/decks.api';

// Brand colours
const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface MarketingAssetsSlideProps {
  property?: DeckPropertyFull;
}

function getUniqueOptions(options: DeckOption[]): DeckOption[] {
  const seen = new Set<number>();
  return options.filter((o) => {
    if (seen.has(o.optionNumber)) return false;
    seen.add(o.optionNumber);
    return true;
  });
}

export function MarketingAssetsSlide({ property }: MarketingAssetsSlideProps) {
  const uniqueOptions = property ? getUniqueOptions(property.options) : [];
  const hasAssets = uniqueOptions.some((o) => o.marketingAssets && Object.keys(o.marketingAssets).length > 0);

  const optionLabels = uniqueOptions.map((o) =>
    o.tierLabel ?? `Option ${o.optionNumber === 1 ? 'One' : o.optionNumber === 2 ? 'Two' : 'Three'}`
  );

  // Build additional rows for the second table (Campaign period, Travel dates, Allocation, Payment)
  type Row = { label: string; cells: string[] };
  const rows: Row[] = [
    {
      label: 'Campaign period',
      cells: uniqueOptions.map(() => '8–10 weeks'),
    },
    {
      label: 'Travel dates',
      cells: uniqueOptions.map(() => '12 months – blackout dates apply'),
    },
    {
      label: 'Allocation',
      cells: uniqueOptions.map((o) => {
        if (!o.allocation) return '-';
        return `${o.roomType ?? 'Room'} – ${o.allocation} rooms per night`;
      }),
    },
    {
      label: 'Payment',
      cells: uniqueOptions.map(() => 'VCC'),
    },
  ];

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      {/* Header */}
      <div className="px-[5%] pt-[4%] pb-3">
        <h2 className="text-xl font-bold" style={{ color: GREEN }}>
          Your tailored campaign options
        </h2>
      </div>

      {!hasAssets && uniqueOptions.length === 0 ? (
        <div className="flex-1 mx-[5%] mb-[5%] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-400">No marketing assets configured</p>
            <p className="text-[10px] text-gray-300 mt-1">Assets are auto-recommended from deal tier rules (Step 6)</p>
          </div>
        </div>
      ) : (
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
                    <td key={ci} className="p-2 align-top bg-white" style={{ color: '#333' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-end justify-between px-[5%] pb-[3%] mt-auto">
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
