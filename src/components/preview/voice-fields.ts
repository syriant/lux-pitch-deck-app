/**
 * Mirrors the backend's field classifier (api: src/modules/voice-rewrite/
 * field-context.ts) to decide which editable fields surface the "LUX voice"
 * action. The endpoint enforces the same rules, so a drift here only hides or
 * reveals the button — it can never let an excluded field through.
 *
 * Eligible = a prose field (headline / subheadline / body / narrative / bullet
 * / cover hook). Excluded = stats, pricing-table cells, marketing-asset grid
 * cells, and disclaimers / footers.
 */

const EXCLUDE: RegExp[] = [
  /\.(disclaimer|footer)$/,
  /^demo\.stat\d+$/,
  /^region\.[^.]+\.(roomNights|alos|intl|window|demo|upgrade)$/,
  /^(deal|mktg)\.[^.]+\.[^.]+\.opt\d+$/,
  /^mktgAssets\.[^.]+\..+\.desc$/,
];

const INCLUDE: RegExp[] = [
  /^cover\.hookText$/,
  /^region\.[^.]+\.narrative$/,
  /^region\.[^.]+\.coverage$/,
  /^caseStudy\.[^.]+\.narrative$/,
  /^caseStudy\.[^.]+\.title$/,
  /^diff\.title\./,
  /^diff\.desc\./,
  /^hotelIntro\.valueProp$/,
  /^obj\.(primary|secondary)\.title$/,
  /^obj\.secondary\.all$/,
  /^obj\.(primary|secondary)\./,
  /^market-challenges\.item\./,
  /^demo\.segment\./,
  /^demo\.audienceTitle$/,
  /^reach\.subtitle$/,
  /^reach\.title$/,
  /\.subheadline$/,
  /\.headline$/,
];

export function isVoiceEligible(fieldKey: string): boolean {
  if (EXCLUDE.some((re) => re.test(fieldKey))) return false;
  return INCLUDE.some((re) => re.test(fieldKey));
}

/** Reserved customFields suffix that stores the pre-rewrite original for rollback. */
export const VOICE_ORIGINAL_SUFFIX = '.voiceOriginal';
