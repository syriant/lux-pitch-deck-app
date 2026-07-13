import { useLayoutEffect, useRef, useState } from 'react';
import { type DeckOption, type DeckPropertyFull, type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { TIER_PALETTE, tierBadgeName, isShown, extraGuestFeeBasis, resolveGuestFee, tacticalTableSize, tacticalTableSizeKey } from './tactical-shared';
import { t, dateLocaleTag } from '../labels';
import { translateInclusion } from '../i18n';
import { FontSizeControl } from '../FontSizeControl';
import { SlideRichText } from '../SlideRichText';
import { OCEAN_TEAL, SANDY_BEIGE, INK, TEAL_100, TEAL_400 } from '../brand';

/** True when a hex colour is light enough to need dark (not white) text on it. */
function isLightHex(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140; // perceived luminance
}

interface Props {
  property?: DeckPropertyFull;
  option?: DeckOption;
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

function fmtNumber(n: number | null | undefined): string {
  if (n == null) return '';
  return n.toLocaleString();
}

/**
 * Surcharge `name` from the parser is either a date range like "19-Sep-26 to
 * 01-Oct-26" (seasonal) or a single label like "Saturday" (day-of-week).
 * Splits on " to ", " - ", "→", or "—"; single values land in From with To blank.
 */
function splitSurchargeRange(raw: string | undefined | null): { from: string; to: string } {
  if (!raw) return { from: '', to: '' };
  const m = String(raw).split(/\s+(?:to|-|–|—|→)\s+/i);
  if (m.length >= 2) return { from: m[0].trim(), to: m[1].trim() };
  return { from: raw.trim(), to: '' };
}

export function TacticalPackageDetailSlide({ property, option, deck, onFieldChange }: Props) {
  const prop = property ?? deck?.properties[0];
  const opt = option ?? prop?.options[0];
  const locale = deck?.renderLocale;
  const hotelName = prop?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString(dateLocaleTag(deck?.renderLocale), { day: 'numeric', month: 'long', year: 'numeric' });
  const cf = { ...deck?.templateDefaults, ...deck?.customFields };

  // Auto-fit: when the body content would overflow the fixed slide height
  // (expansive rooms/surcharges/inclusions), shrink it uniformly rather than
  // clipping. transform:scale doesn't affect scrollHeight, so measuring is
  // stable. Hooks must run before the early return below.
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const sig = opt
    ? `${opt.id}|${(opt.rooms ?? []).length}|${(opt.surcharges ?? []).length}|${(opt.blackoutDates ?? []).length}|${(opt.tacticalDetails?.extraGuestPolicy ?? []).length}|${(opt.inclusions ?? []).length}|${(opt.tacticalDetails?.extraNightInclusions ?? []).length}|${JSON.stringify(opt.tacticalDetails?.hidden ?? {})}`
    : '';
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const content = contentRef.current;
    if (!body || !content) return;
    const avail = body.clientHeight;
    const needed = content.scrollHeight;
    // Floor at 0.4 (not 0.5) so a dense package shrinks far enough to keep every
    // section visible — including Blackout Dates — rather than clipping the tail.
    // Mirrors the PPTX export, which now shrinks font/rows to fit all sections.
    setScale(needed > avail && needed > 0 ? Math.max(0.4, avail / needed) : 1);
  }, [sig]);

  if (!opt || !prop) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-400" style={{ backgroundColor: SANDY_BEIGE }}>
        {t('Tactical package not configured', locale)}
      </div>
    );
  }

  const palette = TIER_PALETTE[opt.optionNumber] ?? TIER_PALETTE[1];
  const accent = palette.accent;
  // The header badge sits on the fixed Ocean Teal band. Diamond's accent IS
  // Ocean Teal, so its badge would vanish — lift it to a lighter teal. Platinum
  // and Gold already contrast, so they keep their accent.
  const badgeFill = accent === OCEAN_TEAL ? TEAL_400 : accent;
  // Text on an accent fill and the keyline dashes must stay legible whatever the
  // tier colour is: dark accents get white text + accent-coloured dashes; a light
  // accent would flip to dark (Ink) text and dark dashes.
  const onAccent = isLightHex(accent) ? INK : '#FFFFFF';
  const keyline = isLightHex(accent) ? INK : accent;
  const rooms = opt.rooms ?? [];
  // Union of night-count columns across all rooms, sorted ascending.
  const nightCounts = Array.from(
    new Set((rooms ?? []).flatMap((r) => (r.nightRates ?? []).map((x) => x.nights))),
  ).sort((a, b) => a - b);
  const surcharges = opt.surcharges ?? [];
  const guests = opt.tacticalDetails?.extraGuestPolicy ?? [];
  const inclusions4 = opt.inclusions ?? [];
  const extraNightIncl = opt.tacticalDetails?.extraNightInclusions ?? [];
  const forecast = opt.tacticalDetails?.roomNightForecast;
  const currency = rooms[0]?.currency ?? '';

  // Per-package element visibility (default shown).
  const hidden = opt.tacticalDetails?.hidden;
  const showForecast = isShown(hidden, 'forecast');
  const showRoomType = isShown(hidden, 'roomType');
  const showAllot = isShown(hidden, 'allotment');
  const showOcc = isShown(hidden, 'occupancy');
  const showNettRates = isShown(hidden, 'nettRates');
  const showExtraNight = isShown(hidden, 'extraNight');
  const showSurcharge = isShown(hidden, 'surchargePeriods');
  const showGuests = isShown(hidden, 'extraGuestPolicy') && guests.length > 0;
  const feeBasis = extraGuestFeeBasis(deck?.customFields);
  // Per-package table text size, adjustable inline on the slide (default 9).
  const tablePx = tacticalTableSize(deck?.customFields, opt.id);
  const showIncl = isShown(hidden, 'inclusions');
  const showExtraNightIncl = isShown(hidden, 'extraNightInclusions') && extraNightIncl.length > 0;
  const rateCols = (showRoomType ? 1 : 0) + (showAllot ? 1 : 0) + (showOcc ? 1 : 0)
    + (showNettRates ? nightCounts.length : 0) + (showExtraNight ? 1 : 0);
  const showRates = rateCols > 0;
  const showRightCol = showIncl || showExtraNightIncl;

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: SANDY_BEIGE }}>
      {/* Header band */}
      <div className="relative" style={{ backgroundColor: OCEAN_TEAL, height: 80 }}>
        <div className="absolute left-[4%] top-1/2 -translate-y-1/2 flex items-center">
          <div
            className="px-4 py-2 font-bold text-sm tracking-wide"
            style={{ backgroundColor: badgeFill, color: onAccent }}
          >
            ◆ {t(tierBadgeName(opt), locale)} {t('TACTICAL PACKAGE', locale)}
          </div>
        </div>
        {showForecast && forecast != null && (
          <div className="absolute right-[4%] top-1/2 -translate-y-1/2 text-right">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: TEAL_100 }}>
              {t('Room night forecast', locale)}
            </div>
            {/* White, not the tier accent: the header band is a fixed Ocean
                Teal, so a teal-family accent (Diamond/Platinum) would vanish
                into it. */}
            <div className="text-3xl font-bold text-white">
              {fmtNumber(forecast)}
            </div>
          </div>
        )}
      </div>

      {/* Body: left tables + right inclusions */}
      <div ref={bodyRef} className="group relative flex-1 px-[4%] pt-8 pb-2 overflow-hidden">
        {onFieldChange && (
          <div className="absolute top-1 right-[4%] z-20 flex items-center gap-1 rounded bg-black/60 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-[10px] text-white/70">Table text</span>
            <FontSizeControl fieldKey={tacticalTableSizeKey(opt.id)} size={tablePx} min={4} max={16} step={0.5} onFieldChange={onFieldChange} />
          </div>
        )}
        <div
          ref={contentRef}
          className="flex gap-3"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
        >
        {/* Left column — 60% */}
        <div className="flex flex-col gap-3" style={{ flexBasis: showRightCol ? '58%' : '100%' }}>
          {/* Nett Rates */}
          {showRates && (
          <div>
            <div className="font-bold text-gray-600 mb-1 tracking-widest" style={{ fontSize: tablePx }}>{t('NETT RATES PER PACKAGE', locale)}</div>
            <table className="w-full border-collapse" style={{ fontSize: tablePx }}>
              <thead>
                <tr>
                  {showRoomType && <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: INK }}>{t('Room Type', locale)}</th>}
                  {showAllot && <th className="py-1.5 px-2 text-center font-bold border border-gray-200 bg-white" style={{ color: INK }}>{t('Allot.', locale)}</th>}
                  {showOcc && <th className="py-1.5 px-2 text-center font-bold border border-gray-200 bg-white" style={{ color: INK }}>{t('Occ.', locale)}</th>}
                  {showNettRates && nightCounts.map((n) => (
                    <th key={n} className="py-1.5 px-2 text-right font-bold border border-gray-200 bg-white" style={{ color: INK }}>
                      {n} {t('Nights', locale)}{currency ? ` (${currency})` : ''}
                    </th>
                  ))}
                  {showExtraNight && <th className="py-1.5 px-2 text-right font-bold border border-gray-200 bg-white" style={{ color: INK }}>{t('Extra Night', locale)}{currency ? ` (${currency})` : ''}</th>}
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr><td colSpan={rateCols} className="py-2 text-center text-gray-400 border border-gray-200">{t('No rooms configured', deck?.renderLocale)}</td></tr>
                ) : rooms.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EEF3F2]'}>
                    {showRoomType && <td className="py-1.5 px-2 border border-gray-200" style={{ color: INK }}>{r.roomType}</td>}
                    {showAllot && <td className="py-1.5 px-2 text-center border border-gray-200" style={{ color: INK }}>{r.allotment ?? ''}</td>}
                    {showOcc && <td className="py-1.5 px-2 text-center border border-gray-200" style={{ color: INK }}>{r.occupancy ?? ''}</td>}
                    {showNettRates && nightCounts.map((n) => {
                      const nr = r.nightRates?.find((x) => x.nights === n);
                      return (
                        <td key={n} className="py-1.5 px-2 text-right border border-gray-200" style={{ color: INK }}>
                          {fmtNumber(nr?.rate ?? null)}
                        </td>
                      );
                    })}
                    {showExtraNight && <td className="py-1.5 px-2 text-right border border-gray-200" style={{ color: INK }}>{fmtNumber(r.extraNightRate)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {/* Surcharge Periods */}
          {showSurcharge && (
          <div>
            <div className="font-bold text-gray-600 mb-1 tracking-widest" style={{ fontSize: tablePx }}>{t('SURCHARGE PERIODS', locale)}</div>
            <table className="w-full border-collapse" style={{ fontSize: tablePx }}>
              <thead>
                <tr>
                  <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: INK }}>{t('From', locale)}</th>
                  <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: INK }}>{t('To', locale)}</th>
                  <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: INK }}>{t('Period', locale)}</th>
                  <th className="py-1.5 px-2 text-right font-bold border border-gray-200 bg-white" style={{ color: INK }}>{t('Per Night', locale)}{currency ? ` (${currency})` : ''}</th>
                </tr>
              </thead>
              <tbody>
                {surcharges.length === 0 ? (
                  <tr><td colSpan={4} className="py-2 text-center text-gray-400 border border-gray-200">{t('No surcharges', deck?.renderLocale)}</td></tr>
                ) : surcharges.map((s, i) => {
                  const { from, to } = splitSurchargeRange(s.name);
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EEF3F2]'}>
                      <td className="py-1.5 px-2 border border-gray-200" style={{ color: INK }}>{from}</td>
                      <td className="py-1.5 px-2 border border-gray-200" style={{ color: INK }}>{to}</td>
                      <td className="py-1.5 px-2 border border-gray-200" style={{ color: INK }}>{s.period ?? ''}</td>
                      <td className="py-1.5 px-2 text-right border border-gray-200" style={{ color: INK }}>{fmtNumber(s.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          {/* Blackout Dates */}
          {opt.blackoutDates && opt.blackoutDates.length > 0 && (
            <div>
              <div className="font-bold text-gray-600 mb-1 tracking-widest" style={{ fontSize: tablePx }}>{t('BLACKOUT DATES', locale)}</div>
              <table className="w-full border-collapse" style={{ fontSize: tablePx }}>
                <tbody>
                  {opt.blackoutDates.map((b, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EEF3F2]'}>
                      <td className="py-1.5 px-2 border border-gray-200" style={{ color: INK }}>
                        {b.to && b.to !== b.from ? `${b.from} – ${b.to}` : b.from}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Extra Guest Policy */}
          {showGuests && (
            <div>
              <div className="font-bold text-gray-600 mb-1 tracking-widest" style={{ fontSize: tablePx }}>{t('EXTRA GUEST POLICY', locale)}</div>
              <table className="w-full border-collapse" style={{ fontSize: tablePx }}>
                <thead>
                  <tr>
                    <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: INK }}>{t('Guest', locale)}</th>
                    <th className="py-1.5 px-2 text-center font-bold border border-gray-200 bg-white" style={{ color: INK }}>{t('Age', locale)}</th>
                    <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: INK }}>{t('Inclusions', locale)}</th>
                    <th className="py-1.5 px-2 text-right font-bold border border-gray-200 bg-white" style={{ color: INK }}>{t('Fee per Night', locale)}{currency ? ` (${currency})` : ''}</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((g, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EEF3F2]'}>
                      <td className="py-1.5 px-2 border border-gray-200" style={{ color: INK }}>{g.guest}</td>
                      <td className="py-1.5 px-2 text-center border border-gray-200" style={{ color: INK }}>{g.age ?? ''}</td>
                      <td className="py-1.5 px-2 border border-gray-200" style={{ color: INK }}>{g.inclusions ?? ''}</td>
                      <td className="py-1.5 px-2 text-right border border-gray-200" style={{ color: INK }}>{resolveGuestFee(g, feeBasis)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column — 40% */}
        {showRightCol && (
        <div className="flex gap-2" style={{ flexBasis: '40%' }}>
          {showIncl && (
          <div className="flex-1 flex flex-col">
            <div className="px-3 py-1.5 text-center text-[10px] font-bold tracking-wider" style={{ backgroundColor: badgeFill, color: onAccent }}>
              {t('INCLUSIONS', locale)}
            </div>
            <div className="flex-1 bg-white p-2 overflow-hidden">
              {inclusions4.length === 0 ? (
                <div className="text-[10px] text-gray-400 text-center py-2">{t('No inclusions', deck?.renderLocale)}</div>
              ) : inclusions4.map((item, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <span className="inline-block w-3 h-0.5 flex-shrink-0" style={{ backgroundColor: keyline }} />
                  <span className="text-[10px]" style={{ color: INK }}>{translateInclusion(item, cf)}</span>
                </div>
              ))}
            </div>
          </div>
          )}
          {showExtraNightIncl && (
            <div className="flex-1 flex flex-col">
              <div className="px-3 py-1.5 text-center text-[10px] font-bold tracking-wider" style={{ backgroundColor: badgeFill, color: onAccent }}>
                {t('EXTRA NIGHTS', locale)}
              </div>
              <div className="flex-1 bg-white p-2 overflow-hidden">
                {extraNightIncl.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="inline-block w-3 h-0.5 flex-shrink-0" style={{ backgroundColor: keyline }} />
                    <span className="text-[10px]" style={{ color: INK }}>{translateInclusion(item, cf)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}
        </div>
      </div>

      {/* Rates footnote/clause — shared with the side-by-side (deal.disclaimer) */}
      <div className="px-[4%] pb-1">
        <SlideRichText
          fieldKey="deal.disclaimer"
          customFields={cf}
          onFieldChange={onFieldChange}
          style={{ color: '#333' }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-[3%] py-2 bg-white/70 mt-auto">
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
