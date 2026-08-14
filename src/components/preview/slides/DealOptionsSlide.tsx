import { type DeckPropertyFull, type FullDeck, type DeckOption } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';
import { currencySymbol } from '../currency';
import { sortRoomsGrouped } from '../room-sort';
import { buildRateLines } from '../rate-lines';
import { applyRowOrder, moveRowKey, rowOrderKey } from '../row-order';
import { t, optionColumnLabel, dateLocaleTag } from '../labels';
import { translateInclusion } from '../i18n';
import { SLIDE_DISPLAY_STACK } from '../fonts';
import { OCEAN_TEAL, SANDY_BEIGE, INK } from '../brand';
import { TextScaleControl, readTextScale } from '../TextScaleControl';

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
  // A tier unticked in Step 2 (no selected rows) gets no column — matching
  // the tactical slides and Step 6 grouping.
  for (const [num, rows] of map) {
    if (!rows.some((r) => r.selected)) map.delete(num);
  }
  return map;
}

// Pick the label shown for a surcharge. Seasonal surcharges store the date range
// in `name` and the season title (e.g. "shoulder") in `period` — show the dates,
// not the title. Day-of-week surcharges store the day in `name` and a qualified
// label (e.g. "Saturday (high season)") in `period`, which begins with `name`;
// those keep the label.
function surchargeLabel(s: { name: string; period?: string }): string {
  return s.period && s.period.startsWith(s.name) ? s.period : s.name;
}

