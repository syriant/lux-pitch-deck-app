/*
 * Rate lines for the NETT / sell rows on the deal-options table (KP, v2.0.1).
 *
 * A room type priced at several stay lengths used to get one line per length:
 *
 *   Centennial King 2N – $399
 *   Centennial King 3N – $591
 *
 * which pushed long room lists off the slide. Stay lengths for the same room
 * type now collapse onto a single line:
 *
 *   Centennial King – $399 (2N), $591 (3N)
 *
 * A room type with only one stay length keeps the original wording, so decks
 * without repeated room types read exactly as they did before.
 *
 * Mirrored in the API at src/modules/export/rate-lines.ts — keep in sync.
 */
import { sortRoomsGrouped } from './room-sort';
import { formatMoney } from './currency';
import { t } from './labels';

interface RateRow {
  roomType: string | null;
  nights?: number | null;
}

interface RateLineOptions {
  /** Also show the equivalent per-night rate (deal.showPerNight). */
  showPerNight?: boolean;
  locale?: string;
}

export function buildRateLines<T extends RateRow>(
  rooms: T[],
  price: (r: T) => string | number | null | undefined,
  currency: string | null | undefined,
  { showPerNight = false, locale }: RateLineOptions = {},
): string[] {
  const sorted = sortRoomsGrouped(rooms, price);
  const fallbackLabel = t('Room', locale);
  const perNightWord = t('per night', locale);
  const lines: string[] = [];

  let i = 0;
  while (i < sorted.length) {
    const label = sorted[i].roomType ?? fallbackLabel;
    // sortRoomsGrouped keeps a room type's stay lengths adjacent and in
    // ascending night order, so the group is a contiguous run.
    let end = i;
    while (end < sorted.length && (sorted[end].roomType ?? fallbackLabel) === label) end++;
    const group = sorted.slice(i, end);
    i = end;

    // An option group can hold several rows with the same room + stay length
    // (one per package/event); collapse identical priced stays.
    const stays: Array<{ nights: number; money: string; perNight: string | null }> = [];
    const seen = new Set<string>();
    for (const r of group) {
      const money = formatMoney(price(r), currency) ?? '?';
      const nights = r.nights && r.nights > 0 ? r.nights : 1;
      const key = `${nights}|${money}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // formatMoney returned "?" above when the price is missing — don't derive
      // a "$0 per night" from it (Number(null) is 0).
      const raw = price(r);
      const amount = raw === null || raw === undefined || raw === '' ? NaN : Number(raw);
      const perNight = showPerNight && nights > 1 && Number.isFinite(amount)
        ? formatMoney(amount / nights, currency)
        : null;
      stays.push({ nights, money, perNight });
    }
    if (stays.length === 0) continue;

    if (stays.length === 1) {
      const [only] = stays;
      if (only.nights > 1) {
        lines.push(only.perNight
          ? `${label} ${only.nights}N – ${only.money} (${only.perNight} ${perNightWord})`
          : `${label} ${only.nights}N – ${only.money}`);
      } else {
        lines.push(`${label} – ${only.money} ${perNightWord}`);
      }
      continue;
    }

    const parts = stays.map((s) => (s.perNight
      ? `${s.money} (${s.nights}N, ${s.perNight} ${perNightWord})`
      : `${s.money} (${s.nights}N)`));
    lines.push(`${label} – ${parts.join(', ')}`);
  }

  return lines;
}
