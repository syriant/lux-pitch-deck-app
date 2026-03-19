import { useRef, useState } from 'react';
import { uploadImage, uploadUrl } from '@/api/upload.api';

interface ImagePickerProps {
  gallery: string[];
  currentImage: string | null;
  onSelect: (url: string) => void;
  onUpload?: (url: string) => void;
  onClose: () => void;
}

export function ImagePicker({ gallery, currentImage, onSelect, onUpload, onClose }: ImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const result = await uploadImage(file);
      onUpload?.(result.url);
      onSelect(result.url);
      onClose();
    } catch {
      // Could show error, but keeping it simple
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
                  isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <img src={uploadUrl(url) ?? ''} alt="" className="w-full h-32 object-cover" />
                {isSelected && (
                  <div className="absolute top-1 right-1 rounded-full bg-blue-500 w-5 h-5 flex items-center justify-center text-white text-xs">
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
                <span className="text-sm">Uploading...</span>
              ) : (
                <>
                  <span className="text-2xl mb-1">+</span>
                  <span className="text-xs">Upload new</span>
                </>
              )}
            </button>
          )}
        </div>

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
