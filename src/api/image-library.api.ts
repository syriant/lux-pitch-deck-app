import { apiClient } from './client';

export interface LibraryImage {
  id: string;
  url: string;
  hotelName: string | null;
  destination: string | null;
  source: string;
  attribution: string | null;
  createdAt: string;
}

export interface FetchImagesResponse {
  images: LibraryImage[];
  googleUsed: boolean;
  googleConfigured: boolean;
  cachedCount: number;
}

export async function fetchHotelImages(args: {
  hotelName: string;
  destination?: string;
  limit?: number;
  forceGoogle?: boolean;
}): Promise<FetchImagesResponse> {
  const res = await apiClient.post<FetchImagesResponse>('/image-library/fetch', {
    hotelName: args.hotelName,
    destination: args.destination,
    limit: args.limit ?? 10,
    forceGoogle: args.forceGoogle,
  });
  return res.data;
}

export async function searchLibrary(hotelName: string, destination?: string): Promise<LibraryImage[]> {
  const res = await apiClient.get<LibraryImage[]>('/image-library', {
    params: { hotelName, destination },
  });
  return res.data;
}

export async function lookupLibraryByUrls(urls: string[]): Promise<Record<string, LibraryImage>> {
  if (urls.length === 0) return {};
  const res = await apiClient.post<Record<string, LibraryImage>>('/image-library/lookup', { urls });
  return res.data;
}

export interface AdminListResponse {
  items: LibraryImage[];
  total: number;
}

export async function adminListLibrary(args: {
  q?: string;
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminListResponse> {
  const res = await apiClient.get<AdminListResponse>('/image-library/admin', { params: args });
  return res.data;
}

export async function updateLibraryImage(
  id: string,
  data: { hotelName?: string | null; destination?: string | null },
): Promise<LibraryImage> {
  const res = await apiClient.patch<LibraryImage>(`/image-library/${id}`, data);
  return res.data;
}

export async function deleteLibraryImage(id: string): Promise<void> {
  await apiClient.delete(`/image-library/${id}`);
}

export async function bulkDeleteLibraryImages(ids: string[]): Promise<{ deleted: number }> {
  const res = await apiClient.post<{ deleted: number }>('/image-library/bulk-delete', { ids });
  return res.data;
}

export async function ingestBase64Images(args: {
  items: Array<{ dataUrl: string; width?: number | null; height?: number | null }>;
  hotelName?: string | null;
  destination?: string | null;
  source?: string;
}): Promise<LibraryImage[]> {
  const res = await apiClient.post<LibraryImage[]>('/image-library/ingest-base64', {
    items: args.items,
    hotelName: args.hotelName ?? null,
    destination: args.destination ?? null,
    source: args.source ?? 'pitch_deck',
  });
  return res.data;
}

export async function uploadToLibrary(args: {
  file: File;
  hotelName?: string;
  destination?: string;
  source?: string;
}): Promise<LibraryImage> {
  const form = new FormData();
  form.append('file', args.file);
  if (args.hotelName) form.append('hotelName', args.hotelName);
  if (args.destination) form.append('destination', args.destination);
  if (args.source) form.append('source', args.source);
  const res = await apiClient.post<LibraryImage>('/image-library/upload', form);
  return res.data;
}
