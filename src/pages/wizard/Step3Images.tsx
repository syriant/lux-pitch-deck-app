import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadImage, uploadUrl } from '@/api/upload.api';
import { updateDeck } from '@/api/decks.api';
import { fetchHotelImages, lookupLibraryByUrls, type LibraryImage } from '@/api/image-library.api';
import { Spinner } from '@/components/common/Spinner';

interface Step3Props {
  deckId: string;
  coverImage: string | null;
  heroImage: string | null;
  gallery: string[];
  hotelName: string | null;
  destination: string | null;
  onBack: () => void;
  onNext: () => void;
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
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function Step3Images({ deckId, coverImage, heroImage, gallery: initialGallery, hotelName, destination, onBack, onNext }: Step3Props) {
  const [cover, setCover] = useState<string | null>(coverImage);
  const [hero, setHero] = useState<string | null>(heroImage);
  const [gallery, setGallery] = useState<string[]>(initialGallery);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [error, setError] = useState('');
  const [libraryByUrl, setLibraryByUrl] = useState<Record<string, LibraryImage>>({});
  const [showFetchModal, setShowFetchModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (gallery.length === 0) {
      setLibraryByUrl({});
      return;
    }
    lookupLibraryByUrls(gallery).then(setLibraryByUrl).catch(() => setLibraryByUrl({}));
  }, [gallery]);

  async function handleAddToGallery(urls: string[]) {
    const fresh = urls.filter((u) => !gallery.includes(u));
    if (fresh.length === 0) return;
    const updated = [...gallery, ...fresh];
    await updateDeck(deckId, { gallery: updated });
    setGallery(updated);
  }

