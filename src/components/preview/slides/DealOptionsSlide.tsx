import { type DeckPropertyFull, type FullDeck, type DeckOption } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';
import { formatMoney, currencySymbol } from '../currency';

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

function fmtDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  const s = start ? new Date(start).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const e = end ? new Date(end).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  if (s && e) return `${s} – ${e}`;
  return s || e || '—';
}

function fmtBlackouts(bd: Array<{ from: string; to: string }> | null): string {
  if (!bd || bd.length === 0) return '';
  return bd.map((b) => (b.to && b.to !== b.from ? `${b.from} – ${b.to}` : b.from)).join('\n');
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
        {onFieldChange && hasOptions && (
          <div className="flex items-center gap-2 ml-2">
            <button
              type="button"
              onClick={() => onFieldChange('custom', '', 'deal.showSellRates', cf['deal.showSellRates'] === 'true' ? 'false' : 'true')}
              className="text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer whitespace-nowrap"
              title="Show or hide a Sell rate row for partners (off by default)"
            >
              {cf['deal.showSellRates'] === 'true' ? 'Hide sell rates' : 'Show sell rates'}
            </button>
            {cf && Object.keys(cf).some((k) => k.startsWith(`deal.${property.id}.`)) && (
              <button
                type="button"
                onClick={async () => {
                  const keysToRemove = Object.keys(cf).filter((k) => k.startsWith(`deal.${property.id}.`));
                  for (const k of keysToRemove) {
                    await onFieldChange('custom', '', k, '');
                  }
                }}
                className="text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer whitespace-nowrap"
                title="Reset table text to match current deal options"
              >
                Refresh from options
              </button>
            )}
          </div>
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
        <OptionsTable property={property} deck={deck} customFields={cf} onFieldChange={onFieldChange} />
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

function OptionsTable({ property, deck, customFields, onFieldChange }: { property: DeckPropertyFull; deck?: FullDeck; customFields?: Record<string, string>; onFieldChange?: FieldChangeHandler }) {
  const groups = groupByOption(property.options);
  const optNums = Array.from(groups.keys()).sort();
  const showSell = customFields?.['deal.showSellRates'] === 'true';

  const optionLabels = optNums.map((num) => {
    const first = groups.get(num)![0];
    return first.tierLabel ?? `Option ${num === 1 ? 'One' : num === 2 ? 'Two' : 'Three'}`;
  });

  // Per-option campaign/travel dates — owner-row tactical dates with deck-level
  // fallback, matching the one-page (MarketingAssets) layout.
  const optionDates = (optNum: number) => {
    const grp = groups.get(optNum) ?? [];
    const owner = grp.find((o) => {
      const t = o.tacticalDetails;
      return t && (t.campaignStart || t.campaignEnd || t.travelStart || t.travelEnd);
    });
    const t = owner?.tacticalDetails;
    return {
      campaign: fmtDateRange(t?.campaignStart ?? deck?.campaignStart ?? null, t?.campaignEnd ?? deck?.campaignEnd ?? null),
      travel: fmtDateRange(t?.travelStart ?? deck?.travelStart ?? null, t?.travelEnd ?? deck?.travelEnd ?? null),
    };
  };

  // Build rows
  type Row = { key: string; label: string; cells: string[] };
  const rows: Row[] = [];

  // Campaign period + Travel dates (#18 — also on the side-by-side now). The
  // Campaign period row is dropped when empty for every option.
  const periodCells = optNums.map((num) => optionDates(num).campaign);
  const travelCells = optNums.map((num) => optionDates(num).travel);
  if (periodCells.some((c) => c && c !== '—')) {
    rows.push({ key: 'period', label: 'Campaign period', cells: periodCells });
  }
  rows.push({ key: 'travel', label: 'Travel dates', cells: travelCells });

  // Inclusions row
  rows.push({
    key: 'inclusions',
    label: 'Inclusions Value Adds',
    cells: optNums.map((num) => {
      const first = groups.get(num)![0];
      return first.inclusions?.map((inc) => `• ${inc}`).join('\n') ?? '-';
    }),
  });

  // Rates row — show nett (cost) price. If nights > 1, show as package (e.g. "Standard Room 2N – $290");
  // otherwise show per-night (e.g. "Standard Room – $290 per night").
  // Rows ticked off in Step 2 are excluded; per the chosen behaviour we keep the
  // option column even when every row is unticked (renders empty).
  rows.push({
    key: 'rates',
    label: 'NETT rate',
    cells: optNums.map((num) => {
      const rooms = groups.get(num)!.filter((r) => r.selected);
      return rooms.map((r) => {
        const price = formatMoney(r.costPrice, property.currency) ?? '?';
        const roomLabel = r.roomType ?? 'Room';
        return r.nights && r.nights > 1
          ? `${roomLabel} ${r.nights}N – ${price}`
          : `${roomLabel} – ${price} per night`;
      }).join('\n');
    }),
  });

  // Sell rate — optional, off by default (toggle in the slide header). Mirrors
  // the NETT row but uses the sell price so PCMs can choose to show partners both.
  if (showSell) {
    rows.push({
      key: 'sellrates',
      label: 'Sell rate',
      cells: optNums.map((num) => {
        const rooms = groups.get(num)!.filter((r) => r.selected);
        return rooms.map((r) => {
          const price = formatMoney(r.sellPrice, property.currency) ?? '?';
          const roomLabel = r.roomType ?? 'Room';
          return r.nights && r.nights > 1
            ? `${roomLabel} ${r.nights}N – ${price}`
            : `${roomLabel} – ${price} per night`;
        }).join('\n');
      }),
    });
  }

  // Surcharges
  if (property.options.some((o) => o.surcharges && o.surcharges.length > 0)) {
    rows.push({
      key: 'surcharge',
      label: 'Surcharge – Season',
      cells: optNums.map((num) => {
        const first = groups.get(num)![0];
        return first.surcharges?.map((s) =>
          `${s.period ?? s.name} - ${currencySymbol(property.currency)}${Number(s.amount).toFixed(2)} per night`
        ).join('\n') ?? '-';
      }),
    });
  }

  // Blackout dates — per option, editable inline; hidden when empty for all (#20).
  const blackoutCells = optNums.map((num) => fmtBlackouts(groups.get(num)![0].blackoutDates));
  if (blackoutCells.some((c) => c.trim() !== '')) {
    rows.push({ key: 'blackout', label: 'Blackout dates', cells: blackoutCells });
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
            // Merge adjacent option cells when they resolve to the same text
            // (after applying any per-cell custom-field overrides). Cuts the
            // visual repetition for rows like "VCC / VCC / VCC".
            const effective = row.cells.map((defaultCell, ci) => {
              const fk = `deal.${property.id}.${row.key}.opt${optNums[ci]}`;
              return customFields?.[fk] ?? defaultCell;
            });
            const placeholder = effective[0]?.trim();
            const allSame = effective.length > 1
              && placeholder !== ''
              && placeholder !== '-'
              && effective.every((v) => v === effective[0]);

            return (
              <tr key={ri} className="border-b border-gray-200">
                <td className={`p-2 font-bold align-top ${rowBg}`} style={{ color: GREEN }}>
                  {row.label}
                </td>
                {allSame ? (
                  <td className={`p-2 align-top text-center ${rowBg}`} colSpan={optNums.length}>
                    <SlideRichText
                      fieldKey={`deal.${property.id}.${row.key}.opt${optNums[0]}`}
                      defaultValue={row.cells[0].replace(/\n/g, '<br>')}
                      defaultSize={9}
                      customFields={customFields}
                      onFieldChange={onFieldChange}
                      style={{ color: '#1a1a1a', textAlign: 'center' }}
                    />
                  </td>
                ) : (
                  row.cells.map((cell, ci) => (
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
                  ))
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
