import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  adminListLibrary,
  updateLibraryImage,
  deleteLibraryImage,
  bulkDeleteLibraryImages,
  type LibraryImage,
} from '@/api/image-library.api';
import { uploadUrl } from '@/api/upload.api';
import { Spinner } from '@/components/common/Spinner';

const PAGE_SIZE = 60;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function ImageLibrary() {
  const [items, setItems] = useState<LibraryImage[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<LibraryImage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibraryImage | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [viewing, setViewing] = useState<LibraryImage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminListLibrary({
        q: q || undefined,
        source: source || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setError('Failed to load image library');
    } finally {
      setLoading(false);
    }
  }, [q, source, offset]);

  useEffect(() => { load(); }, [load]);

  // Clear selection when the visible page changes
  useEffect(() => { setSelected(new Set()); }, [items]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setOffset(0);
    setQ(searchInput.trim());
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteLibraryImage(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch {
      setError('Failed to delete image');
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((i) => i.id));
    });
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    try {
      await bulkDeleteLibraryImages(Array.from(selected));
      setBulkDeleteOpen(false);
      setSelected(new Set());
      await load();
    } catch {
      setError('Failed to delete selected images');
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Image Library</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cached hotel images. Library results are reused across decks to save on Google Places costs.
          </p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex items-center gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by hotel name or destination..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
          />
          <button type="submit" className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977]">
            Search
          </button>
          {q && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setQ(''); setOffset(0); }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </form>
        <select
          value={source}
          onChange={(e) => { setSource(e.target.value); setOffset(0); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All sources</option>
          <option value="google_places">Google Places</option>
          <option value="upload">Manual upload</option>
        </select>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <span>
          {total} total {total === 1 ? 'image' : 'images'}
          {q && ` matching "${q}"`}
        </span>
        {items.length > 0 && (
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-[#01B18B] hover:underline"
          >
            {selected.size === items.length ? 'Deselect all' : 'Select all on this page'}
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="mb-3 rounded-md bg-[#E6F9F5] border border-[#01B18B]/30 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-gray-700">{selected.size} selected</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-gray-600 hover:underline"
            >
              Clear
            </button>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
            >
              Delete selected
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner className="text-[#01B18B]" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">
          No images found{q && ` matching "${q}"`}.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {items.map((img) => {
            const isSelected = selected.has(img.id);
            return (
            <div key={img.id} className={`group rounded-lg overflow-hidden border bg-white transition-colors ${isSelected ? 'border-[#01B18B] ring-2 ring-[#01B18B]/30' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => setViewing(img)}
                className="relative w-full aspect-[4/3] bg-gray-100 block cursor-zoom-in"
              >
                <img src={uploadUrl(img.url) ?? ''} alt="" className="w-full h-full object-cover" />
                <label
                  className="absolute top-2 left-2 flex items-center justify-center w-6 h-6 rounded bg-white/90 border border-gray-300 cursor-pointer hover:bg-white"
                  onClick={(e) => { e.stopPropagation(); toggleSelected(img.id); }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {/* handled by label onClick */}}
                    onClick={(e) => e.stopPropagation()}
                    className="pointer-events-none"
                  />
                </label>
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {img.source === 'google_places' ? 'Google' : img.source === 'upload' ? 'Upload' : img.source}
                  </span>
                  <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {relativeTime(img.createdAt)}
                  </span>
                </div>
              </button>
              <div className="p-3">
                <div className="text-xs font-medium text-gray-900 truncate" title={img.hotelName ?? ''}>
                  {img.hotelName || <span className="text-gray-400 italic">No hotel</span>}
                </div>
                <div className="text-xs text-gray-500 truncate" title={img.destination ?? ''}>
                  {img.destination || <span className="text-gray-400 italic">No destination</span>}
                </div>
                {img.attribution && (
                  <div className="text-[10px] text-gray-400 truncate mt-1" title={img.attribution}>
                    {img.attribution}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setEditing(img)}
                    className="text-[#01B18B] hover:underline text-xs"
                  >
                    Edit tags
                  </button>
                  <button
                    onClick={() => setDeleteTarget(img)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {editing && (
        <EditTagsModal
          image={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            try {
              await updateLibraryImage(editing.id, data);
              setEditing(null);
              await load();
            } catch {
              setError('Failed to update image');
            }
          }}
        />
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setViewing(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setViewing(null); }}
            className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300"
            aria-label="Close"
          >
            ×
          </button>
          <div
            className="max-w-5xl max-h-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={uploadUrl(viewing.url) ?? ''}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded"
            />
            <div className="mt-3 text-xs text-white/80 text-center">
              <div className="font-medium text-white">{viewing.hotelName ?? 'No hotel'}</div>
              {viewing.destination && <div>{viewing.destination}</div>}
              {viewing.attribution && <div className="mt-1 text-white/60">{viewing.attribution}</div>}
              <div className="mt-1 text-white/60">
                {viewing.source === 'google_places' ? 'Google Places' : viewing.source} · {relativeTime(viewing.createdAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete {selected.size} {selected.size === 1 ? 'image' : 'images'}?</h3>
            <p className="mt-2 text-sm text-gray-600">
              These will be removed from the library and will no longer be available for auto-fetch.
              Decks already using any of these images will keep their S3 copies.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setBulkDeleteOpen(false)}
                disabled={bulkDeleting}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete image</h3>
            <p className="mt-2 text-sm text-gray-600">
              Remove this image from the library? It will no longer be available for auto-fetch.
              Note: decks already using this image will keep the S3 copy.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface EditTagsModalProps {
  image: LibraryImage;
  onClose: () => void;
  onSave: (data: { hotelName: string | null; destination: string | null }) => Promise<void>;
}

function EditTagsModal({ image, onClose, onSave }: EditTagsModalProps) {
  const [hotelName, setHotelName] = useState(image.hotelName ?? '');
  const [destination, setDestination] = useState(image.destination ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        hotelName: hotelName.trim() || null,
        destination: destination.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form onSubmit={handleSave} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Edit image tags</h3>
        <div className="mt-3 rounded-md overflow-hidden bg-gray-100">
          <img src={uploadUrl(image.url) ?? ''} alt="" className="w-full h-48 object-cover" />
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Hotel name</label>
            <input
              type="text"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
