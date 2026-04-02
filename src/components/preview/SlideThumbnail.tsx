import { type FullDeck } from '@/api/decks.api';
import { type SlideDefinition } from './slide-types';
import { SlideRenderer } from './SlideRenderer';

interface SlideThumbnailProps {
  slide: SlideDefinition;
  deck: FullDeck;
  index: number;
  isActive: boolean;
  isHidden?: boolean;
  onClick: () => void;
  onToggleHidden?: () => void;
}

export function SlideThumbnail({ slide, deck, index, isActive, isHidden, onClick, onToggleHidden }: SlideThumbnailProps) {
  // Thumbnail width: 240px → scale = 240 / 1280 ≈ 0.1875
  const thumbWidth = 240;
  const scale = thumbWidth / 1280;
  const thumbHeight = thumbWidth * (9 / 16);

  return (
    <button
      onClick={onClick}
      className={`group flex items-start gap-2 w-full text-left rounded-md p-1.5 transition-colors ${
        isActive ? 'bg-[#E6F9F5]' : 'hover:bg-gray-50'
      }`}
    >
      <span className="text-[10px] text-gray-400 font-mono mt-1 w-4 text-right shrink-0">
        {index + 1}
      </span>
      <div className="relative">
        <div
          className={`rounded border-2 overflow-hidden shrink-0 ${
            isActive ? 'border-[#01B18B] shadow-sm' : 'border-gray-200 group-hover:border-gray-300'
          } ${isHidden ? 'opacity-40 grayscale' : ''}`}
          style={{ width: thumbWidth, height: thumbHeight }}
        >
          <div style={{ width: thumbWidth, height: thumbHeight, overflow: 'hidden' }}>
            <SlideRenderer slide={slide} deck={deck} scale={scale} />
          </div>
        </div>
        {slide.removable && onToggleHidden && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHidden();
            }}
            className={`absolute top-1 right-1 p-1 rounded-full transition-opacity ${
              isHidden
                ? 'bg-gray-600/80 text-white opacity-100'
                : 'bg-white/80 text-gray-500 opacity-0 group-hover:opacity-100'
            } hover:bg-gray-700 hover:text-white`}
            title={isHidden ? 'Show slide' : 'Hide slide'}
          >
            {isHidden ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </button>
  );
}
