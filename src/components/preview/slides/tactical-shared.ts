import { type DeckOption, type DeckPropertyFull, type FullDeck } from '@/api/decks.api';

export interface ComparisonRow {
  label: string;
  key: string;
  kind?: 'text' | 'tick';
}

export const INVESTMENT_OVERVIEW_ROWS: ComparisonRow[] = [
  { label: 'Projected Room Nights & Revenue', key: 'Room Nights & Revenue' },
  { label: 'Key Marketing Benefits', key: 'Key Marketing Benefits' },
  { label: 'Secure Bookings with Strong Cancellation Terms and ZERO risk of no-shows', key: 'Cancellation Terms' },
  { label: 'Market Leading Payment Terms', key: 'Payment Terms' },
  { label: 'Access to our LUX Plus Members', key: 'LUX Plus', kind: 'tick' },
];

export const AMPLIFICATION_ROWS: ComparisonRow[] = [
  { label: 'Broadcast quality video of your property to maximise sales', key: 'Broadcast Video', kind: 'tick' },
  { label: 'Celebrity influencer content produced on-site', key: 'Celebrity Influencer', kind: 'tick' },
  { label: 'Inventory', key: 'Inventory' },
  { label: 'Social media amplification', key: 'Social Media Amplification' },
  { label: 'eDM to Luxury Escapes database', key: 'eDM Hero' },
  { label: 'Push Notification to Highest Engaged Luxury Escapes App Users', key: 'Push Notification' },
];

export interface TierRule {
  grade: string;
  tier: number;
  destination: string;
  assetEntitlements: Record<string, string>;
}

export function findRulesByTier(
  rules: TierRule[],
  property: { grade: string | null; destination: string | null },
): Record<number, TierRule | undefined> {
  const out: Record<number, TierRule | undefined> = {};
  if (!property.grade) return out;
  const sameGrade = rules.filter((r) => r.grade === property.grade);
  let matches = sameGrade;
  if (property.destination) {
    const exact = sameGrade.filter((r) => r.destination === property.destination);
    if (exact.length > 0) matches = exact;
    else {
      const partial = sameGrade.filter(
        (r) => property.destination!.toLowerCase().includes(r.destination.toLowerCase())
          || r.destination.toLowerCase().includes(property.destination!.toLowerCase()),
      );
      if (partial.length > 0) matches = partial;
    }
  }
  for (const tier of [1, 2, 3] as const) {
    out[tier] = matches.find((r) => r.tier === tier);
  }
  return out;
}

/**
 * Pick one "owner" row per optionNumber. Tactical-package data lives sparsely
 * across rows that share an optionNumber; prefer the row already carrying it
 * so reads (and the wizard's subsequent writes) stay on the same row even if
 * the DB returns options in a different order across requests.
 */
export function uniqueOptionsByNumber(options: DeckOption[]): DeckOption[] {
  const byOpt = new Map<number, DeckOption[]>();
  for (const o of options) {
    const arr = byOpt.get(o.optionNumber) ?? [];
    arr.push(o);
    byOpt.set(o.optionNumber, arr);
  }
  const picked: DeckOption[] = [];
  for (const rows of byOpt.values()) {
    const withTactical = rows.find(
      (r) => (r.rooms != null && r.rooms.length > 0)
        || (r.tacticalDetails != null && Object.keys(r.tacticalDetails).length > 0),
    );
    picked.push(withTactical ?? rows[0]);
  }
  return picked.sort((a, b) => a.optionNumber - b.optionNumber);
}

const TICK = /^(✓|✔|yes|y|tick|true|included)$/i;
const CROSS = /^(✗|✕|×|no|n|false|excluded|not included)$/i;

export function classifyCellValue(value: string | undefined | null): 'tick' | 'cross' | 'text' | 'empty' {
  if (value === null || value === undefined || value === '') return 'empty';
  const trimmed = String(value).trim();
  if (trimmed === '') return 'empty';
  if (TICK.test(trimmed)) return 'tick';
  if (CROSS.test(trimmed)) return 'cross';
  return 'text';
}

export function resolveComparisonCell(
  opt: DeckOption,
  tierRule: TierRule | undefined,
  row: ComparisonRow,
): string {
  const override = opt.tacticalDetails?.comparisonOverrides?.[row.key];
  if (override !== undefined && override !== '') return override;

  const fromTier = tierRule?.assetEntitlements?.[row.key];
  if (fromTier !== undefined && fromTier !== '') return fromTier;

  if (row.key === 'Room Nights & Revenue') {
    const nights = opt.tacticalDetails?.roomNightForecast;
    if (nights != null) return `${nights.toLocaleString()} room nights`;
  }

  return '';
}

export const TIER_PALETTE: Record<number, { accent: string; badgeLabel: string }> = {
  1: { accent: '#2D62EA', badgeLabel: 'DIAMOND' },
  2: { accent: '#7A4FE7', badgeLabel: 'PLATINUM' },
  3: { accent: '#E68A2E', badgeLabel: 'GOLD' },
};

export function tierBadgeName(opt: DeckOption): string {
  return (opt.tierLabel ?? TIER_PALETTE[opt.optionNumber]?.badgeLabel ?? `OPTION ${opt.optionNumber}`).toUpperCase();
}

/**
 * Toggleable elements on the Single Page (Tactical Package Detail) slide.
 * Order is the order shown in the wizard's "Show on slide" controls. Every
 * element renders unless `tacticalDetails.hidden[id]` is true.
 */
export const SINGLE_PAGE_ELEMENTS: Array<{ id: string; label: string }> = [
  { id: 'forecast', label: 'Room night forecast' },
  { id: 'roomType', label: 'Room Type column' },
  { id: 'allotment', label: 'Allotment column' },
  { id: 'occupancy', label: 'Occupancy column' },
  { id: 'nettRates', label: 'Nett rate columns' },
  { id: 'extraNight', label: 'Extra Night column' },
  { id: 'surchargePeriods', label: 'Surcharge Periods' },
  { id: 'extraGuestPolicy', label: 'Extra Guest Policy' },
  { id: 'inclusions', label: 'Inclusions' },
  { id: 'extraNightInclusions', label: 'Extra Night Inclusions' },
];

/** True when the element should render (i.e. not flagged hidden). */
export function isShown(hidden: Record<string, boolean> | undefined, id: string): boolean {
  return !hidden?.[id];
}

export function rulesFromDeck(deck: FullDeck, prop: DeckPropertyFull | undefined) {
  if (!prop) return {} as Record<number, TierRule | undefined>;
  return findRulesByTier((deck.dealTierRules ?? []) as TierRule[], { grade: prop.grade, destination: prop.destination });
}
