import { createContext, useContext } from 'react';

/**
 * Provides runtime values that get substituted into `{key}` placeholders found in
 * template default text. For example, a template default like
 * "...demand in {destination} projected to grow..." gets rendered with the actual
 * destination at deck-preview / export time.
 *
 * The placeholder context is provided by `SlideRenderer` and consumed by
 * `SlideRichText`. In the admin Templates editor, substitution is suppressed so
 * the admin sees the raw `{destination}` syntax and can edit around it.
 *
 * Currently supported placeholders:
 *   - {hotelName}    — the active property's name (or deck name as fallback)
 *   - {destination}  — the active property's destination (or empty string)
 */
export interface DeckRenderContextValue {
  placeholders: Record<string, string>;
}

export const DeckRenderContext = createContext<DeckRenderContextValue>({ placeholders: {} });

export function useDeckRenderContext(): DeckRenderContextValue {
  return useContext(DeckRenderContext);
}

/**
 * Substitutes `{key}` patterns in `text` with values from the placeholders map.
 * Missing keys are replaced with empty string. Returns the original text if it
 * has no placeholders.
 */
export function substitutePlaceholders(text: string, placeholders: Record<string, string>): string {
  if (!text.includes('{')) return text;
  return text.replace(/\{(\w+)\}/g, (_match, key: string) => placeholders[key] ?? '');
}
