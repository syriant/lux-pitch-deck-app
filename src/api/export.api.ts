import { apiClient } from './client';

export async function exportPdf(
  deckId: string,
  opts: { compressed?: boolean } = {},
): Promise<void> {
  const res = await apiClient.post(`/export/${deckId}/pdf`, {}, {
    params: opts.compressed ? { compressed: 'true' } : undefined,
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

export async function exportPptx(deckId: string): Promise<void> {
  const res = await apiClient.post(`/export/${deckId}/pptx`, {}, {
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
