import { type DeckPropertyFull, type FullDeck, type DeckOption } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';
import { t, optionColumnLabel, dateLocaleTag } from '../labels';
import { SLIDE_DISPLAY_STACK } from '../fonts';
import { OCEAN_TEAL, SANDY_BEIGE, INK } from '../brand';
import { currencySymbol } from '../currency';

interface MarketingAssetsSlideProps {
  property?: DeckPropertyFull;
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

function fmtDateRange(start: string | null, end: string | null, locale?: string): string {
  if (!start && !end) return '—';
  const tag = dateLocaleTag(locale);
  const s = start ? new Date(start).toLocaleDateString(tag, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const e = end ? new Date(end).toLocaleDateString(tag, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
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
  // Global text-size modifier for the whole table (50–200%).
  const textScale = Math.min(200, Math.max(50, Number(cf?.[`mktg.${propId}.textScale`]) || 100));
  const baseFont = Math.round(9 * (textScale / 100));

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
      campaign: fmtDateRange(td?.campaignStart ?? deck?.campaignStart ?? null, td?.campaignEnd ?? deck?.campaignEnd ?? null, locale),
      travel: fmtDateRange(td?.travelStart ?? deck?.travelStart ?? null, td?.travelEnd ?? deck?.travelEnd ?? null, locale),
    };
  };

  // Opt-in "Estimated marketing spend" row — off by default so existing decks
  // are unchanged; the PCM reveals it via the header toggle and types a figure
  // per option. Currency is the pitch currency, shown in the row label.
  const showSpend = cf?.[`mktg.${propId}.showSpend`] === 'true';

  // Build rows. `labelSuffix` renders after the translated label (currency
  // symbol on the spend row) without becoming part of the translation key.
  type Row = { key: string; label: string; labelSuffix?: string; cells: string[]; custom?: boolean; customId?: string };
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
        // Order rooms by cost price ascending to match the NETT rate order on
        // the deal-options slide, so allocation follows the rates-section order.
        const rooms = ((groups.get(o.optionNumber) ?? [o]) as DeckOption[])
          .slice()
          .sort((a, b) => Number(a.costPrice ?? Infinity) - Number(b.costPrice ?? Infinity));
        const lines = rooms.map((r: { roomType: string | null; allocation: string | null }) => {
          const room = r.roomType ?? t('Room', locale);
          if (!r.allocation) return `${room} – ? ${t('rooms per night', locale)}`;
          return /^\d+$/.test(r.allocation)
            ? `${room} – ${r.allocation} ${t('rooms per night', locale)}`
            : `${room} – ${r.allocation}`;
        });
        // The option group can hold several rows with the same room + allocation
        // (one per package/event); collapse identical lines so they don't repeat.
        return Array.from(new Set(lines)).join('<br>');
      }),
    },
    {
      key: 'payment',
      label: 'Payment',
      cells: uniqueOptions.map(() => t('VCC', locale)),
    },
  ];

  if (showSpend) {
    rows.push({
      key: 'spend',
      label: 'Estimated marketing spend',
      labelSuffix: ` (${currencySymbol(property?.currency)})`,
      // Empty defaults — the PCM fills each option's figure inline (stored as a
      // per-cell override, same mechanism as every other row).
      cells: uniqueOptions.map(() => ''),
    });
  }

  // Custom rows (opt-in) — appended at the end; ordered ids live in
  // mktg.<prop>.customRows, label + per-option cells edit inline. Nothing shows
  // unless the PCM adds a row via the header "+ Add row" button.
  let customRowIds: string[] = [];
  try {
    const raw = cf?.[`mktg.${propId}.customRows`];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) customRowIds = parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch { /* ignore malformed */ }
  for (const id of customRowIds) {
    rows.push({ key: `custom.${id}`, label: '', cells: uniqueOptions.map(() => ''), custom: true, customId: id });
  }

  // Campaign period + Travel dates live on the deal-options slide (always shown
  // there), so they're omitted here to avoid listing the same dates twice.
  // When the PCM combines this into the deal-options slide, Allocation + Payment
  // move there too and this slide is hidden (via hiddenSlides) — render empty so
  // nothing duplicates even if the slide is manually un-hidden.
  const combined = cf?.[`deal.${propId}.combine`] === 'true';
  const visibleRows = combined ? [] : rows.filter((row) => row.key !== 'period' && row.key !== 'travel');

  const hasEdits = cf && Object.keys(cf).some((k) => k.startsWith(`mktg.${propId}.`) && !k.endsWith('.textScale') && !k.endsWith('.showSpend') && !k.endsWith('.customRows') && !k.includes('.custom.'));

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: SANDY_BEIGE }}>
      {/* Header */}
      <div className="px-[5%] pt-[4%] pb-3 flex items-start justify-between">
        <SlideRichText
          fieldKey="mktg.headline"
          customFields={cf}
          onFieldChange={onFieldChange}
          className="font-bold"
          style={{ fontFamily: SLIDE_DISPLAY_STACK, color: OCEAN_TEAL }}
        />
        {onFieldChange && (
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <div className="flex items-center gap-1" title="Scale all table text on this slide">
              <button
                type="button"
                onClick={() => onFieldChange('custom', '', `mktg.${propId}.textScale`, String(Math.max(50, textScale - 10)))}
                className="text-[11px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer"
              >
                A−
              </button>
              <span className="text-[10px] text-gray-500 w-9 text-center tabular-nums">{textScale}%</span>
              <button
                type="button"
                onClick={() => onFieldChange('custom', '', `mktg.${propId}.textScale`, String(Math.min(200, textScale + 10)))}
                className="text-[11px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer"
              >
                A+
              </button>
            </div>
            {uniqueOptions.length > 0 && (
              <button
                type="button"
                onClick={() => onFieldChange('custom', '', `mktg.${propId}.showSpend`, showSpend ? 'false' : 'true')}
                className="text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer whitespace-nowrap"
                title="Add an editable estimated marketing spend row (in the pitch currency), off by default"
              >
                {showSpend ? 'Remove marketing spend' : 'Add marketing spend'}
              </button>
            )}
            {uniqueOptions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  let ids: string[] = [];
                  try {
                    const parsed = JSON.parse(cf?.[`mktg.${propId}.customRows`] ?? '[]');
                    if (Array.isArray(parsed)) ids = parsed.filter((x): x is string => typeof x === 'string');
                  } catch { /* ignore malformed */ }
                  onFieldChange('custom', '', `mktg.${propId}.customRows`, JSON.stringify([...ids, `r${Date.now().toString(36)}`]));
                }}
                className="text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer whitespace-nowrap"
                title="Add a custom row (editable label + a value per option)"
              >
                + Add row
              </button>
            )}
            {uniqueOptions.length > 0 && hasEdits && (
              <button
                type="button"
                onClick={async () => {
                  const keysToRemove = Object.keys(cf!).filter((k) => k.startsWith(`mktg.${propId}.`) && !k.endsWith('.textScale') && !k.endsWith('.showSpend') && !k.endsWith('.customRows') && !k.includes('.custom.'));
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

      {!hasAssets && uniqueOptions.length === 0 ? (
        <div className="flex-1 mx-[5%] mb-[5%] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-400">{t('No marketing assets configured', deck?.renderLocale)}</p>
            <p className="text-[10px] text-gray-300 mt-1">{t('Assets are auto-recommended from deal tier rules (Step 6)', deck?.renderLocale)}</p>
          </div>
        </div>
      ) : (
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
              {visibleRows.map((row, ri) => {
                const rowBg = ri % 2 === 0 ? 'bg-[#EEF3F2]' : 'bg-white';
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
                    <td className={`p-2 font-bold align-top ${rowBg}`} style={{ color: OCEAN_TEAL }}>
                      {row.custom ? (
                        <span className="inline-flex items-start gap-1">
                          <SlideRichText
                            fieldKey={`mktg.${propId}.custom.${row.customId}.label`}
                            defaultValue="New row"
                            defaultSize={baseFont}
                            customFields={cf}
                            onFieldChange={onFieldChange}
                            style={{ color: OCEAN_TEAL, fontWeight: 700 }}
                          />
                          {onFieldChange && (
                            <button
                              type="button"
                              title="Remove this row"
                              onClick={() => {
                                const next = customRowIds.filter((x) => x !== row.customId);
                                onFieldChange('custom', '', `mktg.${propId}.customRows`, JSON.stringify(next));
                                Object.keys(cf ?? {})
                                  .filter((k) => k.startsWith(`mktg.${propId}.custom.${row.customId}.`))
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
                          fieldKey={`mktg.${propId}.${row.key}.opt${optNums[0]}`}
                          defaultValue={row.cells[0]}
                          defaultSize={baseFont}
                          customFields={cf}
                          onFieldChange={onFieldChange}
                          style={{ color: INK, textAlign: 'center' }}
                        />
                      </td>
                    ) : (
                      row.cells.map((cell, ci) => (
                        <td key={ci} className={`p-2 align-top ${rowBg}`}>
                          <SlideRichText
                            fieldKey={`mktg.${propId}.${row.key}.opt${optNums[ci]}`}
                            defaultValue={cell}
                            defaultSize={baseFont}
                            customFields={cf}
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
