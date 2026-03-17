import { apiClient } from './client';

export interface Deck {
  id: string;
  name: string;
  status: string;
  locale: string;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeckListResponse {
  data: Deck[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateDeckRequest {
  name: string;
  locale?: string;
}

export async function getDecks(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<DeckListResponse> {
  const res = await apiClient.get<DeckListResponse>('/decks', { params });
  return res.data;
}

export async function createDeck(data: CreateDeckRequest): Promise<Deck> {
  const res = await apiClient.post<Deck>('/decks', data);
  return res.data;
}
