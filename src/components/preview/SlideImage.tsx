import { useState } from 'react';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { ImagePicker } from './ImagePicker';
import { OCEAN_TEAL, TEAL_200, TEAL_400 } from './brand';

interface SlideImageProps {
  fieldKey: string;
  customFields?: Record<string, string>;
  /** Image shown when no customFields override is set (e.g. a record's own
      image). Removing an override in the picker reverts to this. */
  defaultValue?: string | null;
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
  defaultValue,
  gallery = [],
  onFieldChange,
  onGalleryAdd,
  className = '',
  fallbackGradient = `linear-gradient(135deg, ${TEAL_400} 0%, ${OCEAN_TEAL} 50%, ${TEAL_200} 100%)`,
  placeholderText = 'Click to set image',
}: SlideImageProps) {
  const [showPicker, setShowPicker] = useState(false);
  const value = customFields?.[fieldKey] || defaultValue || null;
  const imageUrl = uploadUrl(value);

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
          currentImage={value}
          onSelect={handleSelect}
          onUpload={onGalleryAdd}
          // With a defaultValue, removal reverts to it — only offer the button
          // when an override actually exists, and label it accordingly.
          onRemove={
            !defaultValue || customFields?.[fieldKey]
              ? () => onFieldChange?.('custom', '', fieldKey, '')
              : undefined
          }
          removeLabel={defaultValue ? 'Revert to default image' : undefined}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
