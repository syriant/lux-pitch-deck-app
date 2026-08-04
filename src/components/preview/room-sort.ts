/*
 * Ordering for the NETT/sell-rate lines and the allocation list (Tom's request,
 * v1.1.20): keep a room type's stay lengths together instead of interleaving
 * them by raw price. Room types are ranked by their cheapest rate, and within a
 * type the shorter stay comes first. Rows with no parseable price sink to the
 * end, matching the old `?? Infinity` behaviour.
 *
 * Mirrored in the API at src/modules/export/room-sort.ts — keep in sync.
 */

interface RoomSortable {
  roomType: string | null;
  nights?: number | null;
}

export function sortRoomsGrouped<T extends RoomSortable>(
  rooms: T[],
  price: (r: T) => string | number | null | undefined,
): T[] {
  const num = (v: string | number | null | undefined): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
  };

  const minByType = new Map<string, number>();
  for (const r of rooms) {
    const key = r.roomType ?? '';
    const p = num(price(r));
    const cur = minByType.get(key);
    if (cur === undefined || p < cur) minByType.set(key, p);
  }

  return rooms.slice().sort((a, b) => {
    const typeA = a.roomType ?? '';
    const typeB = b.roomType ?? '';
    if (typeA !== typeB) {
      const byCheapest = (minByType.get(typeA) ?? 0) - (minByType.get(typeB) ?? 0);
      if (byCheapest !== 0) return byCheapest;
      return typeA.localeCompare(typeB);
    }
    const byNights = (a.nights ?? 0) - (b.nights ?? 0);
    if (byNights !== 0) return byNights;
    return num(price(a)) - num(price(b));
  });
}
