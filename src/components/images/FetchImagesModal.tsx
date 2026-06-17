import { useState, useEffect, useCallback } from 'react';
import { uploadUrl } from '@/api/upload.api';
import { fetchHotelImages, fetchLuxImages, type LibraryImage, type LuxOfferCandidate, type FetchStep } from '@/api/image-library.api';
import { Spinner } from '@/components/common/Spinner';

function stepSourceLabel(source: FetchStep['source']): string {
  switch (source) {
    case 'library': return 'Library';
    case 'lux': return 'LUX';
    case 'google': return 'Google';
  }
}

function stepStatusIcon(status: FetchStep['status']): string {
  switch (status) {
    case 'ok': return '✓';
    case 'skipped': return '–';
    case 'no_match': return '·';
    case 'ambiguous': return '?';
    case 'not_configured': return '!';
  }
}

function stepStatusColor(status: FetchStep['status']): string {
  switch (status) {
    case 'ok': return 'text-[#01B18B]';
    case 'skipped': return 'text-gray-400';
    case 'no_match': return 'text-gray-400';
    case 'ambiguous': return 'text-amber-600';
    case 'not_configured': return 'text-amber-600';
  }
}

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
  return `${months}mo ago`;
}

interface FetchImagesModalProps {
  hotelName: string;
  destination: string | null;
  existingUrls: Set<string>;
  onClose: () => void;
  onAdd: (urls: string[]) => Promise<void>;
  /** Noun for the add button, e.g. "gallery" (default) or "case study". */
  addTargetLabel?: string;
}

/**
 * Shared image-fetch modal: searches the library, LUX and Google for a hotel,
 * lets the user disambiguate LUX matches or skip to Google, and returns the
 * selected image URLs via onAdd. Used by the deck wizard (gallery) and the
 * case-study flow.
 */
