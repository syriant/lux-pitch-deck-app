import { apiClient } from './client';

export interface VendorResearchItem {
  title: string;
  summary: string;
  source: string | null;
  url: string | null;
  date: string | null;
  category: string | null;
}

export interface VendorResearch {
  id: string;
  deckId: string;
  intro: string | null;
  items: VendorResearchItem[];
  citations: Array<{ url: string; title: string | null }>;
  model: string | null;
  createdAt: string;
}

export async function generateVendorResearch(deckId: string): Promise<VendorResearch> {
  // Web research runs several searches server-side — same long timeout as
  // translation and case-study parsing.
  const res = await apiClient.post<VendorResearch>(`/decks/${deckId}/vendor-research`, undefined, {
    timeout: 180_000,
  });
  return res.data;
}

export async function getLatestVendorResearch(deckId: string): Promise<VendorResearch | null> {
  const res = await apiClient.get<VendorResearch | null>(`/decks/${deckId}/vendor-research/latest`);
  return res.data ?? null;
}

export async function updateVendorResearchItems(
  deckId: string,
  researchId: string,
  items: VendorResearchItem[],
): Promise<void> {
  await apiClient.put(`/decks/${deckId}/vendor-research/${researchId}/items`, { items });
}
