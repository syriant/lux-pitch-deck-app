import { type FullDeck } from '@/api/decks.api';
import { type SlideDefinition } from './slide-types';
import { SlideRenderer } from './SlideRenderer';

interface SlideThumbnailProps {
  slide: SlideDefinition;
  deck: FullDeck;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

export function SlideThumbnail({ slide, deck, index, isActive, onClick }: SlideThumbnailProps) {
  // Thumbnail width: 240px → scale = 240 / 1280 ≈ 0.1875
  const thumbWidth = 240;
  const scale = thumbWidth / 1280;
  const thumbHeight = thumbWidth * (9 / 16);

  return (
    <button
      onClick={onClick}
      className={`group flex items-start gap-2 w-full text-left rounded-md p-1.5 transition-colors ${
        isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      <span className="text-[10px] text-gray-400 font-mono mt-1 w-4 text-right shrink-0">
        {index + 1}
      </span>
      <div
        className={`rounded border-2 overflow-hidden shrink-0 ${
          isActive ? 'border-blue-500 shadow-sm' : 'border-gray-200 group-hover:border-gray-300'
        }`}
        style={{ width: thumbWidth, height: thumbHeight }}
      >
        <div style={{ width: thumbWidth, height: thumbHeight, overflow: 'hidden' }}>
          <SlideRenderer slide={slide} deck={deck} scale={scale} />
        </div>
      </div>
    </button>
  );
}
