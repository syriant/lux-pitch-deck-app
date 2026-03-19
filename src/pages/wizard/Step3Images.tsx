import { useState, useRef } from 'react';
import { uploadImage, uploadUrl } from '@/api/upload.api';
import { updateDeck } from '@/api/decks.api';

interface Step3Props {
  deckId: string;
  coverImage: string | null;
  heroImage: string | null;
  gallery: string[];
  onBack: () => void;
  onNext: () => void;
}

export function Step3Images({ deckId, coverImage, heroImage, gallery: initialGallery, onBack, onNext }: Step3Props) {
  const [cover, setCover] = useState<string | null>(coverImage);
  const [hero, setHero] = useState<string | null>(heroImage);
  const [gallery, setGallery] = useState<string[]>(initialGallery);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);

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
          {cover ? (
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
          {hero ? (
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
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-md bg-[#01B18B] px-3 py-1.5 text-xs text-white hover:bg-[#009977] disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : '+ Add Images'}
          </button>
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
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-md border border-gray-300 px-6 py-2 text-sm text-gray-700 hover:bg-gray-50">Back</button>
        <button onClick={onNext} className="rounded-md bg-[#01B18B] px-6 py-2 text-sm text-white hover:bg-[#009977]">Next: Objectives</button>
      </div>
    </div>
  );
}
