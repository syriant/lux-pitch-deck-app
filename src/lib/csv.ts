export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null;
}

function escapeCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  // Quote when the cell could otherwise break the row, and double any quote.
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: Array<CsvColumn<T>>): string {
  const lines = [columns.map((c) => escapeCell(c.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(c.value(row))).join(','));
  }
  // CRLF — Excel is the destination for these exports.
  return lines.join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM so Excel reads UTF-8 hotel names correctly.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
