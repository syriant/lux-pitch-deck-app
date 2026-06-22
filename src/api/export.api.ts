import { apiClient } from './client';

export async function exportPdf(
  deckId: string,
  opts: { compressed?: boolean; locale?: string } = {},
): Promise<void> {
  const params: Record<string, string> = {};
  if (opts.compressed) params.compressed = 'true';
  if (opts.locale && opts.locale !== 'en') params.locale = opts.locale;
  const res = await apiClient.post(`/export/${deckId}/pdf`, {}, {
    params: Object.keys(params).length ? params : undefined,
    responseType: 'blob',
    timeout: 120_000,
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });

  const disposition = res.headers['content-disposition'] as string | undefined;
  let filename = 'deck.pdf';
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) filename = match[1];
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  const res = await apiClient.post(`/export/${deckId}/pptx`, {}, {
    params: opts.locale && opts.locale !== 'en' ? { locale: opts.locale } : undefined,
    responseType: 'blob',
  });

  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });

  // Extract filename from Content-Disposition header if available
  const disposition = res.headers['content-disposition'] as string | undefined;
  let filename = 'deck.pptx';
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) filename = match[1];
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
