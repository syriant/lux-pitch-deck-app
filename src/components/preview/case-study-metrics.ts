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
export function buildCaseStudyMetricVars(cs: CaseStudyMetricSource): Record<string, string> {
  const n = (v: string | number | null | undefined): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const x = typeof v === 'number' ? v : parseFloat(v);
    return Number.isNaN(x) ? null : x;
  };
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