export function FetchImagesModal({ hotelName, destination, existingUrls, onClose, onAdd, addTargetLabel = 'gallery' }: FetchImagesModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [steps, setSteps] = useState<FetchStep[]>([]);
  const [adding, setAdding] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [luxCandidates, setLuxCandidates] = useState<LuxOfferCandidate[] | null>(null);
  const [pickingRef, setPickingRef] = useState<string | null>(null);

  const applyResult = useCallback((result: Awaited<ReturnType<typeof fetchHotelImages>>) => {
    setImages(result.images);
    setSteps(result.steps);
    setLuxCandidates(result.luxCandidates && result.luxCandidates.length > 0 ? result.luxCandidates : null);
    const preselect = new Set(result.images.filter((i) => !existingUrls.has(i.url)).map((i) => i.url));
    setSelected(preselect);
  }, [existingUrls]);

  const loadImages = useCallback(async (forceRefresh: boolean, skipLux = false) => {
    setError('');
    const setBusy = forceRefresh ? setFetchingMore : setLoading;
    setBusy(true);
    try {
      const result = await fetchHotelImages({
        hotelName,
        destination: destination ?? undefined,
        limit: 10,
        forceRefresh,
        skipLux,
      });
      applyResult(result);
    } catch {
      setError('Failed to fetch images');
    } finally {
      setBusy(false);
    }
  }, [hotelName, destination, applyResult]);

  useEffect(() => {
    loadImages(false);
  }, [loadImages]);

  async function pickLuxCandidate(ref: string) {
    setPickingRef(ref);
    setError('');
    try {
      await fetchLuxImages({
        hotelName,
        destination: destination ?? undefined,
        ref,
        limit: 10,
      });
      const result = await fetchHotelImages({
        hotelName,
        destination: destination ?? undefined,
        limit: 10,
      });
      applyResult(result);
    } catch {
      setError('Failed to fetch images from LUX');
    } finally {
      setPickingRef(null);
    }
  }

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      await onAdd(Array.from(selected));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Fetch Images for {hotelName}</h3>
            {destination && <p className="text-xs text-gray-500">{destination}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="relative flex-1 overflow-y-auto p-6">
          {(fetchingMore || pickingRef !== null) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-sm">
              <Spinner className="text-[#01B18B]" />
              <p className="text-sm text-gray-700">
                {pickingRef !== null ? 'Fetching high-res images from LUX…' : 'Fetching from LUX and Google…'}
              </p>
              <p className="text-xs text-gray-500">This can take 20–40 seconds while we download and cache full-resolution photos.</p>
            </div>
          )}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Spinner className="text-[#01B18B]" />
              <p className="text-sm text-gray-500">Searching library, LUX, and Google...</p>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : (
            <>
              {luxCandidates && (
                <div className="mb-4 rounded-md border border-[#01B18B]/30 bg-[#E6F9F5] p-3">
                  <p className="mb-2 text-xs font-medium text-gray-800">
                    LUX has multiple properties matching "{hotelName}". Pick the right one to fetch high-res images, or skip to use Google.
                  </p>
                  <div className="space-y-1.5">
                    {luxCandidates.map((cand) => (
                      <button
                        key={cand.ref}
                        type="button"
                        onClick={() => pickLuxCandidate(cand.ref)}
                        disabled={pickingRef !== null}
                        className="w-full rounded-md border border-[#01B18B]/40 bg-white px-3 py-2 text-left text-xs hover:bg-[#E6F9F5] disabled:opacity-50"
                      >
                        <div className="font-medium text-gray-900">{cand.mainText}</div>
                        <div className="text-gray-500">{cand.secondaryText}</div>
                        {pickingRef === cand.ref && <div className="mt-1 text-[#01B18B]">Fetching images…</div>}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { setLuxCandidates(null); void loadImages(true, true); }}
                    disabled={pickingRef !== null || fetchingMore}
                    className="mt-2 text-xs text-gray-600 underline hover:text-gray-800 disabled:opacity-50"
                  >
                    Skip LUX — search Google instead
                  </button>
                </div>
              )}
              {steps.length > 0 && (
                <div className="mb-4 rounded-md border border-gray-200 bg-white p-3 text-xs">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-gray-700">Searched for "{hotelName}"</span>
                    <button
                      onClick={() => loadImages(true)}
                      disabled={fetchingMore}
                      className="text-[#01B18B] hover:underline disabled:opacity-50"
                    >
                      {fetchingMore ? 'Refreshing…' : 'Refresh'}
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {steps.map((step) => (
                      <li key={step.source} className="flex items-start gap-2">
                        <span className={`w-3 shrink-0 text-center font-bold ${stepStatusColor(step.status)}`}>
                          {stepStatusIcon(step.status)}
                        </span>
                        <span className="w-14 shrink-0 font-medium text-gray-600">{stepSourceLabel(step.source)}</span>
                        <span className="text-gray-700">{step.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!luxCandidates && images.some((i) => i.source === 'lux_api') && (
                <div className="mb-4 text-xs">
                  <span className="text-gray-500">Not the right property? </span>
                  <button
                    onClick={() => loadImages(true, true)}
                    disabled={fetchingMore}
                    className="text-[#01B18B] underline hover:text-[#017a68] disabled:opacity-50"
                  >
                    Skip LUX and search Google instead
                  </button>
                </div>
              )}
              {!luxCandidates && images.length === 0 && (
                <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No images found for this hotel.
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                {images.map((img) => {
                  const isSelected = selected.has(img.url);
                  const alreadyAdded = existingUrls.has(img.url);
                  const justFetched = new Date(img.createdAt).getTime() >= Date.now() - 60_000;
                  const badgeLabel = (() => {
                    if (justFetched && img.source === 'lux_api') return 'From LUX · just now';
                    if (justFetched && img.source === 'google_places') return 'From Google · just now';
                    if (img.source === 'lux_api') return `LUX · ${relativeTime(img.createdAt)}`;
                    return `Library · ${relativeTime(img.createdAt)}`;
                  })();
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => toggle(img.url)}
                      disabled={alreadyAdded}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected ? 'border-[#01B18B] ring-2 ring-[#01B18B]/30' : 'border-gray-200'
                      } ${alreadyAdded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}`}
                    >
                      <img src={uploadUrl(img.url) ?? ''} alt="" className="w-full h-40 object-cover" />
                      <div className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {badgeLabel}
                      </div>
                      {alreadyAdded && (
                        <div className="absolute top-2 right-2 rounded bg-[#01B18B] px-1.5 py-0.5 text-[10px] font-medium text-white">
                          Already added
                        </div>
                      )}
                      {isSelected && !alreadyAdded && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#01B18B] flex items-center justify-center text-white text-sm font-bold">✓</div>
                      )}
                      {img.attribution && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-[9px] text-white truncate">
                          {img.attribution}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <span className="text-xs text-gray-500">
            {images.length > 0 && `${selected.size} of ${images.length} selected`}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selected.size === 0 || adding}
              className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
            >
              {adding ? 'Adding...' : `Add ${selected.size} to ${addTargetLabel}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
