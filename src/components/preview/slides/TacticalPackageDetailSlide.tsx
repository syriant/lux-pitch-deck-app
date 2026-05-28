import { type DeckOption, type DeckPropertyFull, type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { TIER_PALETTE, tierBadgeName } from './tactical-shared';

const NAVY = '#0D2447';
const LIGHT_BG = '#F4F6FA';
const DARK = '#1a1a1a';

interface Props {
  property?: DeckPropertyFull;
  option?: DeckOption;
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
        {forecast != null && (
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

      {/* Date pills */}
      <div className="flex gap-3 px-[4%] py-3">
        <div className="flex items-stretch flex-1 max-w-[45%]">
          <div className="w-1.5" style={{ backgroundColor: accent }} />
          <div className="px-3 py-1.5 bg-white flex-1">
            <div className="text-[8px] uppercase tracking-wider text-gray-500 font-bold">Campaign Dates</div>
            <div className="text-[11px] font-bold" style={{ color: DARK }}>
              {fmtDateRange(deck?.campaignStart ?? null, deck?.campaignEnd ?? null)}
            </div>
          </div>
        </div>
        <div className="flex items-stretch flex-1 max-w-[45%]">
          <div className="w-1.5" style={{ backgroundColor: accent }} />
          <div className="px-3 py-1.5 bg-white flex-1">
            <div className="text-[8px] uppercase tracking-wider text-gray-500 font-bold">Travel Period</div>
            <div className="text-[11px] font-bold" style={{ color: DARK }}>
              {fmtDateRange(deck?.travelStart ?? null, deck?.travelEnd ?? null)}
            </div>
          </div>
        </div>
      </div>

      {/* Body: left tables + right inclusions */}
      <div className="flex-1 flex gap-3 px-[4%] pb-2 overflow-hidden">
        {/* Left column — 60% */}
        <div className="flex flex-col gap-3" style={{ flexBasis: '58%' }}>
          {/* Nett Rates */}
          <div>
            <div className="text-[9px] font-bold text-gray-600 mb-1 tracking-widest">NETT RATES PER PACKAGE</div>
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr>
                  <th className="py-1.5 px-2 text-left font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Room Type</th>
                  <th className="py-1.5 px-2 text-center font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Allot.</th>
                  <th className="py-1.5 px-2 text-center font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Occ.</th>
                  {nightCounts.map((n) => (
                    <th key={n} className="py-1.5 px-2 text-right font-bold border border-gray-200 bg-white" style={{ color: DARK }}>
                      {n} Nights{currency ? ` (${currency})` : ''}
                    </th>
                  ))}
                  <th className="py-1.5 px-2 text-right font-bold border border-gray-200 bg-white" style={{ color: DARK }}>Extra Night{currency ? ` (${currency})` : ''}</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr><td colSpan={4 + nightCounts.length} className="py-2 text-center text-gray-400 border border-gray-200">No rooms configured</td></tr>
                ) : rooms.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EDF1F7]'}>
                    <td className="py-1.5 px-2 border border-gray-200" style={{ color: DARK }}>{r.roomType}</td>
                    <td className="py-1.5 px-2 text-center border border-gray-200" style={{ color: DARK }}>{r.allotment ?? ''}</td>
                    <td className="py-1.5 px-2 text-center border border-gray-200" style={{ color: DARK }}>{r.occupancy ?? ''}</td>
                    {nightCounts.map((n) => {
                      const nr = r.nightRates?.find((x) => x.nights === n);
                      return (
                        <td key={n} className="py-1.5 px-2 text-right border border-gray-200" style={{ color: DARK }}>
                          {fmtNumber(nr?.rate ?? null)}
                        </td>
                      );
                    })}
                    <td className="py-1.5 px-2 text-right border border-gray-200" style={{ color: DARK }}>{fmtNumber(r.extraNightRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Surcharge Periods */}
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

          {/* Extra Guest Policy */}
          {guests.length > 0 && (
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
                      <td className="py-1.5 px-2 text-right border border-gray-200" style={{ color: DARK }}>{g.feeLabel ?? (g.feePerNight != null ? fmtNumber(g.feePerNight) : '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column — 40% */}
        <div className="flex gap-2" style={{ flexBasis: '40%' }}>
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
          {extraNightIncl.length > 0 && (
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
