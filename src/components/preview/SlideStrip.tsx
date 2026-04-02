import { type FullDeck } from '@/api/decks.api';
import { type SlideDefinition } from './slide-types';
import { SlideThumbnail } from './SlideThumbnail';

interface SlideStripProps {
  slides: SlideDefinition[];
  deck: FullDeck;
  activeIndex: number;
  hiddenSlides?: string[];
  onSelect: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onToggleHidden?: (slideId: string) => void;
}

export function SlideStrip({ slides, deck, activeIndex, hiddenSlides = [], onSelect, onReorder, onToggleHidden }: SlideStripProps) {
  function handleDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(fromIndex) && fromIndex !== toIndex && onReorder) {
      onReorder(fromIndex, toIndex);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  return (
    <div className="w-72 shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col py-2 px-2 gap-1 scrollbar-thin">
      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-2 mb-1">
        Slides
      </div>
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          draggable={!!onReorder}
          onDragStart={(e) => handleDragStart(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          onDragOver={handleDragOver}
        >
          <SlideThumbnail
            slide={slide}
            deck={deck}
            index={i}
            isActive={i === activeIndex}
            isHidden={hiddenSlides.includes(slide.id)}
            onClick={() => onSelect(i)}
            onToggleHidden={onToggleHidden ? () => onToggleHidden(slide.id) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
