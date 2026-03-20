import { type DeckPropertyFull, type FullDeck, type DeckOption } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface MarketingAssetsSlideProps {
  property?: DeckPropertyFull;
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

function getUniqueOptions(options: DeckOption[]): DeckOption[] {
  const seen = new Set<number>();
  return options.filter((o) => {
    if (seen.has(o.optionNumber)) return false;
    seen.add(o.optionNumber);
    return true;
  });
}

export function MarketingAssetsSlide({ property, deck, onFieldChange }: MarketingAssetsSlideProps) {
  const uniqueOptions = property ? getUniqueOptions(property.options) : [];
  const hasAssets = uniqueOptions.some((o) => o.marketingAssets && Object.values(o.marketingAssets).some(Boolean));
  const cf = deck?.customFields;
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const optionLabels = uniqueOptions.map((o) =>
    o.tierLabel ?? `Option ${o.optionNumber === 1 ? 'One' : o.optionNumber === 2 ? 'Two' : 'Three'}`
  );

  // Build rows
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
        <SlideRichText
          fieldKey="mktg.headline"
          defaultValue="Your tailored campaign options"
          defaultSize={20}
          customFields={cf}
          onFieldChange={onFieldChange}
          className="font-bold"
          style={{ color: GREEN }}
        />
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

      {/* Rates disclaimer + footer bar */}
      <div className="px-[5%] pb-1 mt-auto">
        <p className="text-[9px] font-semibold" style={{ color: '#333' }}>
          Rates provided are inclusive of taxes and fees, and Luxury Escapes' marketing investment.
        </p>
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
