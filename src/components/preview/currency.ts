/**
 * Currency formatting for pricing slides. The pricing tool reports an ISO-4217
 * currency code per property; we map it to a display symbol so international
 * decks show the local symbol (€, £, …) instead of a hardcoded `$`.
 *
 * Mirrors the API-side helper in lux-pitch-deck-api/src/modules/export/currency.ts
 * so the live preview and the exported PPTX/PDF render identically.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: '$',
  USD: '$',
  NZD: '$',
  SGD: '$',
  HKD: '$',
  CAD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  THB: '฿',
  INR: '₹',
};

/** Symbol for a currency code. Unknown codes fall back to "<CODE> " (e.g. "AED 400"). */
export function currencySymbol(currency?: string | null): string {
  const code = (currency ?? 'AUD').toUpperCase();
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

/**
 * Format a money value with its currency symbol (e.g. 400 + EUR → "€400").
 * Returns null for empty/non-numeric input so callers can show their own
 * placeholder.
 */
export function formatMoney(
  value: number | string | null | undefined,
  currency?: string | null,
): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return `${currencySymbol(currency)}${n.toLocaleString()}`;
}
