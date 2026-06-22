import { type DeckPropertyFull, type FullDeck, type DeckOption } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';
import { t, optionColumnLabel, dateLocaleTag } from '../labels';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface MarketingAssetsSlideProps {
  property?: DeckPropertyFull;
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

function fmtDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  const s = start ? new Date(start).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const e = end ? new Date(end).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  if (s && e) return `${s} – ${e}`;
  return s || e || '—';
}

function getUniqueOptions(options: DeckOption[]): DeckOption[] {
  const seen = new Set<number>();
  return options.filter((o) => {
    if (seen.has(o.optionNumber)) return false;
    seen.add(o.optionNumber);
    return true;
  });
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

export function MarketingAssetsSlide({ property, deck, onFieldChange }: MarketingAssetsSlideProps) {
  const uniqueOptions = property ? getUniqueOptions(property.options) : [];
  const groups = property ? groupByOption(property.options) : new Map();
  const hasAssets = uniqueOptions.some((o) => o.marketingAssets && Object.values(o.marketingAssets).some(Boolean));
  const cf = { ...deck?.templateDefaults, ...deck?.customFields };
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString(dateLocaleTag(deck?.renderLocale), { day: 'numeric', month: 'long', year: 'numeric' });
  const propId = property?.id ?? 'empty';
  const locale = deck?.renderLocale;

  const optionLabels = uniqueOptions.map((o) =>
    o.tierLabel ?? optionColumnLabel(o.optionNumber, locale)
  );
  const optNums = uniqueOptions.map((o) => o.optionNumber);

  // Per-option dates from the owner row in the option group, falling back to
  // the legacy deck-level dates. The row collapses when all options match.
  const optionDates = (optNum: number) => {
    const grp: DeckOption[] = groups.get(optNum) ?? [];
    const owner = grp.find((o) => {
      const td = o.tacticalDetails;
      return td && (td.campaignStart || td.campaignEnd || td.travelStart || td.travelEnd);
    });
    const td = owner?.tacticalDetails;
    return {
      campaign: fmtDateRange(td?.campaignStart ?? deck?.campaignStart ?? null, td?.campaignEnd ?? deck?.campaignEnd ?? null),
      travel: fmtDateRange(td?.travelStart ?? deck?.travelStart ?? null, td?.travelEnd ?? deck?.travelEnd ?? null),
    };
  };

  // Build rows
  type Row = { key: string; label: string; cells: string[] };
  const rows: Row[] = [
    {
      key: 'period',
      label: 'Campaign period',
      cells: uniqueOptions.map((o) => optionDates(o.optionNumber).campaign),
    },
    {
      key: 'travel',
      label: 'Travel dates',
      cells: uniqueOptions.map((o) => optionDates(o.optionNumber).travel),
    },
    {
      key: 'allocation',
      label: 'Allocation',
      cells: uniqueOptions.map((o) => {
        const rooms = groups.get(o.optionNumber) ?? [o];
        return rooms.map((r: { roomType: string | null; allocation: string | null }) => {
          const room = r.roomType ?? t('Room', locale);
          if (!r.allocation) return `${room} – ? ${t('rooms per night', locale)}`;
          return /^\d+$/.test(r.allocation)
            ? `${room} – ${r.allocation} ${t('rooms per night', locale)}`
            : `${room} – ${r.allocation}`;
        }).join('<br>');
      }),
    },
    {
      key: 'payment',
      label: 'Payment',
      cells: uniqueOptions.map(() => t('VCC', locale)),
    },
  ];

  // Drop the Campaign period row when empty for every option (no pricing-tool
  // source; blank unless entered manually). Honour manual overrides.
  const isRowEmpty = (row: Row): boolean =>
    row.cells.every((cell, ci) => {
      const v = (cf?.[`mktg.${propId}.${row.key}.opt${optNums[ci]}`] ?? cell ?? '').trim();
      return v === '' || v === '—';
    });
  const visibleRows = rows.filter((row) => row.key !== 'period' || !isRowEmpty(row));

  const hasEdits = cf && Object.keys(cf).some((k) => k.startsWith(`mktg.${propId}.`));

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      {/* Header */}
      <div className="px-[5%] pt-[4%] pb-3 flex items-start justify-between">
        <SlideRichText
          fieldKey="mktg.headline"
          customFields={cf}
          onFieldChange={onFieldChange}
          className="font-bold"
          style={{ color: GREEN }}
        />
        {onFieldChange && uniqueOptions.length > 0 && hasEdits && (
          <button
            type="button"
            onClick={async () => {
              const keysToRemove = Object.keys(cf!).filter((k) => k.startsWith(`mktg.${propId}.`));
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

      {!hasAssets && uniqueOptions.length === 0 ? (
        <div className="flex-1 mx-[5%] mb-[5%] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-400">{t('No marketing assets configured', deck?.renderLocale)}</p>
            <p className="text-[10px] text-gray-300 mt-1">{t('Assets are auto-recommended from deal tier rules (Step 6)', deck?.renderLocale)}</p>
          </div>
        </div>
      ) : (
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
              {visibleRows.map((row, ri) => {
                const rowBg = ri % 2 === 0 ? 'bg-[#edf7f5]' : 'bg-white';
                const effective = row.cells.map((defaultCell, ci) => {
                  const fk = `mktg.${propId}.${row.key}.opt${optNums[ci]}`;
                  return cf?.[fk] ?? defaultCell;
                });
                const placeholder = effective[0]?.trim();
                const allSame = effective.length > 1
                  && placeholder !== ''
                  && placeholder !== '-'
                  && effective.every((v) => v === effective[0]);
                return (
                  <tr key={row.key} className="border-b border-gray-200">
                    <td className={`p-2 font-bold align-top ${rowBg}`} style={{ color: GREEN }}>
                      {t(row.label, locale)}
                    </td>
                    {allSame ? (
                      <td className={`p-2 align-top text-center ${rowBg}`} colSpan={optNums.length}>
                        <SlideRichText
                          fieldKey={`mktg.${propId}.${row.key}.opt${optNums[0]}`}
                          defaultValue={row.cells[0]}
                          defaultSize={9}
                          customFields={cf}
                          onFieldChange={onFieldChange}
                          style={{ color: '#1a1a1a', textAlign: 'center' }}
                        />
                      </td>
                    ) : (
                      row.cells.map((cell, ci) => (
                        <td key={ci} className={`p-2 align-top ${rowBg}`}>
                          <SlideRichText
                            fieldKey={`mktg.${propId}.${row.key}.opt${optNums[ci]}`}
                            defaultValue={cell}
                            defaultSize={9}
                            customFields={cf}
                            onFieldChange={onFieldChange}
                            style={{ color: '#1a1a1a' }}
                          />
                        </td>
                      ))
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rates disclaimer + footer bar */}
      <div className="px-[5%] pb-1 mt-auto">
        <SlideRichText
          fieldKey="mktg.disclaimer"
          customFields={cf}
          onFieldChange={onFieldChange}
          style={{ color: '#333' }}
        />
      </div>
      <div className="flex items-center justify-between px-[3%] py-2 bg-white/70">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-bold text-gray-900">{hotelName}</span>
          <span className="text-[10px] text-gray-600 ml-1"><strong>{t('updated', deck?.renderLocale)}</strong> {date}</span>
        </div>
        <div className="flex items-center gap-3">
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-3.5 invert" />
        </div>
      </div>
    </div>
  );
}
