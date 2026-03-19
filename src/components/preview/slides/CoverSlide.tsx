import { useState } from 'react';
import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { EditableText } from '../EditableText';
import { SlideEditableText } from '../SlideEditableText';

type Align = 'left' | 'center' | 'right';

const alignItems: { value: Align; icon: React.ReactNode }[] = [
  {
    value: 'left',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="14" height="1.5" rx=".5" />
        <rect x="1" y="6" width="10" height="1.5" rx=".5" />
        <rect x="1" y="10" width="12" height="1.5" rx=".5" />
        <rect x="1" y="14" width="8" height="1.5" rx=".5" />
      </svg>
    ),
  },
  {
    value: 'center',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="14" height="1.5" rx=".5" />
        <rect x="3" y="6" width="10" height="1.5" rx=".5" />
        <rect x="2" y="10" width="12" height="1.5" rx=".5" />
        <rect x="4" y="14" width="8" height="1.5" rx=".5" />
      </svg>
    ),
  },
  {
    value: 'right',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="14" height="1.5" rx=".5" />
        <rect x="5" y="6" width="10" height="1.5" rx=".5" />
        <rect x="3" y="10" width="12" height="1.5" rx=".5" />
        <rect x="7" y="14" width="8" height="1.5" rx=".5" />
      </svg>
    ),
  },
];

const alignToFlex: Record<Align, string> = {
  left: 'items-start',
  center: 'items-center',
  right: 'items-end',
};

interface CoverSlideProps {
  deck: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

export function CoverSlide({ deck, onFieldChange }: CoverSlideProps) {
  const property = deck.properties[0];
  const hotelName = property?.propertyName ?? deck.name;
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const coverImgUrl = uploadUrl(deck.coverImage);
  const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}${String(new Date().getFullYear()).slice(2)}`;
  const align = (deck.customFields?.['cover.hookAlign'] as Align) || 'center';
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative h-full w-full bg-gray-300 overflow-hidden">
      <div className="absolute inset-0" style={
        coverImgUrl
          ? { backgroundImage: `url(${coverImgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(135deg, #8eb8b0 0%, #b0cfc9 30%, #c8ddd8 60%, #a3c4bd 100%)' }
      } />

      <div className="relative h-full flex flex-col">
        {/* Hook text — upper portion */}
        <div
          className={`flex-1 flex flex-col ${alignToFlex[align]} justify-start pt-[6%] px-[12%]`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <SlideEditableText
            fieldKey="cover.hookText"
            defaultValue="There are more travelers than ever. And they've never been harder to reach."
            customFields={deck.customFields}
            onFieldChange={onFieldChange}
            className="font-bold text-white leading-snug max-w-2xl drop-shadow-md"
            style={{
              fontFamily: 'Arial, "Helvetica Neue", sans-serif',
              fontSize: '45px',
              textAlign: align,
            }}
            as="h1"
            multiline
          />
          {/* Alignment toggle */}
          {onFieldChange && hovered && (
            <div className="mt-3 flex gap-0.5 rounded bg-black/50 p-0.5">
              {alignItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => onFieldChange('custom', '', 'cover.hookAlign', item.value)}
                  className={`p-1.5 rounded transition-colors ${
                    align === item.value
                      ? 'bg-white text-gray-900'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer bar — light semi-opaque */}
        <div className="flex items-center justify-between px-[3%] py-2 bg-white/70">
          <div className="flex items-baseline gap-1">
            {property && onFieldChange ? (
              <EditableText
                value={hotelName}
                onChange={(v) => onFieldChange('property', property.id, 'propertyName', v)}
                className="text-xs font-bold text-gray-900"
                as="span"
              />
            ) : (
              <span className="text-xs font-bold text-gray-900">{hotelName}</span>
            )}
            <span className="text-[10px] text-gray-600 ml-1"><strong>updated</strong> {date}</span>
          </div>
          <div className="flex items-center gap-3">
            <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-3.5 invert" />
            <span className="text-xs font-bold text-gray-900">{quarter}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
