import { apiClient } from './client';

export async function exportPdf(deckId: string): Promise<void> {
  const res = await apiClient.post(`/export/${deckId}/pdf`, {}, {
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
