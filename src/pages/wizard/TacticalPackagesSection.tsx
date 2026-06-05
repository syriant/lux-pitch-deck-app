import { useEffect, useState } from 'react';
import {
  type DeckOption,
  type DeckPropertyFull,
  type FullDeck,
  type TacticalDetails,
  type TacticalExtraGuestRow,
  type TacticalRoomRow,
  updateDeck,
  updateOption,
} from '@/api/decks.api';
import {
  TIER_PALETTE,
  uniqueOptionsByNumber,
  SINGLE_PAGE_ELEMENTS,
} from '@/components/preview/slides/tactical-shared';

interface Props {
  deck: FullDeck;
  properties: DeckPropertyFull[];
  onDeckChange: () => void;
}

const EMPTY_ROOM: TacticalRoomRow = {
  roomType: '',
  allotment: null,
  occupancy: null,
  nightRates: [],
  extraNightRate: null,
  currency: null,
};

const DEFAULT_GUEST_ROWS: TacticalExtraGuestRow[] = [
  { guest: 'Adult', age: '12+', inclusions: 'Breakfast', feePerNight: null, feeLabel: null },
  { guest: 'Child', age: '4 – 11', inclusions: 'Breakfast', feePerNight: null, feeLabel: null },
  { guest: 'Infant', age: '0 – 3', inclusions: 'Room Only', feePerNight: null, feeLabel: 'Free of Charge' },
];

