import { apiClient } from './client';

export interface UploadResult {
  url: string;
  filename: string;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<UploadResult>('/upload', formData);
  return res.data;
}

/** Build a full URL for an uploaded file path (e.g. /uploads/abc.jpg) */
export function uploadUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const base = import.meta.env.VITE_API_URL?.replace(/\/api\/v1$/, '') ?? '';
  return `${base}${path}`;
}
