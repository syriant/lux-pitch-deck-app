import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadImage, uploadUrl } from '@/api/upload.api';
import { updateDeck } from '@/api/decks.api';
import { fetchHotelLogos, lookupLibraryByUrls, uploadToLibrary, approveLibraryImages, type LibraryImage } from '@/api/image-library.api';
import { Spinner } from '@/components/common/Spinner';
import { FetchImagesModal } from '@/components/images/FetchImagesModal';

interface Step3Props {
  deckId: string;
  coverImage: string | null;
  heroImage: string | null;
  logoImage: string | null;
  gallery: string[];
  hotelName: string | null;
  destination: string | null;
  onBack: () => void;
  onNext: () => void;
}

function logoSourceLabel(source: string): string {
  switch (source) {
    case 'brandfetch_logo': return 'From Brandfetch';
    case 'clearbit_logo': return 'From Clearbit';
    case 'google_cse_logo': return 'From Google search';
    case 'manual_upload_logo': return 'Uploaded by a PCM';
    default: return 'From library';
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
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function Step3Images({ deckId, coverImage, heroImage, logoImage, gallery: initialGallery, hotelName, destination, onBack, onNext }: Step3Props) {
  const [cover, setCover] = useState<string | null>(coverImage);
  const [hero, setHero] = useState<string | null>(heroImage);
  const [logo, setLogo] = useState<string | null>(logoImage);
  const [gallery, setGallery] = useState<string[]>(initialGallery);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [error, setError] = useState('');
  const [libraryByUrl, setLibraryByUrl] = useState<Record<string, LibraryImage>>({});
  const [showFetchModal, setShowFetchModal] = useState(false);
  const [showLogoFetchModal, setShowLogoFetchModal] = useState(false);
  const [libraryLogos, setLibraryLogos] = useState<LibraryImage[]>([]);
  const [logosLoading, setLogosLoading] = useState(false);
  const [logoThumbBg, setLogoThumbBg] = useState<ThumbBg>('checker');
  const logoCardBg = THUMB_BGS.find((b) => b.key === logoThumbBg)?.cardClass ?? '';
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (gallery.length === 0) {
      setLibraryByUrl({});
      return;
    }
    lookupLibraryByUrls(gallery).then(setLibraryByUrl).catch(() => setLibraryByUrl({}));
  }, [gallery]);

  const reloadLibraryLogos = useCallback(async () => {
    if (!hotelName) {
      setLibraryLogos([]);
      return;
    }
    setLogosLoading(true);
    try {
      // Cache-only: we don't pass forceGoogle, so this is a free DB lookup.
      const result = await fetchHotelLogos({ hotelName, destination: destination ?? undefined });
      setLibraryLogos(result.images);
    } catch {
      setLibraryLogos([]);
    } finally {
      setLogosLoading(false);
    }
  }, [hotelName, destination]);

  useEffect(() => { void reloadLibraryLogos(); }, [reloadLibraryLogos]);

  async function handleAddToGallery(urls: string[]) {
    const fresh = urls.filter((u) => !gallery.includes(u));
    if (fresh.length === 0) return;
    // Approval: adding to a gallery is the explicit consent that promotes these
    // fetched images into the browsable library.
    await approveLibraryImages(fresh);
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

  // Logos are tagged into the library (source='manual_upload_logo' + hotel
  // name) so future PCMs working on the same hotel can find this logo via
  // the library search instead of re-uploading. Logos do NOT go into the
  // deck's photo gallery — they shouldn't be reused as background images.
  async function handleLogoUpload(file: File) {
    setLogoError('');
    if (file.type !== 'image/png') {
      setLogoError('Logo must be a PNG with a transparent background.');
      return;
    }
    setUploadingLogo(true);
    try {
      const result = await uploadToLibrary({
        file,
        hotelName: hotelName ?? undefined,
        destination: destination ?? undefined,
        source: 'manual_upload_logo',
      });
      await updateDeck(deckId, { logoImage: result.url });
      setLogo(result.url);
      // Refresh the library matches so the new logo appears in the strip.
      void reloadLibraryLogos();
    } catch {
      setLogoError('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoPick(url: string) {
    setLogoError('');
    setUploadingLogo(true);
    try {
      await updateDeck(deckId, { logoImage: url });
      setLogo(url);
    } catch {
      setLogoError('Failed to set logo');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoRemove() {
    setLogoError('');
    setUploadingLogo(true);
    try {
      await updateDeck(deckId, { logoImage: null });
      setLogo(null);
    } catch {
      setLogoError('Failed to remove logo');
    } finally {
      setUploadingLogo(false);
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

      {/* Hotel Logo (transparent PNG) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Hotel Logo (Cover slide, under title)</label>
          {hotelName && (
            <button
              onClick={() => setShowLogoFetchModal(true)}
              className="rounded-md border border-[#01B18B] px-3 py-1.5 text-xs text-[#01B18B] hover:bg-[#E6F9F5]"
            >
              Fetch logo for {hotelName}
            </button>
          )}
        </div>
        <p className="mb-2 text-xs text-gray-500">
          Use a <strong>PNG with a transparent background</strong> — anything else (JPG, white-background PNG) will sit as a solid block on the cover photo.
        </p>
        {(logo || (hotelName && libraryLogos.length > 0)) && (
          <div className="mb-2"><LogoBgPicker value={logoThumbBg} onChange={setLogoThumbBg} /></div>
        )}

        {/* Library matches — surfaces existing logos for this hotel so PCMs
            don't re-upload or burn Google quota when one already exists. */}
        {hotelName && libraryLogos.length > 0 && (
          <div className="mb-3 rounded-md border border-[#01B18B]/30 bg-[#E6F9F5]/60 p-3">
            <div className="mb-2 text-xs text-gray-700">
              {libraryLogos.length === 1
                ? <>1 existing logo found for <strong>{hotelName}</strong> in the library — click to use.</>
                : <>{libraryLogos.length} existing logos found for <strong>{hotelName}</strong> — click to use.</>}
            </div>
            <div className="flex flex-wrap gap-2">
              {libraryLogos.map((img) => {
                const isCurrent = logo === img.url;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => handleLogoPick(img.url)}
                    disabled={uploadingLogo || isCurrent}
                    className={`relative w-24 h-16 rounded border-2 ${
                      isCurrent ? 'border-[#01B18B] ring-2 ring-[#01B18B]/30' : 'border-gray-200 hover:border-[#01B18B]'
                    } overflow-hidden ${logoCardBg} flex items-center justify-center disabled:cursor-not-allowed`}
                    title={logoSourceLabel(img.source)}
                  >
                    <img src={uploadUrl(img.url) ?? ''} alt="" className="max-w-full max-h-full object-contain p-1" />
                    {isCurrent && (
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#01B18B] flex items-center justify-center text-white text-[10px]">✓</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {hotelName && logosLoading && libraryLogos.length === 0 && (
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
            <Spinner size="sm" /> Checking the library for existing logos...
          </div>
        )}
        <input ref={logoRef} type="file" accept="image/png" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); if (logoRef.current) logoRef.current.value = ''; }} />
        {logoError && <div className="mb-2 rounded-md bg-red-50 p-2 text-xs text-red-700">{logoError}</div>}
        {uploadingLogo ? (
          <div className="w-64 h-24 rounded-lg border-2 border-dashed border-[#01B18B] bg-[#E6F9F5] flex flex-col items-center justify-center gap-2">
            <Spinner className="text-[#01B18B]" />
            <span className="text-xs text-[#01B18B]">Working...</span>
          </div>
        ) : logo ? (
          <div className={`relative group w-64 h-24 rounded-lg overflow-hidden border border-gray-200 ${logoCardBg} flex items-center justify-center`}>
            <img src={uploadUrl(logo) ?? ''} alt="Hotel logo" className="max-w-full max-h-full object-contain" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button onClick={() => logoRef.current?.click()} className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-700">Replace</button>
              <button onClick={handleLogoRemove} className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white">Remove</button>
            </div>
          </div>
        ) : (
          <button onClick={() => logoRef.current?.click()} className="w-64 h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center text-gray-400 text-sm">
            + Upload PNG logo
          </button>
        )}
      </div>

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

      {showLogoFetchModal && hotelName && (
        <FetchLogoModal
          hotelName={hotelName}
          destination={destination}
          onClose={() => setShowLogoFetchModal(false)}
          onPick={async (url) => {
            await handleLogoPick(url);
            await reloadLibraryLogos();
            setShowLogoFetchModal(false);
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


interface FetchLogoModalProps {
  hotelName: string;
  destination: string | null;
  onClose: () => void;
  onPick: (url: string) => Promise<void>;
}

// Logos are transparent PNGs; a white-text logo is invisible on a white/checker
// card and reads as an error. Let the PCM switch the preview background to prove
// the logo is really there. Mirrors the cover-logo backdrop swatches.
type ThumbBg = 'checker' | 'light' | 'dark';
const THUMB_BGS: ReadonlyArray<{ key: ThumbBg; label: string; cardClass: string; swatch: string }> = [
  { key: 'checker', label: 'Checkerboard (shows transparency)', cardClass: 'bg-[repeating-conic-gradient(#f3f4f6_0_25%,#ffffff_0_50%)] bg-[length:16px_16px]', swatch: 'bg-[repeating-conic-gradient(#d1d5db_0_25%,#ffffff_0_50%)] bg-[length:8px_8px] border border-gray-300' },
  { key: 'light', label: 'White', cardClass: 'bg-white', swatch: 'bg-white border border-gray-300' },
  { key: 'dark', label: 'Dark (reveals white logos)', cardClass: 'bg-gray-800', swatch: 'bg-gray-800' },
];

function LogoBgPicker({ value, onChange }: { value: ThumbBg; onChange: (b: ThumbBg) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500">Preview background:</span>
      {THUMB_BGS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          title={opt.label}
          aria-label={opt.label}
          className={`w-5 h-5 rounded-sm ${opt.swatch} ${value === opt.key ? 'ring-2 ring-[#01B18B]' : 'opacity-70 hover:opacity-100'}`}
        />
      ))}
      <span className="text-[11px] text-gray-400">If a logo looks blank or wrong, switch the background — a white logo only shows on a dark one, it's not an error.</span>
    </div>
  );
}

function FetchLogoModal({ hotelName, destination, onClose, onPick }: FetchLogoModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  const [picking, setPicking] = useState<string | null>(null);
  const [thumbBg, setThumbBg] = useState<ThumbBg>('checker');
  const cardBg = THUMB_BGS.find((b) => b.key === thumbBg)?.cardClass ?? '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Modal is the explicit "go to Google" action — force a CSE call
        // even if the library already has results. The library matches are
        // already surfaced inline on the Step3 page itself.
        const result = await fetchHotelLogos({
          hotelName,
          destination: destination ?? undefined,
          limit: 12,
          forceGoogle: true,
        });
        if (cancelled) return;
        setImages(result.images);
        setGoogleConfigured(result.googleConfigured);
      } catch {
        if (!cancelled) setError('Failed to fetch logos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hotelName, destination]);

  async function pick(url: string) {
    setPicking(url);
    try {
      await onPick(url);
    } finally {
      setPicking(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Fetch logo for {hotelName}</h3>
            <p className="text-xs text-gray-500">
              Looks up the hotel website via Google Places, then fetches logo variants from Brandfetch. Pick one to set as the cover logo.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Spinner className="text-[#01B18B]" />
              <p className="text-sm text-gray-500">Resolving hotel domain and fetching logos...</p>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : !googleConfigured ? (
            <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              Logo fetch isn't configured — needs both <code>GOOGLE_PLACES_API_KEY</code> (to resolve hotel → domain) and <code>BRANDFETCH_API_KEY</code> (to fetch logos). Ask an admin.
            </div>
          ) : images.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              No logo candidates returned — Places couldn't find a website for this hotel, or Brandfetch has no record of the domain. Upload a PNG manually instead.
            </div>
          ) : (
            <>
              <div className="mb-3"><LogoBgPicker value={thumbBg} onChange={setThumbBg} /></div>
              <div className="grid grid-cols-3 gap-4">
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => pick(img.url)}
                  disabled={picking !== null}
                  className={`relative group rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#01B18B] transition-all ${cardBg} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="h-32 flex items-center justify-center p-3">
                    <img src={uploadUrl(img.url) ?? ''} alt="" className="max-w-full max-h-full object-contain" />
                  </div>
                  {picking === img.url && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <Spinner className="text-[#01B18B]" />
                    </div>
                  )}
                </button>
              ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