  async function handleGalleryUpload(files: FileList) {
    setUploading(true);
    setError('');
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const result = await uploadImage(file);
        urls.push(result.url);
      }
      const updated = [...gallery, ...urls];
      await updateDeck(deckId, { gallery: updated });
      setGallery(updated);
    } catch {
      setError('Failed to upload images');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSpecialUpload(type: 'cover' | 'hero', file: File) {
    setError('');
    const setLoading = type === 'cover' ? setUploadingCover : setUploadingHero;
    setLoading(true);
    try {
      const result = await uploadImage(file);
      // Also add to gallery
      const updatedGallery = [...gallery, result.url];
      if (type === 'cover') {
        await updateDeck(deckId, { coverImage: result.url, gallery: updatedGallery });
        setCover(result.url);
      } else {
        await updateDeck(deckId, { heroImage: result.url, gallery: updatedGallery });
        setHero(result.url);
      }
      setGallery(updatedGallery);
    } catch {
      setError(`Failed to upload ${type} image`);
    } finally {
      setLoading(false);
    }
  }

  async function removeFromGallery(url: string) {
    const updated = gallery.filter((u) => u !== url);
    const patch: { gallery: string[]; coverImage?: null; heroImage?: null } = { gallery: updated };
    if (cover === url) { patch.coverImage = null; setCover(null); }
    if (hero === url) { patch.heroImage = null; setHero(null); }
    await updateDeck(deckId, patch);
    setGallery(updated);
  }

  async function assignAs(url: string, type: 'cover' | 'hero') {
    if (type === 'cover') {
      await updateDeck(deckId, { coverImage: url });
      setCover(url);
    } else {
      await updateDeck(deckId, { heroImage: url });
      setHero(url);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Images</h2>
      <p className="text-sm text-gray-500 mb-6">
        Upload images for this deck. Assign a cover and hero image, and add as many gallery images as you need.
        In the preview, you can click any image placeholder to assign from this gallery.
      </p>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Cover & Hero assignments */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image (Slide 1 background)</label>
          <input ref={coverRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSpecialUpload('cover', f); if (coverRef.current) coverRef.current.value = ''; }} />
          {uploadingCover ? (
            <div className="w-full h-32 rounded-lg border-2 border-dashed border-[#01B18B] bg-[#E6F9F5] flex flex-col items-center justify-center gap-2">
              <Spinner className="text-[#01B18B]" />
              <span className="text-xs text-[#01B18B]">Uploading cover...</span>
            </div>
          ) : cover ? (
            <div className="relative group h-32 rounded-lg overflow-hidden border border-gray-200">
              <img src={uploadUrl(cover) ?? ''} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={() => coverRef.current?.click()} className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-700">Replace</button>
              </div>
            </div>
          ) : (
            <button onClick={() => coverRef.current?.click()} className="w-full h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center text-gray-400 text-sm">
              + Upload cover
            </button>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hero / Hotel Image (Slide 2)</label>
          <input ref={heroRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSpecialUpload('hero', f); if (heroRef.current) heroRef.current.value = ''; }} />
          {uploadingHero ? (
            <div className="w-full h-32 rounded-lg border-2 border-dashed border-[#01B18B] bg-[#E6F9F5] flex flex-col items-center justify-center gap-2">
              <Spinner className="text-[#01B18B]" />
              <span className="text-xs text-[#01B18B]">Uploading hero...</span>
            </div>
          ) : hero ? (
            <div className="relative group h-32 rounded-lg overflow-hidden border border-gray-200">
              <img src={uploadUrl(hero) ?? ''} alt="Hero" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={() => heroRef.current?.click()} className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-700">Replace</button>
              </div>
            </div>
          ) : (
            <button onClick={() => heroRef.current?.click()} className="w-full h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center text-gray-400 text-sm">
              + Upload hero
            </button>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Image Gallery ({gallery.length} images)
          </label>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files?.length) handleGalleryUpload(e.target.files); }} />
          <div className="flex items-center gap-2">
            {hotelName && (
              <button
                onClick={() => setShowFetchModal(true)}
                className="rounded-md border border-[#01B18B] px-3 py-1.5 text-xs text-[#01B18B] hover:bg-[#E6F9F5]"
              >
                Fetch for {hotelName}
              </button>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-md bg-[#01B18B] px-3 py-1.5 text-xs text-white hover:bg-[#009977] disabled:opacity-50"
            >
              {uploading ? <><Spinner size="sm" className="text-white inline-block mr-1.5" /> Uploading...</> : '+ Add Images'}
            </button>
          </div>
        </div>

        {gallery.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-400">No images yet. Upload images to use across your slides.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {gallery.map((url) => (
              <div key={url} className="relative group rounded-lg overflow-hidden border border-gray-200">
                <img src={uploadUrl(url) ?? ''} alt="" className="w-full h-24 object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  {cover !== url && (
                    <button onClick={() => assignAs(url, 'cover')} className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700">Set as Cover</button>
                  )}
                  {hero !== url && (
                    <button onClick={() => assignAs(url, 'hero')} className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700">Set as Hero</button>
                  )}
                  <button onClick={() => removeFromGallery(url)} className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-medium text-white">Remove</button>
                </div>
                {/* Badge for assigned images */}
                {(cover === url || hero === url) && (
                  <div className="absolute top-1 left-1 rounded bg-[#01B18B] px-1.5 py-0.5 text-[9px] font-medium text-white">
                    {cover === url ? 'Cover' : 'Hero'}
                  </div>
                )}
                {libraryByUrl[url] && cover !== url && hero !== url && (
                  <div
                    className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white"
                    title={`From library · ${relativeTime(libraryByUrl[url].createdAt)}`}
                  >
                    Library · {relativeTime(libraryByUrl[url].createdAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showFetchModal && hotelName && (
        <FetchImagesModal
          hotelName={hotelName}
          destination={destination}
          existingUrls={new Set(gallery)}
          onClose={() => setShowFetchModal(false)}
          onAdd={async (urls) => {
            await handleAddToGallery(urls);
            setShowFetchModal(false);
          }}
        />
      )}

      {!cover && !hero && (
        <p className="mb-2 text-xs text-amber-600">Please upload a cover and hero image before proceeding.</p>
      )}
      {(cover && !hero) && (
        <p className="mb-2 text-xs text-amber-600">Please upload a hero image before proceeding.</p>
      )}
      {(!cover && hero) && (
        <p className="mb-2 text-xs text-amber-600">Please upload a cover image before proceeding.</p>
      )}

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-md border border-gray-300 px-6 py-2 text-sm text-gray-700 hover:bg-gray-50">Back</button>
        <button
          onClick={onNext}
          disabled={!cover || !hero}
          className="rounded-md bg-[#01B18B] px-6 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
        >
          Next: Objectives
        </button>
      </div>
    </div>
  );
}

interface FetchImagesModalProps {
  hotelName: string;
  destination: string | null;
  existingUrls: Set<string>;
  onClose: () => void;
  onAdd: (urls: string[]) => Promise<void>;
}

function FetchImagesModal({ hotelName, destination, existingUrls, onClose, onAdd }: FetchImagesModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [googleUsed, setGoogleUsed] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  const [cachedCount, setCachedCount] = useState(0);
  const [adding, setAdding] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);

  const loadImages = useCallback(async (forceGoogle: boolean) => {
    setError('');
    const setBusy = forceGoogle ? setFetchingMore : setLoading;
    setBusy(true);
    try {
      const result = await fetchHotelImages({
        hotelName,
        destination: destination ?? undefined,
        limit: 10,
        forceGoogle,
      });
      setImages(result.images);
      setGoogleUsed(result.googleUsed);
      setGoogleConfigured(result.googleConfigured);
      setCachedCount(result.cachedCount);
      const preselect = new Set(result.images.filter((i) => !existingUrls.has(i.url)).map((i) => i.url));
      setSelected(preselect);
    } catch {
      setError('Failed to fetch images');
    } finally {
      setBusy(false);
    }
  }, [hotelName, destination, existingUrls]);

  useEffect(() => {
    loadImages(false);
  }, [loadImages]);

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

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Spinner className="text-[#01B18B]" />
              <p className="text-sm text-gray-500">Searching library and Google Places...</p>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : images.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              {!googleConfigured
                ? 'No cached images found. Google Places API key is not configured, so we can\'t fetch new images.'
                : 'No images found for this hotel.'}
            </div>
          ) : (
            <>
              {!googleConfigured && (
                <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  Google Places API key not configured — showing cached library results only.
                </div>
              )}
              {googleConfigured && cachedCount > 0 && !googleUsed && (
                <div className="mb-4 rounded-md bg-[#E6F9F5] border border-[#01B18B]/30 p-3 text-xs text-gray-700 flex items-center justify-between">
                  <span>Showing {cachedCount} cached {cachedCount === 1 ? 'image' : 'images'} for this hotel. No Google Places call was made.</span>
                  <button
                    onClick={() => loadImages(true)}
                    disabled={fetchingMore}
                    className="ml-3 shrink-0 rounded-md border border-[#01B18B] px-3 py-1 text-xs text-[#01B18B] hover:bg-white disabled:opacity-50"
                  >
                    {fetchingMore ? 'Fetching...' : 'Fetch more from Google'}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                {images.map((img) => {
                  const isSelected = selected.has(img.url);
                  const alreadyInGallery = existingUrls.has(img.url);
                  const isLibrary = img.source !== 'google_places' || !googleUsed || new Date(img.createdAt).getTime() < Date.now() - 60_000;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => toggle(img.url)}
                      disabled={alreadyInGallery}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected ? 'border-[#01B18B] ring-2 ring-[#01B18B]/30' : 'border-gray-200'
                      } ${alreadyInGallery ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}`}
                    >
                      <img src={uploadUrl(img.url) ?? ''} alt="" className="w-full h-40 object-cover" />
                      <div className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {isLibrary
                          ? `Library · ${relativeTime(img.createdAt)}`
                          : 'From Google · just now'}
                      </div>
                      {alreadyInGallery && (
                        <div className="absolute top-2 right-2 rounded bg-[#01B18B] px-1.5 py-0.5 text-[10px] font-medium text-white">
                          Already added
                        </div>
                      )}
                      {isSelected && !alreadyInGallery && (
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
            {googleUsed && ' · includes new Google Places results'}
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
              {adding ? 'Adding...' : `Add ${selected.size} to gallery`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
