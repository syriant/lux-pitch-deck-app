import { apiClient } from './client';

export interface Deck {
  id: string;
  name: string;
  status: string;
  locale: string;
  coverImage: string | null;
  heroImage: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DeckProperty {
  id: string;
  deckId: string;
  propertyName: string;
  destination: string | null;
  isCustomDestination: boolean;
  grade: string | null;
  tier: number | null;
  gmPercentage: string | null;
  pricingToolFile: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeckWithProperties extends Deck {
  properties: DeckProperty[];
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

export interface TemplateSlide {
  type: string;
  label: string;
  required?: boolean;
  perProperty?: boolean;
  removable?: boolean;
  config?: Record<string, unknown>;
}

export interface CreateDeckRequest {
  name: string;
  locale?: string;
  templateId?: string;
}

export interface CreatePropertyRequest {
  propertyName: string;
  destination?: string;
  isCustomDestination?: boolean;
  sortOrder?: number;
}

export interface UpdatePropertyRequest {
  propertyName?: string;
  destination?: string | null;
  isCustomDestination?: boolean;
  grade?: string | null;
  tier?: number | null;
  gmPercentage?: number | null;
  sortOrder?: number;
}

export async function getDecks(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<DeckListResponse> {
  const res = await apiClient.get<DeckListResponse>('/decks', { params });
  return res.data;
}

export async function getDeck(id: string): Promise<DeckWithProperties> {
  const res = await apiClient.get<DeckWithProperties>(`/decks/${id}`);
  return res.data;
}

export async function createDeck(data: CreateDeckRequest): Promise<Deck> {
  const res = await apiClient.post<Deck>('/decks', data);
  return res.data;
}

export async function deleteDeck(id: string): Promise<void> {
  await apiClient.delete(`/decks/${id}`);
}

export async function getProperties(deckId: string): Promise<DeckProperty[]> {
  const res = await apiClient.get<DeckProperty[]>(`/decks/${deckId}/properties`);
  return res.data;
}

export async function createProperty(deckId: string, data: CreatePropertyRequest): Promise<DeckProperty> {
  const res = await apiClient.post<DeckProperty>(`/decks/${deckId}/properties`, data);
  return res.data;
}

export async function updateProperty(deckId: string, propertyId: string, data: UpdatePropertyRequest): Promise<DeckProperty> {
  const res = await apiClient.patch<DeckProperty>(`/decks/${deckId}/properties/${propertyId}`, data);
  return res.data;
}

export async function deleteProperty(deckId: string, propertyId: string): Promise<void> {
  await apiClient.delete(`/decks/${deckId}/properties/${propertyId}`);
}

// --- Objectives ---

export interface DeckObjective {
  id: string;
  deckId: string;
  objectiveText: string;
  source: string;
  sortOrder: number;
  isPrimary: boolean;
}

export async function getDeckObjectives(deckId: string): Promise<DeckObjective[]> {
  const res = await apiClient.get<DeckObjective[]>(`/decks/${deckId}/objectives`);
  return res.data;
}

export async function setDeckObjectives(
  deckId: string,
  objectives: Array<{ text: string; source?: string; isPrimary?: boolean }>,
): Promise<DeckObjective[]> {
  const res = await apiClient.put<DeckObjective[]>(`/decks/${deckId}/objectives`, { objectives });
  return res.data;
}

// --- Differentiators ---

export interface DeckDifferentiator {
  id: string;
  deckId: string;
  differentiatorId: string;
  sortOrder: number;
}

export async function getDeckDifferentiators(deckId: string): Promise<DeckDifferentiator[]> {
  const res = await apiClient.get<DeckDifferentiator[]>(`/decks/${deckId}/differentiators`);
  return res.data;
}

export async function setDeckDifferentiators(deckId: string, differentiatorIds: string[]): Promise<DeckDifferentiator[]> {
  const res = await apiClient.put<DeckDifferentiator[]>(`/decks/${deckId}/differentiators`, { differentiatorIds });
  return res.data;
}

// --- Full deck for preview ---

export interface DeckOption {
  id: string;
  propertyId: string;
  optionNumber: number;
  tierLabel: string | null;
  roomType: string | null;
  sellPrice: string | null;
  costPrice: string | null;
  nights: number | null;
  allocation: string | null;
  surcharges: Array<{ name: string; amount: number; period?: string }> | null;
  blackoutDates: Array<{ from: string; to: string }> | null;
  inclusions: string[] | null;
  marketingAssets: Record<string, boolean> | null;
}

export interface DeckCaseStudyLink {
  id: string;
  propertyId: string;
  caseStudyId: string;
  pcmContext: string | null;
  sortOrder: number;
  caseStudy: {
    id: string;
    title: string;
    hotelName: string;
    destination: string | null;
    propertyType: string | null;
    roomNights: number | null;
    revenue: string | null;
    adr: string | null;
    alos: string | null;
    leadTime: number | null;
    bookings: number | null;
    narrative: string | null;
    images: string[] | null;
    tags: string[] | null;
  };
}

export interface DeckPropertyFull extends DeckProperty {
  options: DeckOption[];
  caseStudies: DeckCaseStudyLink[];
}

export interface DeckDifferentiatorFull {
  id: string;
  deckId: string;
  differentiatorId: string;
  sortOrder: number;
  differentiator: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
  };
}

export interface FullDeck {
  id: string;
  name: string;
  status: string;
  locale: string;
  coverImage: string | null;
  heroImage: string | null;
  customFields: Record<string, string>;
  gallery: string[];
  templateId: string | null;
  slideOrder: TemplateSlide[] | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  properties: DeckPropertyFull[];
  objectives: DeckObjective[];
  differentiators: DeckDifferentiatorFull[];
  templateDefaults: Record<string, string>;
}

export async function getFullDeck(id: string): Promise<FullDeck> {
  const res = await apiClient.get<FullDeck>(`/decks/${id}/full`);
  return res.data;
}

// --- Options ---

export interface SetOptionRequest {
  optionNumber: number;
  tierLabel?: string | null;
  roomType?: string | null;
  sellPrice?: string | null;
  costPrice?: string | null;
  nights?: number | null;
  allocation?: string | null;
  surcharges?: Array<{ name: string; amount: number; period?: string }> | null;
  blackoutDates?: Array<{ from: string; to: string }> | null;
  inclusions?: string[] | null;
  marketingAssets?: Record<string, boolean> | null;
}

export async function setPropertyOptions(
  deckId: string,
  propertyId: string,
  options: SetOptionRequest[],
): Promise<DeckOption[]> {
  const res = await apiClient.put<DeckOption[]>(
    `/decks/${deckId}/properties/${propertyId}/options`,
    { options },
  );
  return res.data;
}

export async function updateOption(
  deckId: string,
  optionId: string,
  data: Partial<SetOptionRequest>,
): Promise<DeckOption> {
  const res = await apiClient.patch<DeckOption>(`/decks/${deckId}/options/${optionId}`, data);
  return res.data;
}

// --- Property Case Studies ---

export async function setPropertyCaseStudies(
  deckId: string,
  propertyId: string,
  caseStudies: Array<{ caseStudyId: string; pcmContext?: string | null; sortOrder?: number }>,
): Promise<DeckCaseStudyLink[]> {
  const res = await apiClient.put<DeckCaseStudyLink[]>(
    `/decks/${deckId}/properties/${propertyId}/case-studies`,
    { caseStudies },
  );
  return res.data;
}

// --- Deck ---

export async function updateDeck(id: string, data: {
  name?: string;
  status?: string;
  locale?: string;
  coverImage?: string | null;
  heroImage?: string | null;
  customFields?: Record<string, string>;
  gallery?: string[];
  slideOrder?: TemplateSlide[];
}): Promise<{ id: string }> {
  const res = await apiClient.patch(`/decks/${id}`, data);
  return res.data;
}
