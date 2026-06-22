/**
 * SYR-70 multi-language support — shared helpers for the preview-stage language
 * model. See lux-pitch-deck-api/docs/syr70-i18n-plan.md.
 *
 * English is the canonical source: its text uses the bare customField keys
 * (e.g. `deal.headline`). A translation is stored alongside under a
 * locale-prefixed key (`i18n.<locale>.deal.headline`). Reading overlays the
 * active locale's keys on top of the English base (falling back to English for
 * anything untranslated); writing, when a non-English locale is active, targets
 * the prefixed key. `en` is a pass-through so the source is never touched.
 *
 * Mirrors the backend helper in lux-pitch-deck-api/src/modules/export/i18n.ts.
 */

export const DEFAULT_LOCALE = 'en';

export interface SupportedLocale {
  code: string;
  label: string;
}

/**
 * Languages offered in the preview switcher.
 * Confirmed first set (LUX): French, Spanish, Italian, Japanese — being rolled
 * out in stages. Starting with French only (Latin script, no layout surprises);
 * Spanish + Italian follow; Japanese is held back until CJK layout work is done
 * (variable-length / line-breaking — see plan doc piece 7).
 */
export const SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
];

const I18N_PREFIX = 'i18n.';

/** customFields key holding `key`'s translation for `locale` (e.g. "i18n.th.deal.headline"). */
export function localeFieldKey(locale: string, key: string): string {
  return `${I18N_PREFIX}${locale}.${key}`;
}

/**
 * Produce a customFields view for `locale`: the English base with the locale's
 * translated keys overlaid (prefix stripped). `en`/empty returns the base
 * unchanged. Untranslated fields fall through to their English value.
 */
export function applyLocaleOverlay(
  cf: Record<string, string> | undefined | null,
  locale: string,
): Record<string, string> {
  const base = cf ?? {};
  if (!locale || locale === DEFAULT_LOCALE) return base;
  const prefix = `${I18N_PREFIX}${locale}.`;
  const overlay: Record<string, string> = {};
  for (const [k, v] of Object.entries(base)) {
    if (k.startsWith(prefix)) overlay[k.slice(prefix.length)] = v;
  }
  return Object.keys(overlay).length > 0 ? { ...base, ...overlay } : base;
}
