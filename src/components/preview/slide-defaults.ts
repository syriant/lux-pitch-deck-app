/**
 * Centralized factory defaults for static-key slide text.
 *
 * Resolution chain at render time:
 *   1. deck.customFields[fieldKey]      — PCM's per-deck overrides
 *   2. deck.templateDefaults[fieldKey]  — admin's template-level overrides
 *   3. SLIDE_DEFAULTS[fieldKey]         — factory default (this file)
 *   4. SlideRichText defaultValue prop  — slide-component fallback (for interpolated/dynamic keys)
 *
 * Only static keys (those without per-deck IDs interpolated into them) live here.
 * Dynamic keys like `region.{propId}.narrative` and interpolated defaults
 * (e.g. those that splice in `${destination}`) remain inline in slide components.
 */

export interface SlideDefault {
  value: string;
  size?: number;
}

export const SLIDE_DEFAULTS: Record<string, SlideDefault> = {
  // ─── Cover ───────────────────────────────────────────────────────────
  'cover.hookText': {
    value: "There are more travelers than ever. And they've never been harder to reach.",
    size: 45,
  },

  // ─── Differentiators (fallback items when deck has none) ─────────────
  'diff.title.default-0': { value: 'High-Value Customers', size: 14 },
  'diff.desc.default-0': {
    value: 'Access more than 9 million engaged Luxury Escapes members: high-spending travellers looking for inspiration',
    size: 10,
  },
  'diff.title.default-1': { value: 'Reach New Customers', size: 14 },
  'diff.desc.default-1': {
    value: "More than 90% of Luxury Escapes members weren't planning to stay at the hotel they booked until they discovered it on Luxury Escapes",
    size: 10,
  },
  'diff.title.default-2': { value: 'Multi-Channel Marketing', size: 14 },
  'diff.desc.default-2': {
    value: 'Exclusive access to 360-degree media assets that amplify your brand across social, email, push, and web',
    size: 10,
  },
  'diff.title.default-3': { value: 'Tailored Campaigns', size: 14 },
  'diff.desc.default-3': {
    value: 'Our in-house team of world-class writers, editors, designers and videographers will create an incredible campaign',
    size: 10,
  },

  // ─── Reach ───────────────────────────────────────────────────────────
  'reach.title': { value: 'Our reach', size: 18 },
  'reach.subtitle': { value: '9 million members globally trust Luxury Escapes', size: 11 },
  'reach.North America': { value: '1.1M+' },
  'reach.United Kingdom': { value: '700k+' },
  'reach.Europe': { value: '180k+' },
  'reach.Middle East': { value: '50k+' },
  'reach.India': { value: '1M+' },
  'reach.Asia': { value: '400k' },
  'reach.Australia': { value: '5M+' },
  'reach.New Zealand': { value: '400k+' },

  // ─── Demographics ────────────────────────────────────────────────────
  'demo.headline': {
    value: "With our <mark style='background-color:#00b2a0;color:#ffffff;padding:0 2px;border-radius:2px'>affluent and engaged</mark> customers turn inspiration into bookings",
    size: 33,
  },
  'demo.subheadline': {
    value: 'Our demographic intelligence reveals who our customers are, how they travel, and what inspires them to book.',
    size: 17,
  },
  'demo.segment.0': { value: 'Couples at the peak of their careers with a high disposable income', size: 14 },
  'demo.segment.1': { value: 'Young families with a desire for premium experiences', size: 14 },
  'demo.segment.2': { value: 'Empty-nesters spoiling themselves with luxurious holidays', size: 14 },
  'demo.segment.3': { value: 'Avid travelers taking 2-4 trips a year', size: 14 },
  'demo.audienceTitle': { value: 'Access our loyal audience:', size: 20 },
  'demo.stat1': {
    value: "95% of our members weren't planning to stay at the hotel they booked and 63% weren't planning on visiting the destination until we put it in front of them.",
    size: 15,
  },
  'demo.stat2': {
    value: "Try something new: Only 2.5% would have purchased directly from the hotel's site",
    size: 15,
  },

  // ─── Objectives ──────────────────────────────────────────────────────
  'obj.headline': {
    value: "We create <mark style='background-color:#00b2a0;color:#ffffff;padding:0 2px;border-radius:2px'>tailored tactical campaigns</mark><br>to achieve your specific key objectives",
    size: 28,
  },
  'obj.primary.title': { value: 'Primary Objective', size: 18 },
  'obj.secondary.title': { value: 'Secondary Objectives', size: 18 },

  // ─── Campaign Options Overview ───────────────────────────────────────
  'campOpt.headline': { value: 'Your tailored campaign options', size: 28 },
  'campOpt.footer': {
    value: "<strong>Rates provided are inclusive of taxes and fees, and Luxury Escapes' marketing investment.</strong>",
    size: 14,
  },

  // ─── Deal Options ────────────────────────────────────────────────────
  'deal.headline': { value: 'Your tailored campaign options', size: 20 },
  'deal.disclaimer': {
    value: "<strong>Rates provided are inclusive of taxes and fees, and Luxury Escapes' marketing investment.</strong>",
    size: 9,
  },

  // ─── Marketing Assets ────────────────────────────────────────────────
  'mktg.headline': { value: 'Your tailored campaign options', size: 20 },
  'mktg.disclaimer': {
    value: "<strong>Rates provided are inclusive of taxes and fees, and Luxury Escapes' marketing investment.</strong>",
    size: 9,
  },

  // ─── Market Challenges ───────────────────────────────────────────────
  'market-challenges.headline': { value: 'Market Challenges', size: 24 },
  'market-challenges.subheadline': {
    value: 'Key challenges facing your property in the current landscape',
    size: 14,
  },
  'market-challenges.item.0': {
    value: 'Increasing competition from alternative accommodation platforms',
    size: 13,
  },
  'market-challenges.item.1': {
    value: 'Rising customer acquisition costs across traditional channels',
    size: 13,
  },
  'market-challenges.item.2': {
    value: 'Seasonal demand fluctuations impacting occupancy rates',
    size: 13,
  },
  'market-challenges.item.3': {
    value: 'Need for differentiated positioning in a crowded market',
    size: 13,
  },
};

/** Look up the factory default text for a fieldKey. Returns empty string if missing. */
export function getDefaultText(fieldKey: string): string {
  return SLIDE_DEFAULTS[fieldKey]?.value ?? '';
}

/** Look up the factory default font size for a fieldKey. Returns undefined if missing. */
export function getDefaultSize(fieldKey: string): number | undefined {
  return SLIDE_DEFAULTS[fieldKey]?.size;
}
