import { type DeckPropertyFull, type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';
import {
  INVESTMENT_OVERVIEW_ROWS,
  classifyCellValue,
  resolveComparisonCell,
  rulesFromDeck,
  uniqueOptionsByNumber,
} from './tactical-shared';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';
const RED = '#d44a4a';

interface Props {
  property?: DeckPropertyFull;
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 mx-auto" aria-label="Included">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke={GREEN} strokeWidth="1.5" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 mx-auto" aria-label="Not included">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke={RED} strokeWidth="1.5" />
      <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TacticalInvestmentOverviewSlide({ property, deck, onFieldChange }: Props) {
  const prop = property ?? deck?.properties[0];
  const cf = { ...deck?.templateDefaults, ...deck?.customFields };
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const options = prop ? uniqueOptionsByNumber(prop.options) : [];
  const rulesByTier = rulesFromDeck(deck as FullDeck, prop);

  const optionColPct = 22;
  const labelColPct = 100 - optionColPct * options.length;

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      <div className="px-[5%] pt-[4%] pb-3">
        <SlideRichText
          fieldKey="tactical.investment.headline"
          defaultValue="Investment Overview"
          defaultSize={20}
          customFields={cf}
          onFieldChange={onFieldChange}
          className="font-bold"
          style={{ color: GREEN }}
        />
      </div>

      {!prop || options.length === 0 ? (
        <div className="flex-1 mx-[5%] mb-[5%] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-400">No tactical packages configured</p>
            <p className="text-[10px] text-gray-300 mt-1">Configure tactical packages in Step 2</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 px-[5%] pb-2 overflow-visible">
          <table className="w-full text-[10px] border-collapse table-fixed h-full">
            <colgroup>
              <col style={{ width: `${labelColPct}%` }} />
              {options.map((_o, i) => <col key={i} style={{ width: `${optionColPct}%` }} />)}
            </colgroup>
            <thead>
              <tr>
                <th className="p-2 text-left" />
                {options.map((opt, i) => (
                  <th
                    key={i}
                    className="p-3 text-center font-bold text-white"
                    style={{ backgroundColor: GREEN, borderLeft: '2px solid white' }}
                  >
                    {(opt.tierLabel ?? `Option ${opt.optionNumber}`).toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INVESTMENT_OVERVIEW_ROWS.map((row, ri) => {
                const rowBg = ri % 2 === 0 ? 'bg-[#edf7f5]' : 'bg-white';
                return (
                  <tr key={row.key}>
                    <td className={`p-3 align-middle font-bold text-right ${rowBg}`} style={{ color: GREEN }}>
                      {row.label}
                    </td>
                    {options.map((opt, ci) => {
                      const value = resolveComparisonCell(opt, rulesByTier[opt.optionNumber], row);
                      const cls = classifyCellValue(value);
                      const cellBase = `p-3 align-middle ${rowBg}`;
                      const cellStyle = { borderLeft: '2px solid white' as const };
                      if (row.kind === 'tick' || cls === 'tick' || cls === 'cross') {
                        const isTick = cls === 'tick' || (row.kind === 'tick' && cls !== 'cross' && cls !== 'empty');
                        return (
                          <td key={ci} className={`${cellBase} text-center`} style={cellStyle}>
                            {cls === 'empty' ? <span className="text-gray-300">—</span> : isTick ? <CheckIcon /> : <CrossIcon />}
                          </td>
                        );
                      }
                      return (
                        <td key={ci} className={`${cellBase} text-left whitespace-pre-line`} style={{ ...cellStyle, color: '#1a1a1a' }}>
                          {value || <span className="text-gray-300">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between px-[3%] py-2 bg-white/70 mt-auto">
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
