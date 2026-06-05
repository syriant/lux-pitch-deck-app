import { useLayoutEffect, useRef, useState } from 'react';
import { type DeckOption, type DeckPropertyFull, type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { TIER_PALETTE, tierBadgeName, isShown, extraGuestFeeBasis, resolveGuestFee } from './tactical-shared';

const NAVY = '#0D2447';
const LIGHT_BG = '#F4F6FA';
const DARK = '#1a1a1a';

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

export function TacticalPackageDetailSlide({ property, option, deck }: Props) {
  const prop = property ?? deck?.properties[0];
  const opt = option ?? prop?.options[0];
  const hotelName = prop?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  // Auto-fit: when the body content would overflow the fixed slide height
  // (expansive rooms/surcharges/inclusions), shrink it uniformly rather than
  // clipping. transform:scale doesn't affect scrollHeight, so measuring is
  // stable. Hooks must run before the early return below.
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const sig = opt
    ? `${opt.id}|${(opt.rooms ?? []).length}|${(opt.surcharges ?? []).length}|${(opt.tacticalDetails?.extraGuestPolicy ?? []).length}|${(opt.inclusions ?? []).length}|${(opt.tacticalDetails?.extraNightInclusions ?? []).length}|${JSON.stringify(opt.tacticalDetails?.hidden ?? {})}`
    : '';
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const content = contentRef.current;
    if (!body || !content) return;
    const avail = body.clientHeight;
    const needed = content.scrollHeight;
    setScale(needed > avail && needed > 0 ? Math.max(0.5, avail / needed) : 1);
  }, [sig]);

  if (!opt || !prop) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-400" style={{ backgroundColor: LIGHT_BG }}>
        Tactical package not configured
      </div>
    );
  }

  const palette = TIER_PALETTE[opt.optionNumber] ?? TIER_PALETTE[1];
  const accent = palette.accent;
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
  const showIncl = isShown(hidden, 'inclusions');
  const showExtraNightIncl = isShown(hidden, 'extraNightInclusions') && extraNightIncl.length > 0;
  const rateCols = (showRoomType ? 1 : 0) + (showAllot ? 1 : 0) + (showOcc ? 1 : 0)
    + (showNettRates ? nightCounts.length : 0) + (showExtraNight ? 1 : 0);
  const showRates = rateCols > 0;
  const showRightCol = showIncl || showExtraNightIncl;

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: LIGHT_BG }}>
      {/* Header band */}
      <div className="relative" style={{ backgroundColor: NAVY, height: 80 }}>
        <div className="absolute left-[4%] top-1/2 -translate-y-1/2 flex items-center">
          <div
            className="px-4 py-2 text-white font-bold text-sm tracking-wide"
            style={{ backgroundColor: accent }}
          >
            ◆ {tierBadgeName(opt)} TACTICAL PACKAGE
          </div>
        </div>
        {showForecast && forecast != null && (
          <div className="absolute right-[4%] top-1/2 -translate-y-1/2 text-right">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: '#A0A8B8' }}>
              Room night forecast
            </div>
            <div className="text-3xl font-bold" style={{ color: accent }}>
              {fmtNumber(forecast)}
            </div>
          </div>
        )}
      </div>

      {/* Body: left tables + right inclusions */}
      <div ref={bodyRef} className="flex-1 px-[4%] pt-8 pb-2 overflow-hidden">
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
            <div className="text-[9px] font-bold text-gray-600 mb-1 tracking-widest">NETT RATES PER PACKAGE</div>
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr>
                  {showRoomType && <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Room Type</th>}
                  {showAllot && <th className="py-1.5 px-2 text-center font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Allot.</th>}
                  {showOcc && <th className="py-1.5 px-2 text-center font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Occ.</th>}
                  {showNettRates && nightCounts.map((n) => (
                    <th key={n} className="py-1.5 px-2 text-right font-bold border border-gray-200 bg-white" style={{ color: DARK }}>
                      {n} Nights{currency ? ` (${currency})` : ''}
                    </th>
                  ))}
                  {showExtraNight && <th className="py-1.5 px-2 text-right font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Extra Night{currency ? ` (${currency})` : ''}</th>}
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr><td colSpan={rateCols} className="py-2 text-center text-gray-400 border border-gray-200">No rooms configured</td></tr>
                ) : rooms.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EDF1F7]'}>
                    {showRoomType && <td className="py-1.5 px-2 border border-gray-200" style={{ color: DARK }}>{r.roomType}</td>}
                    {showAllot && <td className="py-1.5 px-2 text-center border border-gray-200" style={{ color: DARK }}>{r.allotment ?? ''}</td>}
                    {showOcc && <td className="py-1.5 px-2 text-center border border-gray-200" style={{ color: DARK }}>{r.occupancy ?? ''}</td>}
                    {showNettRates && nightCounts.map((n) => {
                      const nr = r.nightRates?.find((x) => x.nights === n);
                      return (
                        <td key={n} className="py-1.5 px-2 text-right border border-gray-200" style={{ color: DARK }}>
                          {fmtNumber(nr?.rate ?? null)}
                        </td>
                      );
                    })}
                    {showExtraNight && <td className="py-1.5 px-2 text-right border border-gray-200" style={{ color: DARK }}>{fmtNumber(r.extraNightRate)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {/* Surcharge Periods */}
          {showSurcharge && (
          <div>
            <div className="text-[9px] font-bold text-gray-600 mb-1 tracking-widest">SURCHARGE PERIODS</div>
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr>
                  <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: DARK }}>From</th>
                  <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: DARK }}>To</th>
                  <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Period</th>
                  <th className="py-1.5 px-2 text-right font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Per Night{currency ? ` (${currency})` : ''}</th>
                </tr>
              </thead>
              <tbody>
                {surcharges.length === 0 ? (
                  <tr><td colSpan={4} className="py-2 text-center text-gray-400 border border-gray-200">No surcharges</td></tr>
                ) : surcharges.map((s, i) => {
                  const { from, to } = splitSurchargeRange(s.name);
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EDF1F7]'}>
                      <td className="py-1.5 px-2 border border-gray-200" style={{ color: DARK }}>{from}</td>
                      <td className="py-1.5 px-2 border border-gray-200" style={{ color: DARK }}>{to}</td>
                      <td className="py-1.5 px-2 border border-gray-200" style={{ color: DARK }}>{s.period ?? ''}</td>
                      <td className="py-1.5 px-2 text-right border border-gray-200" style={{ color: DARK }}>{fmtNumber(s.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          {/* Extra Guest Policy */}
          {showGuests && (
            <div>
              <div className="text-[9px] font-bold text-gray-600 mb-1 tracking-widest">EXTRA GUEST POLICY</div>
              <table className="w-full text-[9px] border-collapse">
                <thead>
                  <tr>
                    <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Guest</th>
                    <th className="py-1.5 px-2 text-center font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Age</th>
                    <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Inclusions</th>
                    <th className="py-1.5 px-2 text-right font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Fee per Night{currency ? ` (${currency})` : ''}</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((g, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EDF1F7]'}>
                      <td className="py-1.5 px-2 border border-gray-200" style={{ color: DARK }}>{g.guest}</td>
                      <td className="py-1.5 px-2 text-center border border-gray-200" style={{ color: DARK }}>{g.age ?? ''}</td>
                      <td className="py-1.5 px-2 border border-gray-200" style={{ color: DARK }}>{g.inclusions ?? ''}</td>
                      <td className="py-1.5 px-2 text-right border border-gray-200" style={{ color: DARK }}>{resolveGuestFee(g, feeBasis)}</td>
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
            <div className="px-3 py-1.5 text-white text-center text-[10px] font-bold tracking-wider" style={{ backgroundColor: accent }}>
              INCLUSIONS
            </div>
            <div className="flex-1 bg-white p-2 overflow-hidden">
              {inclusions4.length === 0 ? (
                <div className="text-[10px] text-gray-400 text-center py-2">No inclusions</div>
              ) : inclusions4.map((item, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <span className="inline-block w-3 h-0.5 flex-shrink-0" style={{ backgroundColor: accent }} />
                  <span className="text-[10px]" style={{ color: DARK }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          )}
          {showExtraNightIncl && (
            <div className="flex-1 flex flex-col">
              <div className="px-3 py-1.5 text-white text-center text-[10px] font-bold tracking-wider" style={{ backgroundColor: accent }}>
                EXTRA NIGHTS
              </div>
              <div className="flex-1 bg-white p-2 overflow-hidden">
                {extraNightIncl.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="inline-block w-3 h-0.5 flex-shrink-0" style={{ backgroundColor: accent }} />
                    <span className="text-[10px]" style={{ color: DARK }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}
        </div>
      </div>

      {/* Footer */}
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