function fmtDateRange(start: string | null, end: string | null, locale?: string): string {
  if (!start && !end) return '—';
  const tag = dateLocaleTag(locale);
  const s = start ? new Date(start).toLocaleDateString(tag, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const e = end ? new Date(end).toLocaleDateString(tag, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  if (s && e) return `${s} – ${e}`;
  return s || e || '—';
}

function fmtBlackouts(bd: Array<{ from: string; to: string }> | null): string {
  if (!bd || bd.length === 0) return '';
  return bd.map((b) => (b.to && b.to !== b.from ? `${b.from} – ${b.to}` : b.from)).join('\n');
}

export function DealOptionsSlide({ property, deck, onFieldChange }: DealOptionsSlideProps) {
  const hasOptions = property && property.options.length > 0;
  // Forecast is sourced from the pricing tool and only present for some
  // properties (e.g. limited Reef Sleep WSY data), so only offer the toggle
  // when at least one option actually carries a room-night forecast.
  const hasForecast = !!property && property.options.some((o) => o.tacticalDetails?.roomNightForecast != null || o.tacticalDetails?.revenueForecast != null);
  const cf = { ...deck?.templateDefaults, ...deck?.customFields };
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString(dateLocaleTag(deck?.renderLocale), { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: SANDY_BEIGE }}>
      {/* Header */}
      <div className="px-[5%] pt-[4%] pb-3 flex items-start justify-between">
        <SlideRichText
          fieldKey="deal.headline"
          customFields={cf}
          onFieldChange={onFieldChange}
          className="font-bold"
          style={{ fontFamily: SLIDE_DISPLAY_STACK, color: OCEAN_TEAL }}
        />
        {onFieldChange && hasOptions && (
          <div className="flex items-center gap-2 ml-2">
            <TextScaleControl fieldKey={`deal.${property.id}.textScale`} customFields={cf} onFieldChange={onFieldChange} title="Scale all table text on this slide" />
            <button
              type="button"
              onClick={() => onFieldChange('custom', '', 'deal.showSellRates', cf['deal.showSellRates'] === 'true' ? 'false' : 'true')}
              className="text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer whitespace-nowrap"
              title="Show or hide a Sell rate row for partners (off by default)"
            >
              {cf['deal.showSellRates'] === 'true' ? 'Hide sell rates' : 'Show sell rates'}
            </button>
            {property.options.some((o) => (o.nights ?? 0) > 1) && (
              <button
                type="button"
                onClick={() => onFieldChange('custom', '', 'deal.showPerNight', cf['deal.showPerNight'] === 'true' ? 'false' : 'true')}
                className="text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer whitespace-nowrap"
                title="Also show the equivalent per-night rate next to multi-night package prices (off by default)"
              >
                {cf['deal.showPerNight'] === 'true' ? 'Hide per-night rates' : 'Show per-night rates'}
              </button>
            )}
            {hasForecast && (
              <button
                type="button"
                onClick={() => onFieldChange('custom', '', 'deal.showForecast', cf['deal.showForecast'] === 'true' ? 'false' : 'true')}
                className="text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer whitespace-nowrap"
                title="Show or hide a Room night forecast row (from the pricing tool; off by default)"
              >
                {cf['deal.showForecast'] === 'true' ? 'Hide forecast' : 'Show forecast'}
              </button>
            )}
            <button
              type="button"
              onClick={() => onFieldChange('custom', '', `deal.${property.id}.combine`, cf[`deal.${property.id}.combine`] === 'true' ? 'false' : 'true')}
              className="text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer whitespace-nowrap"
              title="Combine the campaign details (Allocation, Payment) onto this slide and hide the separate details slide"
            >
              {cf[`deal.${property.id}.combine`] === 'true' ? 'Split details slide' : 'Combine onto one slide'}
            </button>
            {cf && Object.keys(cf).some((k) => k.startsWith(`deal.${property.id}.`) && !k.endsWith('.combine') && !k.endsWith('.textScale') && !k.endsWith('.customRows') && !k.endsWith('.rowOrder') && !k.includes('.custom.')) && (
              <button
                type="button"
                onClick={async () => {
                  // Reset per-cell text/size overrides only — leave the structural
                  // combine + text-scale + row-order settings intact.
                  const keysToRemove = Object.keys(cf).filter((k) => k.startsWith(`deal.${property.id}.`) && !k.endsWith('.combine') && !k.endsWith('.textScale') && !k.endsWith('.customRows') && !k.endsWith('.rowOrder') && !k.includes('.custom.'));
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
            <button
              type="button"
              onClick={() => {
                let ids: string[] = [];
                try {
                  const parsed = JSON.parse(cf[`deal.${property.id}.customRows`] ?? '[]');
                  if (Array.isArray(parsed)) ids = parsed.filter((x): x is string => typeof x === 'string');
                } catch { /* ignore malformed */ }
                onFieldChange('custom', '', `deal.${property.id}.customRows`, JSON.stringify([...ids, `r${Date.now().toString(36)}`]));
              }}
              className="text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer whitespace-nowrap"
              title="Add a custom row (editable label + a value per option)"
            >
              + Add row
            </button>
          </div>
        )}
      </div>

      {!hasOptions ? (
        <div className="flex-1 mx-[5%] mb-[5%] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-400">{t('No deal options configured', deck?.renderLocale)}</p>
            <p className="text-[10px] text-gray-300 mt-1">{t('Upload a pricing tool in the wizard (Step 2)', deck?.renderLocale)}</p>
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
          <span className="text-[10px] text-gray-600 ml-1"><strong>{t('updated', deck?.renderLocale)}</strong> {date}</span>
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
  const showForecast = customFields?.['deal.showForecast'] === 'true';
  // Opt-in per-night rate alongside multi-night package prices (#SYR-89, ~5 PCM requests).
  const showPerNight = customFields?.['deal.showPerNight'] === 'true';
  // When combined, the campaign-details slide's rows (Allocation, Payment) move
  // onto this table and that slide is hidden via hiddenSlides (see DeckPreview).
  const combined = customFields?.[`deal.${property.id}.combine`] === 'true';
  // Per-property table text-size (50–200%), driven by the header A−/A+ control.
  const textScale = readTextScale(customFields, `deal.${property.id}.textScale`);
  const baseFont = Math.round(9 * (textScale / 100));
  const locale = deck?.renderLocale;

  // Per-option room-night forecast — owner row carries the parsed value.
  const optionForecast = (optNum: number): string => {
    const grp = groups.get(optNum) ?? [];
    const owner = grp.find((o) => o.tacticalDetails?.roomNightForecast != null);
    const n = owner?.tacticalDetails?.roomNightForecast;
    return n != null ? `${n.toLocaleString()} ${t('room nights', locale)}` : '';
  };

  // Per-option revenue forecast (Total Hotel Revenue, AUD) — owner row carries it.
  const optionRevenue = (optNum: number): string => {
    const grp = groups.get(optNum) ?? [];
    const owner = grp.find((o) => o.tacticalDetails?.revenueForecast != null);
    const r = owner?.tacticalDetails?.revenueForecast;
    return r != null ? `${currencySymbol(property.currency)}${r.toLocaleString()}` : '';
  };

  const optionLabels = optNums.map((num) => {
    const first = groups.get(num)![0];
    return first.tierLabel ?? optionColumnLabel(num, locale);
  });

  // Per-option campaign/travel dates — owner-row tactical dates with deck-level
  // fallback, matching the one-page (MarketingAssets) layout.
  const optionDates = (optNum: number) => {
    const grp = groups.get(optNum) ?? [];
    const owner = grp.find((o) => {
      const td = o.tacticalDetails;
      return td && (td.campaignStart || td.campaignEnd || td.travelStart || td.travelEnd);
    });
    const td = owner?.tacticalDetails;
    return {
      campaign: fmtDateRange(td?.campaignStart ?? deck?.campaignStart ?? null, td?.campaignEnd ?? deck?.campaignEnd ?? null, locale),
      travel: fmtDateRange(td?.travelStart ?? deck?.travelStart ?? null, td?.travelEnd ?? deck?.travelEnd ?? null, locale),
    };
  };

  // Per-option allocation lines, deduped — mirrors the campaign-details slide.
  // Rooms are ordered by cost price ascending, the same as the NETT rate row,
  // so the allocation lists room types in the same order as the rates section.
  const optionAllocation = (optNum: number): string => {
    const rooms = sortRoomsGrouped(groups.get(optNum) ?? [], (r) => r.costPrice);
    const lines = rooms.map((r) => {
      const room = r.roomType ?? t('Room', locale);
      if (!r.allocation) return `${room} – ? ${t('rooms per night', locale)}`;
      return /^\d+$/.test(r.allocation)
        ? `${room} – ${r.allocation} ${t('rooms per night', locale)}`
        : `${room} – ${r.allocation}`;
    });
    return Array.from(new Set(lines)).join('\n');
  };

  // Build rows
  // labelSuffix renders after the translated label — used for currency symbols
  // ("NETT rate (€)"), which must not become part of the translation key.
  type Row = { key: string; label: string; labelSuffix?: string; cells: string[]; custom?: boolean; customId?: string };
  const rows: Row[] = [];

  // Campaign period + Travel dates (#18 — also on the side-by-side now). The
  // Campaign period row is dropped when empty for every option.
  const periodCells = optNums.map((num) => optionDates(num).campaign);
  const travelCells = optNums.map((num) => optionDates(num).travel);
  if (periodCells.some((c) => c && c !== '—')) {
    rows.push({ key: 'period', label: 'Campaign period', cells: periodCells });
  }
  rows.push({ key: 'travel', label: 'Travel dates', cells: travelCells });

  // Allocation — merged in from the campaign-details slide when combined.
  if (combined) {
    rows.push({ key: 'allocation', label: 'Allocation', cells: optNums.map((num) => optionAllocation(num)) });
  }

  // Room night forecast (#— from the pricing tool). Opt-in via the slide
  // header toggle; only rendered when a forecast was parsed for some option.
  if (showForecast) {
    const forecastCells = optNums.map((num) => optionForecast(num));
    if (forecastCells.some((c) => c !== '')) {
      rows.push({ key: 'forecast', label: 'Room night forecast', cells: forecastCells });
    }
    const revenueCells = optNums.map((num) => optionRevenue(num));
    if (revenueCells.some((c) => c !== '')) {
      rows.push({ key: 'revenue', label: 'Revenue forecast', cells: revenueCells });
    }
  }

  // Inclusions row
  rows.push({
    key: 'inclusions',
    label: 'Inclusions Value Adds',
    cells: optNums.map((num) => {
      const first = groups.get(num)![0];
      return first.inclusions?.map((inc) => `• ${translateInclusion(inc, customFields)}`).join('\n') ?? '-';
    }),
  });

  // Rates row — show nett (cost) price. A room type priced at several stay
  // lengths gets one line ("Centennial King – $399 (2N), $591 (3N)"); a single
  // stay length keeps the package form ("Standard Room 2N – $290"), and a
  // one-night rate shows per-night ("Standard Room – $290 per night").
  // Rows ticked off in Step 2 are excluded; per the chosen behaviour we keep the
  // option column even when every row is unticked (renders empty).
  rows.push({
    key: 'rates',
    label: 'NETT rate',
    labelSuffix: ` (${currencySymbol(property.currency)})`,
    cells: optNums.map((num) => buildRateLines(
      groups.get(num)!.filter((r) => r.selected),
      (r) => r.costPrice,
      property.currency,
      { showPerNight, locale },
    ).join('\n')),
  });

  // Sell rate — optional, off by default (toggle in the slide header). Mirrors
  // the NETT row but uses the sell price so PCMs can choose to show partners both.
  // Sell prices come out of the pricing tool already in AUD (LUX sells in AUD),
  // so they always render with the AUD symbol regardless of the deal currency.
  if (showSell) {
    rows.push({
      key: 'sellrates',
      label: 'Sell rate',
      labelSuffix: ` (${currencySymbol('AUD')})`,
      cells: optNums.map((num) => buildRateLines(
        groups.get(num)!.filter((r) => r.selected),
        (r) => r.sellPrice,
        'AUD',
        { showPerNight, locale },
      ).join('\n')),
    });
  }

  // Surcharges
  if (property.options.some((o) => o.surcharges && o.surcharges.length > 0)) {
    rows.push({
      key: 'surcharge',
      label: 'Surcharge – Season',
      cells: optNums.map((num) => {
        const first = groups.get(num)![0];
        return first.surcharges?.map((s) => {
          const label = surchargeLabel(s);
          return s.amount == null
            ? label
            : `${label} - ${currencySymbol(property.currency)}${Number(s.amount).toLocaleString()} ${t('per night', locale)}`;
        }).join('\n') ?? '-';
      }),
    });
  }

  // Blackout dates — per option, editable inline; hidden when empty for all (#20).
  const blackoutCells = optNums.map((num) => fmtBlackouts(groups.get(num)![0].blackoutDates));
  if (blackoutCells.some((c) => c.trim() !== '')) {
    rows.push({ key: 'blackout', label: 'Blackout dates', cells: blackoutCells });
  }

  // Payment — merged in from the campaign-details slide when combined (closing row).
  if (combined) {
    rows.push({ key: 'payment', label: 'Payment', cells: optNums.map(() => t('VCC', locale)) });
  }

  // Custom rows (opt-in) — appended at the end. Ordered ids live in
  // deal.<prop>.customRows; the label + per-option cells edit inline. Nothing
  // shows unless the PCM adds a row via the header "+ Add row" button.
  let customRowIds: string[] = [];
  try {
    const raw = customFields?.[`deal.${property.id}.customRows`];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) customRowIds = parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch { /* ignore malformed */ }
  for (const id of customRowIds) {
    rows.push({ key: `custom.${id}`, label: '', cells: optNums.map(() => ''), custom: true, customId: id });
  }

  // PCM row order (hover ↑/↓ on the row label), saved as deal.<prop>.rowOrder.
  const orderKey = rowOrderKey('deal', property.id);
  const orderedRows = applyRowOrder(rows, customFields, orderKey);

  const moveRow = (key: string, dir: -1 | 1) => {
    if (!onFieldChange) return;
    const keys = moveRowKey(orderedRows, key, dir);
    if (keys) onFieldChange('custom', '', orderKey, JSON.stringify(keys));
  };

  return (
    <div className="flex-1 px-[5%] pb-2 overflow-visible">
      <table className="w-full border-collapse" style={{ fontSize: baseFont }}>
        <thead>
          <tr>
            <th className="p-2 text-left w-[14%]" style={{ backgroundColor: OCEAN_TEAL }} />
            {optionLabels.map((label, i) => (
              <th key={i} className="p-2 text-center font-bold text-white" style={{ backgroundColor: OCEAN_TEAL }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orderedRows.map((row, ri) => {
            const rowBg = ri % 2 === 0 ? 'bg-[#EEF3F2]' : 'bg-white';
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
              <tr key={row.key} className="border-b border-gray-200 group">
                <td className={`p-2 font-bold align-top relative ${rowBg}`} style={{ color: OCEAN_TEAL }}>
                  {onFieldChange && (
                    <div className="absolute top-0.5 right-0.5 z-10 hidden group-hover:flex gap-1">
                      <button
                        type="button"
                        title="Move this row up"
                        onClick={() => moveRow(row.key, -1)}
                        className="rounded border border-gray-300 bg-white px-1 py-0.5 text-[9px] leading-none text-gray-600 shadow hover:bg-gray-50 cursor-pointer"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        title="Move this row down"
                        onClick={() => moveRow(row.key, 1)}
                        className="rounded border border-gray-300 bg-white px-1 py-0.5 text-[9px] leading-none text-gray-600 shadow hover:bg-gray-50 cursor-pointer"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                  {row.custom ? (
                    <span className="inline-flex items-start gap-1">
                      <SlideRichText
                        fieldKey={`deal.${property.id}.custom.${row.customId}.label`}
                        defaultValue="New row"
                        defaultSize={baseFont}
                        customFields={customFields}
                        onFieldChange={onFieldChange}
                        style={{ color: OCEAN_TEAL, fontWeight: 700 }}
                      />
                      {onFieldChange && (
                        <button
                          type="button"
                          title="Remove this row"
                          onClick={() => {
                            const next = customRowIds.filter((x) => x !== row.customId);
                            onFieldChange('custom', '', `deal.${property.id}.customRows`, JSON.stringify(next));
                            Object.keys(customFields ?? {})
                              .filter((k) => k.startsWith(`deal.${property.id}.custom.${row.customId}.`))
                              .forEach((k) => onFieldChange('custom', '', k, ''));
                          }}
                          className="text-[11px] leading-none text-gray-400 hover:text-red-600 cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ) : (
                    <>{t(row.label, locale)}{row.labelSuffix ?? ''}</>
                  )}
                </td>
                {allSame ? (
                  <td className={`p-2 align-top text-center ${rowBg}`} colSpan={optNums.length}>
                    <SlideRichText
                      fieldKey={`deal.${property.id}.${row.key}.opt${optNums[0]}`}
                      defaultValue={row.cells[0].replace(/\n/g, '<br>')}
                      defaultSize={baseFont}
                      customFields={customFields}
                      onFieldChange={onFieldChange}
                      style={{ color: INK, textAlign: 'center' }}
                    />
                  </td>
                ) : (
                  row.cells.map((cell, ci) => (
                    <td key={ci} className={`p-2 align-top ${rowBg}`}>
                      <SlideRichText
                        fieldKey={`deal.${property.id}.${row.key}.opt${optNums[ci]}`}
                        defaultValue={cell.replace(/\n/g, '<br>')}
                        defaultSize={baseFont}
                        customFields={customFields}
                        onFieldChange={onFieldChange}
                        style={{ color: INK }}
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
