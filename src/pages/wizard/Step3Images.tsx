import { useState, useRef } from 'react';
import { uploadImage, uploadUrl } from '@/api/upload.api';
import { updateDeck } from '@/api/decks.api';

interface Step3Props {
  deckId: string;
  coverImage: string | null;
  heroImage: string | null;
  onBack: () => void;
  onNext: () => void;
}

export function Step3Images({ deckId, coverImage, heroImage, onBack, onNext }: Step3Props) {
  const [cover, setCover] = useState<string | null>(coverImage);
  const [hero, setHero] = useState<string | null>(heroImage);
  const [uploading, setUploading] = useState<'cover' | 'hero' | null>(null);
  const [error, setError] = useState('');
  const coverRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);

  async function handleUpload(type: 'cover' | 'hero', file: File) {
    setUploading(type);
    setError('');
    try {
      const result = await uploadImage(file);
      if (type === 'cover') {
        await updateDeck(deckId, { coverImage: result.url });
        setCover(result.url);
      } else {
        await updateDeck(deckId, { heroImage: result.url });
        setHero(result.url);
      }
    } catch {
      setError(`Failed to upload ${type} image`);
    } finally {
      setUploading(null);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Images</h2>
      <p className="text-sm text-gray-500 mb-6">
        Upload a cover image (used as the slide 1 background) and a hero image (used on the hotel intro and other slides).
      </p>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload('cover', f);
              if (coverRef.current) coverRef.current.value = '';
            }}
          />
          {cover ? (
            <div className="relative group">
              <img
                src={uploadUrl(cover) ?? ''}
                alt="Cover"
                className="w-full h-40 object-cover rounded-lg border border-gray-200"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <button
                  onClick={() => coverRef.current?.click()}
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
                >
                  Replace
                </button>
                <button
                  onClick={async () => {
                    await updateDeck(deckId, { coverImage: null });
                    setCover(null);
                  }}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => coverRef.current?.click()}
              disabled={uploading === 'cover'}
              className="w-full h-40 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center text-gray-400 hover:text-gray-500 transition-colors"
            >
              {uploading === 'cover' ? (
                <span className="text-sm">Uploading...</span>
              ) : (
                <>
                  <span className="text-2xl mb-1">+</span>
                  <span className="text-xs">Click to upload cover image</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Hero Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hero / Hotel Image</label>
          <input
            ref={heroRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload('hero', f);
              if (heroRef.current) heroRef.current.value = '';
            }}
          />
          {hero ? (
            <div className="relative group">
              <img
                src={uploadUrl(hero) ?? ''}
                alt="Hero"
                className="w-full h-40 object-cover rounded-lg border border-gray-200"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <button
                  onClick={() => heroRef.current?.click()}
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
                >
                  Replace
                </button>
                <button
                  onClick={async () => {
                    await updateDeck(deckId, { heroImage: null });
                    setHero(null);
                  }}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => heroRef.current?.click()}
              disabled={uploading === 'hero'}
              className="w-full h-40 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center text-gray-400 hover:text-gray-500 transition-colors"
            >
              {uploading === 'hero' ? (
                <span className="text-sm">Uploading...</span>
              ) : (
                <>
                  <span className="text-2xl mb-1">+</span>
                  <span className="text-xs">Click to upload hotel image</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 px-6 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700"
        >
          Next: Objectives
        </button>
      </div>
    </div>
  );
}
