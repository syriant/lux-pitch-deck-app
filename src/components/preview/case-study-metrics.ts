import { t } from './labels';

/**
 * Case-study metric fields a narrative can reference, in whichever form the API
 * returns them (decimals arrive as strings).
 */
export interface CaseStudyMetricSource {
  roomNights?: number | null;
  revenue?: string | number | null;
  adr?: string | number | null;
  alos?: string | number | null;
  leadTime?: number | null;
  bookings?: number | null;
  packagesSold?: number | null;
  upgradePercentage?: string | number | null;
}

/**
 * The narrative placeholder tokens a case study exposes, and how they render.
 * Kept in sync with the API's buildCaseStudyMetricVars (placeholders.ts) so the
 * preview and PPTX/PDF export substitute identically.
 */
export const CASE_STUDY_METRIC_TOKENS = [
  'revenue',
  'room_nights',
  'bookings',
  'packages_sold',
  'adr',
  'alos',
  'lead_time',
  'upgrade_percentage',
] as const;

/**
 * Formatted metric tokens for one case study: {revenue} → "$8,317,434",
 * {adr} → "$323", {room_nights} → "32,407", {upgrade_percentage} → "82.9%",
 * {alos} → "6.4". Missing metrics collapse to '' so the token disappears.
 */
const n = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = typeof v === 'number' ? v : parseFloat(v);
  return Number.isNaN(x) ? null : x;
};

export function buildCaseStudyMetricVars(cs: CaseStudyMetricSource): Record<string, string> {
  const money = (v: string | number | null | undefined) => {
    const x = n(v);
    return x === null ? '' : `$${Math.round(x).toLocaleString('en-US')}`;
  };
  const int = (v: string | number | null | undefined) => {
    const x = n(v);
    return x === null ? '' : Math.round(x).toLocaleString('en-US');
  };
  const pct = (v: string | number | null | undefined) => {
    const x = n(v);
    return x === null ? '' : `${x.toFixed(1)}%`;
  };
  const dec1 = (v: string | number | null | undefined) => {
    const x = n(v);
    return x === null ? '' : x.toFixed(1);
  };
  return {
    revenue: money(cs.revenue),
    adr: money(cs.adr),
    room_nights: int(cs.roomNights),
    bookings: int(cs.bookings),
    packages_sold: int(cs.packagesSold),
    alos: dec1(cs.alos),
    lead_time: int(cs.leadTime),
    upgrade_percentage: pct(cs.upgradePercentage),
  };
}

/**
 * One stat tile on the case-study card (Post Campaign Report look). `label`
 * and `sub` are English keys the renderer passes through t(); `value` is
 * preformatted (unit words already localized via `locale`). Mirrored in the
 * API's placeholders.ts so preview and PPTX render identically.
 */
export interface CaseStudyStatTile {
  key: string;
  label: string;
  value: string;
  sub: string;
}

/** Tiles for the metrics a case study actually has, in report order (max 6). */
export function buildCaseStudyStatTiles(cs: CaseStudyMetricSource, locale?: string | null): CaseStudyStatTile[] {
  const tiles: CaseStudyStatTile[] = [];
  const rn = n(cs.roomNights);
  if (rn !== null) {
    tiles.push({ key: 'roomNights', label: 'Room nights sold', value: Math.round(rn).toLocaleString('en-US'), sub: 'Total' });
  }
  const rev = n(cs.revenue);
  if (rev !== null) {
    const compact = rev >= 1_000_000;
    tiles.push({
      key: 'revenue',
      label: 'Total revenue',
      value: compact ? `$${(rev / 1_000_000).toFixed(1)}M` : `$${Math.round(rev).toLocaleString('en-US')}`,
      sub: compact ? `$${Math.round(rev).toLocaleString('en-US')}` : 'AUD',
    });
  }
  const alos = n(cs.alos);
  if (alos !== null) {
    tiles.push({ key: 'alos', label: 'Avg length of stay', value: `${alos.toFixed(1)} ${t('nights', locale)}`, sub: 'Per booking' });
  }
  const lead = n(cs.leadTime);
  if (lead !== null) {
    tiles.push({ key: 'leadTime', label: 'Avg lead time', value: `${Math.round(lead).toLocaleString('en-US')} ${t('days', locale)}`, sub: 'Booking in advance' });
  }
  const upgrade = n(cs.upgradePercentage);
  if (upgrade !== null) {
    tiles.push({ key: 'upgrade', label: 'Upgrade rate', value: `${upgrade.toFixed(1)}%`, sub: 'Packages with upgrades' });
  }
  const adr = n(cs.adr);
  if (adr !== null) {
    tiles.push({ key: 'adr', label: 'ADR', value: adr % 1 ? `$${adr.toFixed(2)}` : `$${adr.toLocaleString('en-US')}`, sub: 'Average daily rate' });
  }
  return tiles;
}
