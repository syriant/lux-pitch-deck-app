import { useState } from 'react';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { ImagePicker } from './ImagePicker';

interface SlideImageProps {
  fieldKey: string;
  customFields?: Record<string, string>;
  gallery?: string[];
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
  className?: string;
  fallbackGradient?: string;
  placeholderText?: string;
}

export function SlideImage({
  fieldKey,
  customFields,
  gallery = [],
  onFieldChange,
  onGalleryAdd,
  className = '',
  fallbackGradient = 'linear-gradient(135deg, #a3c4bd 0%, #8eb8b0 50%, #c8ddd8 100%)',
  placeholderText = 'Click to set image',
}: SlideImageProps) {
  const [showPicker, setShowPicker] = useState(false);
  const imageUrl = uploadUrl(customFields?.[fieldKey] ?? null);

  function handleSelect(url: string) {
    onFieldChange?.('custom', '', fieldKey, url);
  }

  return (
    <>
      <div
        className={`${className} ${onFieldChange ? 'cursor-pointer group' : ''}`}
        style={
          imageUrl
            ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: fallbackGradient }
        }
        onClick={() => onFieldChange && setShowPicker(true)}
      >
        {!imageUrl && (
          <div className="h-full w-full flex items-center justify-center text-white/50 text-xs">
            {onFieldChange ? (
              <span className="group-hover:text-white/80 transition-colors">{placeholderText}</span>
            ) : (
              placeholderText
            )}
          </div>
        )}
        {imageUrl && onFieldChange && (
          <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <span className="text-white text-xs font-medium bg-black/50 rounded px-2 py-1">Click to change</span>
          </div>
        )}
      </div>

      {showPicker && (
        <ImagePicker
          gallery={gallery}
          currentImage={customFields?.[fieldKey] ?? null}
          onSelect={handleSelect}
          onUpload={onGalleryAdd}
          onRemove={() => onFieldChange?.('custom', '', fieldKey, '')}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
