import { apiClient } from './client';

export interface TranslateDeckResult {
  locale: string;
  translated: number;
  eligible: number;
  llm: {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number | null;
    latencyMs: number;
  };
}

/**
 * Translate a deck's editable content into `locale`, populating the
 * i18n.<locale>.* overlay on the deck's customFields (SYR-70 piece 6).
 */
export async function translateDeck(deckId: string, locale: string): Promise<TranslateDeckResult> {
  const res = await apiClient.post<TranslateDeckResult>('/translate/deck', { deckId, locale }, {
    timeout: 180_000,
  });
  return res.data;
}