export function TacticalPackagesSection({ deck, properties, onDeckChange }: Props) {
  const [openProperty, setOpenProperty] = useState<string | null>(properties[0]?.id ?? null);
  const [openPackage, setOpenPackage] = useState<string | null>(null);

  const feeBasis = deck.customFields?.['tactical.extraGuestFeeBasis'] === 'net' ? 'net' : 'sell';
  async function saveFeeBasis(basis: 'net' | 'sell') {
    await updateDeck(deck.id, {
      customFields: { ...deck.customFields, 'tactical.extraGuestFeeBasis': basis },
    });
    onDeckChange();
  }

  return (
    <div className="mt-8">
      <div className="border-t border-gray-200 pt-6 mb-4">
        <h3 className="text-lg font-bold text-gray-900">Tactical Package Details</h3>
        <p className="text-sm text-gray-500 mt-1">
          Extra data the Single Page Proposal slides need. Pre-filled where the pricing tool or
          deal tiers provided it — edit anything as needed.
        </p>
      </div>

      {/* Extra guest fee basis */}
      <div className="rounded-lg border border-gray-200 bg-white mb-4 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900">Extra Guest Fee</h4>
          <p className="text-xs text-gray-500">Which Extra Guest Surcharge appears in the Extra Guest Policy table.</p>
        </div>
        <div className="px-4 py-4">
          <label className="text-xs font-medium text-gray-700 block mb-1">Extra guest fee shown</label>
          <select
            className="w-full md:w-64 rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={feeBasis}
            onChange={(e) => saveFeeBasis(e.target.value as 'net' | 'sell')}
          >
            <option value="sell">Sell price (guest pays)</option>
            <option value="net">Net rate (hotel receives)</option>
          </select>
        </div>
      </div>

      {/* Per-property → per-package */}
      {properties.map((prop) => {
        const propOpen = openProperty === prop.id;
        const options = uniqueOptionsByNumber(prop.options);

        return (
          <div key={prop.id} className="rounded-lg border border-gray-200 bg-white mb-4 overflow-hidden">
            <button
              type="button"
              className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between"
              onClick={() => setOpenProperty(propOpen ? null : prop.id)}
            >
              <div className="text-left">
                <h4 className="text-sm font-semibold text-gray-900">{prop.propertyName}</h4>
                <p className="text-xs text-gray-500">{options.length} package{options.length === 1 ? '' : 's'}</p>
              </div>
              <span className="text-gray-400 text-sm">{propOpen ? '▲' : '▼'}</span>
            </button>

            {propOpen && (
              <div className="px-4 py-4 space-y-3">
                {options.length === 0 ? (
                  <p className="text-xs text-gray-500">Upload a pricing tool first to define packages.</p>
                ) : options.map((opt) => {
                  const pkgKey = `${prop.id}:${opt.id}`;
                  const isOpen = openPackage === pkgKey;
                  return (
                    <PackageCard
                      key={opt.id}
                      isOpen={isOpen}
                      onToggle={() => setOpenPackage(isOpen ? null : pkgKey)}
                      deck={deck}
                      property={prop}
                      option={opt}
                      onChange={onDeckChange}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PackageCard({
  deck, property: _property, option, isOpen, onToggle, onChange,
}: {
  deck: FullDeck;
  property: DeckPropertyFull;
  option: DeckOption;
  isOpen: boolean;
  onToggle: () => void;
  onChange: () => void;
}) {
  const palette = TIER_PALETTE[option.optionNumber] ?? TIER_PALETTE[1];

  const [tierLabel, setTierLabel] = useState(option.tierLabel ?? '');
  const [details, setDetails] = useState<TacticalDetails>(option.tacticalDetails ?? {});
  const [rooms, setRooms] = useState<TacticalRoomRow[]>(option.rooms ?? []);

  useEffect(() => {
    setTierLabel(option.tierLabel ?? '');
    setDetails(option.tacticalDetails ?? {});
    setRooms(option.rooms ?? []);
  }, [option.id, option.tierLabel, option.tacticalDetails, option.rooms]);

  async function saveDetails(next: TacticalDetails) {
    setDetails(next);
    await updateOption(deck.id, option.id, { tacticalDetails: next });
    onChange();
  }

  async function saveRooms(next: TacticalRoomRow[]) {
    setRooms(next);
    await updateOption(deck.id, option.id, { rooms: next });
    onChange();
  }

  async function saveTierLabel() {
    if ((option.tierLabel ?? '') === tierLabel) return;
    await updateOption(deck.id, option.id, { tierLabel: tierLabel || null });
    onChange();
  }

  function ensureGuestRows(): TacticalExtraGuestRow[] {
    return details.extraGuestPolicy && details.extraGuestPolicy.length > 0
      ? details.extraGuestPolicy
      : DEFAULT_GUEST_ROWS;
  }


  return (
    <div
      className="rounded-md border"
      style={{
        // Picks up the package accent when expanded so the section's extents
        // are easy to scan; collapsed cards stay neutral grey for list calm.
        borderColor: isOpen ? palette.accent : '#E5E7EB',
        borderWidth: isOpen ? 2 : 1,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: palette.accent }} />
          <span className="text-sm font-medium text-gray-800">
            {tierLabel || palette.badgeLabel} Package
          </span>
          <span className="text-xs text-gray-500">(option {option.optionNumber})</span>
        </div>
        <span className="text-xs text-gray-400">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 px-3 py-3 space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-700 block mb-1">Badge name</span>
              <input
                type="text"
                value={tierLabel}
                onChange={(e) => setTierLabel(e.target.value)}
                onBlur={saveTierLabel}
                placeholder={palette.badgeLabel}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-700 block mb-1">Room night forecast</span>
              <input
                type="number"
                value={details.roomNightForecast ?? ''}
                onChange={(e) => setDetails({ ...details, roomNightForecast: e.target.value === '' ? null : Number(e.target.value) })}
                onBlur={() => saveDetails(details)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          {/* Show on slide — per-package element visibility (all on by default) */}
          <div>
            <span className="text-xs font-medium text-gray-700 block mb-1">Show on slide</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {SINGLE_PAGE_ELEMENTS.map((el) => (
                <label key={el.id} className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={!details.hidden?.[el.id]}
                    onChange={(e) => {
                      const hidden = { ...(details.hidden ?? {}) };
                      if (e.target.checked) delete hidden[el.id];
                      else hidden[el.id] = true;
                      saveDetails({ ...details, hidden });
                    }}
                    className="h-3.5 w-3.5 accent-[#01B18B]"
                  />
                  {el.label}
                </label>
              ))}
            </div>
          </div>

          {/* Rooms table */}
          <RoomsTable
            rooms={rooms}
            onChange={setRooms}
            onSave={saveRooms}
          />

          {/* Extra-night inclusions */}
          <StringListEditor
            title="Extra-night inclusions"
            items={details.extraNightInclusions ?? []}
            onChange={(items) => saveDetails({ ...details, extraNightInclusions: items })}
          />

          {/* Extra guest policy */}
          <ExtraGuestEditor
            rows={ensureGuestRows()}
            onChange={(rows) => saveDetails({ ...details, extraGuestPolicy: rows })}
          />

          {/* Comparison Slide Values — hidden for now. The slides this fed
              (tactical-investment-overview, tactical-amplification) were
              dropped from the Single Page template in favour of the existing
              marketing-assets-grid / marketing-assets pair. Kept here as a
              comment so the wiring's easy to revive if those slides come back. */}
        </div>
      )}
    </div>
  );
}

function RoomsTable({
  rooms,
  onChange,
  onSave,
}: {
  rooms: TacticalRoomRow[];
  onChange: (rows: TacticalRoomRow[]) => void;
  onSave: (rows: TacticalRoomRow[]) => Promise<void>;
}) {
  // Union of night-counts across the rooms array — drives which rate columns
  // render. PCM can add/remove via the "+ N nights" control below.
  const nightCounts = Array.from(
    new Set(rooms.flatMap((r) => (r.nightRates ?? []).map((x) => x.nights))),
  ).sort((a, b) => a - b);

  const [draftNights, setDraftNights] = useState('');

  function updateRoom(idx: number, patch: Partial<TacticalRoomRow>) {
    onChange(rooms.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }
  function setRateForRoom(idx: number, nights: number, rate: number | null) {
    const room = rooms[idx];
    const existing = room.nightRates ?? [];
    const next = existing.some((x) => x.nights === nights)
      ? existing.map((x) => (x.nights === nights ? { ...x, rate } : x))
      : [...existing, { nights, rate }].sort((a, b) => a.nights - b.nights);
    updateRoom(idx, { nightRates: next });
  }
  function addRoom() {
    // New rooms inherit the existing night-count columns so PCM doesn't have
    // to re-add them per row.
    onChange([
      ...rooms,
      {
        ...EMPTY_ROOM,
        nightRates: nightCounts.map((n) => ({ nights: n, rate: null })),
      },
    ]);
  }
  function removeRoom(idx: number) {
    const next = rooms.filter((_, i) => i !== idx);
    onChange(next);
    void onSave(next);
  }
  function addNightColumn() {
    const n = Number(draftNights);
    if (!Number.isFinite(n) || n <= 0 || nightCounts.includes(n)) return;
    const next = rooms.map((r) => ({
      ...r,
      nightRates: [...(r.nightRates ?? []), { nights: n, rate: null }].sort((a, b) => a.nights - b.nights),
    }));
    setDraftNights('');
    onChange(next);
    void onSave(next);
  }
  function removeNightColumn(n: number) {
    const next = rooms.map((r) => ({
      ...r,
      nightRates: (r.nightRates ?? []).filter((x) => x.nights !== n),
    }));
    onChange(next);
    void onSave(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nett Rates per Package</span>
        <button type="button" onClick={addRoom} className="text-xs text-[#01B18B] hover:text-[#009977]">+ Add room</button>
      </div>
      {rooms.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No rooms yet — click "Add room" to start.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="pb-1 pr-2">Room Type</th>
                <th className="pb-1 pr-2 w-16">Allot.</th>
                <th className="pb-1 pr-2 w-20">Occ.</th>
                {nightCounts.map((n) => (
                  <th key={n} className="pb-1 pr-2 w-24">
                    <span className="inline-flex items-center gap-1">
                      {n} Nights
                      <button
                        type="button"
                        onClick={() => removeNightColumn(n)}
                        className="text-gray-300 hover:text-red-600"
                        title={`Remove ${n}-night column`}
                      >×</button>
                    </span>
                  </th>
                ))}
                <th className="pb-1 pr-2 w-24">Extra Night</th>
                <th className="pb-1 pr-2 w-16">Currency</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rooms.map((r, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 pr-2"><RoomInput value={r.roomType} onChange={(v) => updateRoom(i, { roomType: v })} onBlur={() => onSave(rooms)} /></td>
                  <td className="py-1 pr-2"><RoomNumberInput value={r.allotment} onChange={(v) => updateRoom(i, { allotment: v })} onBlur={() => onSave(rooms)} /></td>
                  <td className="py-1 pr-2"><RoomInput value={r.occupancy ?? ''} onChange={(v) => updateRoom(i, { occupancy: v || null })} onBlur={() => onSave(rooms)} /></td>
                  {nightCounts.map((n) => {
                    const cell = (r.nightRates ?? []).find((x) => x.nights === n);
                    return (
                      <td key={n} className="py-1 pr-2">
                        <RoomNumberInput
                          value={cell?.rate ?? null}
                          onChange={(v) => setRateForRoom(i, n, v)}
                          onBlur={() => onSave(rooms)}
                        />
                      </td>
                    );
                  })}
                  <td className="py-1 pr-2"><RoomNumberInput value={r.extraNightRate} onChange={(v) => updateRoom(i, { extraNightRate: v })} onBlur={() => onSave(rooms)} /></td>
                  <td className="py-1 pr-2"><RoomInput value={r.currency ?? ''} onChange={(v) => updateRoom(i, { currency: v || null })} onBlur={() => onSave(rooms)} /></td>
                  <td className="py-1 text-right">
                    <button type="button" onClick={() => removeRoom(i)} className="text-gray-400 hover:text-red-600 text-xs">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-gray-500">Add night column:</span>
        <input
          type="number"
          min={1}
          value={draftNights}
          onChange={(e) => setDraftNights(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNightColumn(); } }}
          placeholder="e.g. 7"
          className="w-16 rounded-md border border-gray-300 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={addNightColumn}
          className="text-xs text-[#01B18B] hover:text-[#009977]"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function RoomInput({ value, onChange, onBlur }: { value: string; onChange: (v: string) => void; onBlur: () => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
    />
  );
}

function RoomNumberInput({ value, onChange, onBlur }: { value: number | null; onChange: (v: number | null) => void; onBlur: () => void }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      onBlur={onBlur}
      className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
    />
  );
}

function StringListEditor({ title, items, onChange }: { title: string; items: string[]; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">{title}</div>
      {items.length === 0 && <p className="text-xs text-gray-400 italic mb-1">None — add below.</p>}
      <ul className="space-y-1 mb-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => onChange(items.map((v, idx) => (idx === i ? e.target.value : v)))}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
            />
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-600 text-xs">×</button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              e.preventDefault();
              onChange([...items, draft.trim()]);
              setDraft('');
            }
          }}
          placeholder="Add inclusion and press Enter"
          className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={() => {
            if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(''); }
          }}
          className="text-xs text-[#01B18B] hover:text-[#009977]"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function ExtraGuestEditor({ rows, onChange }: { rows: TacticalExtraGuestRow[]; onChange: (rows: TacticalExtraGuestRow[]) => void }) {
  function update(i: number, patch: Partial<TacticalExtraGuestRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Extra Guest Policy</span>
        <button
          type="button"
          onClick={() => onChange([...rows, { guest: '', age: null, inclusions: null, feePerNight: null, feeLabel: null }])}
          className="text-xs text-[#01B18B] hover:text-[#009977]"
        >
          + Add row
        </button>
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="pb-1 pr-2 w-24">Guest</th>
            <th className="pb-1 pr-2 w-20">Age</th>
            <th className="pb-1 pr-2">Inclusions</th>
            <th className="pb-1 pr-2 w-24">Fee per Night</th>
            <th className="pb-1 pr-2 w-32">Fee Label (optional)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-1 pr-2"><RoomInput value={r.guest} onChange={(v) => update(i, { guest: v })} onBlur={() => onChange(rows)} /></td>
              <td className="py-1 pr-2"><RoomInput value={r.age ?? ''} onChange={(v) => update(i, { age: v || null })} onBlur={() => onChange(rows)} /></td>
              <td className="py-1 pr-2"><RoomInput value={r.inclusions ?? ''} onChange={(v) => update(i, { inclusions: v || null })} onBlur={() => onChange(rows)} /></td>
              <td className="py-1 pr-2"><RoomNumberInput value={r.feePerNight} onChange={(v) => update(i, { feePerNight: v })} onBlur={() => onChange(rows)} /></td>
              <td className="py-1 pr-2"><RoomInput value={r.feeLabel ?? ''} onChange={(v) => update(i, { feeLabel: v || null })} onBlur={() => onChange(rows)} /></td>
              <td className="py-1 text-right">
                <button type="button" onClick={() => onChange(rows.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-600 text-xs">×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
