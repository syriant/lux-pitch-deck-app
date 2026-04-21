import { useState, useEffect, useRef } from 'react';
import {
  searchLibrary,
  uploadToLibrary,
  type LibraryImage,
} from '@/api/image-library.api';
import { uploadUrl } from '@/api/upload.api';
import { Spinner } from '@/components/common/Spinner';

interface ImagePickerProps {
  hotelName: string;
  destination?: string;
  existingUrls: string[];
  onPicked: (url: string) => void;
  onError: (msg: string) => void;
  size?: 'sm' | 'md';
}

export function ImagePicker({ hotelName, destination, existingUrls, onPicked, onError, size = 'md' }: ImagePickerProps) {
  const tileClass = size === 'sm' ? 'w-16 h-16' : 'w-20 h-20';
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'upload' | 'library'>('upload');
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LibraryImage[]>([]);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const existing = new Set(existingUrls);

  useEffect(() => {
    if (!open || tab !== 'library') return;
    setQuery(hotelName);
  }, [open, tab, hotelName]);

  useEffect(() => {
    if (!open || tab !== 'library') return;
    const name = query.trim() || hotelName.trim();
    if (!name) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      searchLibrary(name, destination || undefined)
        .then((rows) => setResults(rows))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open, tab, hotelName, destination]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const row = await uploadToLibrary({
        file,
        hotelName: hotelName.trim() || undefined,
        destination: destination?.trim() || undefined,
        source: 'manual_upload',
      });
      onPicked(row.url);
      setOpen(false);
    } catch {
      onError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setTab('upload'); }}
        className={`${tileClass} rounded border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-400 flex items-center justify-center text-lg`}
        aria-label="Add image"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] rounded-lg bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 px-6 pt-4 pb-0 flex items-center justify-between">
              <div className="flex gap-4">
                <TabBtn active={tab === 'upload'} onClick={() => setTab('upload')}>Upload</TabBtn>
                <TabBtn active={tab === 'library'} onClick={() => setTab('library')}>Image Library</TabBtn>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none pb-2"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {tab === 'upload' && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Upload an image for{' '}
                    <span className="font-medium text-gray-900">{hotelName || '(no hotel set)'}</span>
                    {destination ? <> · {destination}</> : null}.
                    It will be saved to the Image Library.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) handleUpload(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {uploading ? <Spinner size="sm" className="text-white" /> : null}
                    {uploading ? 'Uploading…' : 'Choose file'}
                  </button>
                </div>
              )}

              {tab === 'library' && (
                <div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by hotel name…"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-4 focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
                  />
                  {searching && <div className="text-sm text-gray-500">Searching…</div>}
                  {!searching && results.length === 0 && (
                    <div className="text-sm text-gray-500">
                      {query.trim() ? 'No images in library for this search.' : 'Enter a hotel name to search.'}
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-3">
                    {results.map((img) => {
                      const alreadyUsed = existing.has(img.url);
                      return (
                        <button
                          key={img.id}
                          type="button"
                          disabled={alreadyUsed}
                          onClick={() => { onPicked(img.url); setOpen(false); }}
                          className={`group relative rounded-md overflow-hidden border ${
                            alreadyUsed
                              ? 'border-gray-200 opacity-40 cursor-not-allowed'
                              : 'border-gray-200 hover:border-[#01B18B] cursor-pointer'
                          }`}
                        >
                          <img
                            src={uploadUrl(img.url) ?? ''}
                            alt=""
                            className="w-full h-28 object-cover"
                          />
                          <div className="px-2 py-1.5 text-left">
                            <div className="text-xs font-medium text-gray-900 truncate">{img.hotelName ?? '—'}</div>
                            <div className="text-[10px] text-gray-500 truncate">{sourceLabel(img.source)}</div>
                          </div>
                          {alreadyUsed && (
                            <div className="absolute top-1 left-1 bg-gray-900/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                              in use
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pb-2 -mb-px border-b-2 text-sm ${
        active
          ? 'border-[#01B18B] text-[#01B18B] font-medium'
          : 'border-transparent text-gray-500 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function sourceLabel(src: string): string {
  switch (src) {
    case 'google_places': return 'Google Places';
    case 'pitch_deck': return 'Pitch deck';
    case 'manual_upload': return 'Manual upload';
    default: return src;
  }
}
