/*
 * PCM row ordering for the comparison tables (KP, v2.0.1) — the same
 * affordance the marketing-assets grid got in 1.1.20, applied to the
 * campaign-options table (`deal.<propId>.rowOrder`) and the campaign-details
 * one-pager (`mktg.<propId>.rowOrder`).
 *
 * The custom field holds a JSON array of row keys ("period", "travel",
 * "inclusions", "rates", "custom.<id>", …). Rows missing from the saved order
 * keep their natural position after the ordered ones, so a row that only
 * appears later (e.g. Surcharge after a re-upload, or the marketing-spend row
 * when it's switched on) shows up at the bottom until moved.
 *
 * Mirrored in the API at src/modules/export/row-order.ts — keep in sync.
 */

interface KeyedRow {
  key: string;
}

/** Custom-field key holding the saved order, e.g. rowOrderKey('deal', propId). */
export function rowOrderKey(prefix: string, propId: string): string {
  return `${prefix}.${propId}.rowOrder`;
}

export function applyRowOrder<T extends KeyedRow>(
  rows: T[],
  customFields: Record<string, string> | null | undefined,
  orderKey: string,
): T[] {
  const raw = customFields?.[orderKey];
  if (!raw) return rows;
  let keys: unknown;
  try {
    keys = JSON.parse(raw);
  } catch {
    return rows;
  }
  if (!Array.isArray(keys)) return rows;
  const pos = new Map<string, number>();
  keys.forEach((k, i) => {
    if (typeof k === 'string') pos.set(k, i);
  });
  return rows
    .map((row, i) => ({ row, i, p: pos.get(row.key) ?? keys.length + i }))
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .map((x) => x.row);
}

/**
 * Swap a row with its neighbour and return the new key order, or null when the
 * move would fall off either end. Callers persist the result to `orderKey`.
 */
export function moveRowKey(rows: KeyedRow[], key: string, dir: -1 | 1): string[] | null {
  const keys = rows.map((r) => r.key);
  const idx = keys.indexOf(key);
  const target = idx + dir;
  if (idx < 0 || target < 0 || target >= keys.length) return null;
  [keys[idx], keys[target]] = [keys[target], keys[idx]];
  return keys;
}
