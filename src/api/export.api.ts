import { apiClient } from './client';
import { useAuthStore } from '../stores/auth.store';

// Blob downloads use fetch rather than apiClient (axios/XHR): large binary
// responses were failing mid-body in Edge with net::ERR_FAILED under the XHR
// stack, while the same request via fetch completes. Everything else stays on
// axios; this path re-implements the bearer header + one 401 refresh retry.
async function fetchBlobDownload(path: string, params?: Record<string, string>): Promise<void> {
  const base = import.meta.env.VITE_API_URL as string;
  const qs = params && Object.keys(params).length ? `?${new URLSearchParams(params)}` : '';
  const url = `${base}${path}${qs}`;

  const doFetch = (token: string | null) => fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  let res = await doFetch(useAuthStore.getState().accessToken);
  if (res.status === 401) {
    const newToken = await useAuthStore.getState().refresh();
    if (!newToken) throw new Error('Session expired');
    res = await doFetch(newToken);
  }
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);

  const blob = await res.blob();

  const disposition = res.headers.get('content-disposition');
  let filename = path.endsWith('/pdf') ? 'deck.pdf' : 'deck.pptx';
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) filename = match[1];
  }

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export async function exportPdf(
  deckId: string,
  opts: { compressed?: boolean; locale?: string } = {},
): Promise<void> {
  const params: Record<string, string> = {};
  if (opts.compressed) params.compressed = 'true';
  if (opts.locale && opts.locale !== 'en') params.locale = opts.locale;
  await fetchBlobDownload(`/export/${deckId}/pdf`, params);
}

export interface SalesforceUploadResult {
  opportunityId: string;
  opportunityName: string | null;
  recordUrl: string | null;
  contentDocumentId: string;
  filename: string;
  /** true when an existing attachment was overwritten (new version) rather than newly created. */
  updated: boolean;
}

/** Render the deck to PDF and attach it to its linked Salesforce Opportunity's Files. */
export async function exportToSalesforce(deckId: string): Promise<SalesforceUploadResult> {
  const res = await apiClient.post<SalesforceUploadResult>(`/export/${deckId}/salesforce`, {}, {
    timeout: 180_000,
  });
  return res.data;
}

export async function exportPptx(deckId: string, opts: { locale?: string } = {}): Promise<void> {
  const params: Record<string, string> = {};
  if (opts.locale && opts.locale !== 'en') params.locale = opts.locale;
  await fetchBlobDownload(`/export/${deckId}/pptx`, params);
}
