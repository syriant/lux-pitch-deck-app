import { useState, useRef } from 'react';
import { uploadToLibrary } from '@/api/image-library.api';
import { Spinner } from '@/components/common/Spinner';
import { FetchImagesPanel } from '@/components/images/FetchImagesPanel';

interface ImagePickerProps {
  hotelName: string;
  destination?: string;
  existingUrls: string[];
  /** Add a single uploaded image to the case study. */
  onPicked: (url: string) => void;
  /** Approve and add images fetched from the library / LUX / Google. */
  onAddFetched: (urls: string[]) => Promise<void>;
  onError: (msg: string) => void;
  size?: 'sm' | 'md';
}

export function ImagePicker({ hotelName, destination, existingUrls, onPicked, onAddFetched, onError, size = 'md' }: ImagePickerProps) {
  const tileClass = size === 'sm' ? 'w-16 h-16' : 'w-20 h-20';
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'upload' | 'find'>('upload');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            className="w-full max-w-4xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 px-6 pt-4 pb-0 flex items-center justify-between">
              <div className="flex gap-4">
                <TabBtn active={tab === 'upload'} onClick={() => setTab('upload')}>Upload</TabBtn>
                <TabBtn active={tab === 'find'} onClick={() => setTab('find')}>Find images</TabBtn>
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

            {tab === 'upload' && (
              <div className="flex-1 overflow-auto p-6">
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

            {tab === 'find' && (
              hotelName.trim() ? (
                <FetchImagesPanel
                  hotelName={hotelName}
                  destination={destination || null}
                  existingUrls={new Set(existingUrls)}
                  onClose={() => setOpen(false)}
                  onAdd={async (urls) => { await onAddFetched(urls); setOpen(false); }}
                  addTargetLabel="case study"
                />
              ) : (
                <div className="flex-1 overflow-auto p-6">
                  <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                    Enter a hotel name first to search the Image Library, LUX and Google.
                  </div>
                </div>
              )
            )}
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
