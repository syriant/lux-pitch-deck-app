import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';
import { SlideImage } from '../SlideImage';
import { DraggableSlideElement, resetSlideElementPosition } from '../DraggableSlideElement';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';
const HEADLINE_FIELD_KEY = 'diff.headline';

function isPositioned(cf: Record<string, string>, fieldKey: string): boolean {
  const x = cf[`${fieldKey}.x`];
  const y = cf[`${fieldKey}.y`];
  return x !== undefined && x !== '' && y !== undefined && y !== '';
}

interface DifferentiatorsSlideProps {
  deck: FullDeck;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

interface DiffItem {
  key: string;
  title?: string;
  description?: string;
}

export function DifferentiatorsSlide({ deck, onFieldChange, onGalleryAdd }: DifferentiatorsSlideProps) {
  // Real differentiators from the deck, or 4 fallback slots whose text comes from SLIDE_DEFAULTS
  const items: DiffItem[] = deck.differentiators.length > 0
    ? deck.differentiators.map((d) => ({
        key: d.id,
        title: d.differentiator.title,
        description: d.differentiator.description ?? '',
      }))
    : [0, 1, 2, 3].map((i) => ({ key: `default-${i}` }));

  const hotelName = deck.properties[0]?.propertyName ?? deck.name;
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const cf = { ...deck.templateDefaults, ...deck.customFields };

  const headlinePositioned = isPositioned(cf, HEADLINE_FIELD_KEY);

  return (
    <div data-slide-root="true" className="relative h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      <div className="flex-1 flex p-[5%] gap-[4%]">
        <div className="flex-1 flex flex-col">
          <DraggableSlideElement
            fieldKey={HEADLINE_FIELD_KEY}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="mb-4 group/headline"
          >
            <SlideRichText
              fieldKey="diff.headline"
              customFields={cf}
              onFieldChange={onFieldChange}
              className="font-bold leading-snug"
              style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif', color: GREEN }}
            />
            {onFieldChange && headlinePositioned && (
              <button
                type="button"
                onClick={() => resetSlideElementPosition(HEADLINE_FIELD_KEY, onFieldChange)}
                className="absolute -top-7 right-0 rounded bg-black/60 px-2 py-1 text-[10px] text-white/90 hover:text-white opacity-0 group-hover/headline:opacity-100 transition-opacity"
                title="Move headline back to default position"
              >
                ↺ Reset position
              </button>
            )}
          </DraggableSlideElement>

          <div className="grid grid-cols-2 gap-4 mt-auto">
            {items.map((item) => (
              <div key={item.key}>
                <div className="w-8 border-t-2 mb-2" style={{ borderColor: GREEN }} />
                <SlideRichText
                  fieldKey={`diff.title.${item.key}`}
                  defaultValue={item.title}
                  defaultSize={14}
                  customFields={cf}
                  onFieldChange={onFieldChange}
                  className="font-bold mb-1"
                />
                <SlideRichText
                  fieldKey={`diff.desc.${item.key}`}
                  defaultValue={item.description}
                  defaultSize={10}
                  customFields={cf}
                  onFieldChange={onFieldChange}
                  className="leading-relaxed"
                />
              </div>
            ))}
          </div>
        </div>

        <SlideImage
          fieldKey="image.differentiators"
          customFields={cf}
          gallery={deck.gallery}
          onFieldChange={onFieldChange}
          onGalleryAdd={onGalleryAdd}
          className="w-[40%] overflow-hidden"
          placeholderText="Hotel photo"
        />
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-[3%] py-2 bg-white/70">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-bold text-gray-900">{hotelName}</span>
          <span className="text-[10px] text-gray-600 ml-1"><strong>updated</strong> {date}</span>
        </div>
        <div className="flex items-center gap-3">
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-3.5 invert" />
        </div>
      </div>
    </div>
  );
}
