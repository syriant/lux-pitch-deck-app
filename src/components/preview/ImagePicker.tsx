import { useRef, useState } from 'react';
import { uploadImage, uploadUrl } from '@/api/upload.api';
import { Spinner } from '@/components/common/Spinner';

interface ImagePickerProps {
  gallery: string[];
  currentImage: string | null;
  onSelect: (url: string) => void;
  onUpload?: (url: string) => void | Promise<void>;
  onRemove?: () => void;
  onClose: () => void;
}

export function ImagePicker({ gallery, currentImage, onSelect, onUpload, onRemove, onClose }: ImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const result = await uploadImage(file);
      if (onUpload) {
        await onUpload(result.url);
      }
      onSelect(result.url);
      onClose();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Choose Image</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {gallery.map((url) => {
            const isSelected = url === currentImage;
            return (
              <button
                key={url}
                onClick={() => { onSelect(url); onClose(); }}
                className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
                  isSelected ? 'border-[#01B18B] ring-2 ring-[#01B18B]/30' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <img src={uploadUrl(url) ?? ''} alt="" className="w-full h-32 object-cover" />
                {isSelected && (
                  <div className="absolute top-1 right-1 rounded-full bg-[#01B18B] w-5 h-5 flex items-center justify-center text-white text-xs">
                    ✓
                  </div>
                )}
              </button>
            );
          })}

          {/* Upload new image button */}
          {onUpload && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center text-gray-400 hover:text-gray-500 transition-colors"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-1">
                  <Spinner className="text-[#01B18B]" />
                  <span className="text-xs text-[#01B18B]">Uploading...</span>
                </div>
              ) : (
                <>
                  <span className="text-2xl mb-1">+</span>
                  <span className="text-xs">Upload new</span>
                </>
              )}
            </button>
          )}
        </div>

        {onRemove && currentImage && (
          <button
            onClick={() => { onRemove(); onClose(); }}
            className="mt-3 w-full rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Remove image
          </button>
        )}

        {gallery.length === 0 && !onUpload && (
          <p className="text-sm text-gray-500 text-center py-4">No images in gallery. Upload images in the wizard (Step 3).</p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            if (fileRef.current) fileRef.current.value = '';
          }}
        />
      </div>
    </div>
  );
}
