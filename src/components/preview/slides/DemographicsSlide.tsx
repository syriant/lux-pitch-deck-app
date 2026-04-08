import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { SlideRichText } from '../SlideRichText';
import { SlideImage } from '../SlideImage';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface DemographicsSlideProps {
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

// Segment images live in the component (not user-editable). Text comes from SLIDE_DEFAULTS.
const segmentImages = [
  '/demo-couples.jpeg',
  '/demo-families.jpeg',
  '/demo-empty-nesters.jpeg',
  '/demo-avid-travellers.jpeg',
];

export function DemographicsSlide({ deck, onFieldChange, onGalleryAdd }: DemographicsSlideProps) {
  const cf = { ...deck?.templateDefaults, ...deck?.customFields };
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const bgImgUrl = cf?.['image.demographics'] ? uploadUrl(cf['image.demographics']) : null;

  return (
    <div className="h-full w-full flex flex-col relative" style={{ backgroundColor: MINT }}>
      {/* Optional background image */}
      {deck && onFieldChange && onGalleryAdd && (
        <div className="absolute top-2 right-2 z-10">
          <SlideImage
            fieldKey="image.demographics"
            customFields={cf}
            gallery={deck.gallery}
            onFieldChange={onFieldChange}
            onGalleryAdd={onGalleryAdd}
            className="w-8 h-8 rounded"
            placeholderText="+"
          />
        </div>
      )}
      {bgImgUrl && (
        <div className="absolute inset-0" style={{ backgroundImage: `url(${bgImgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="absolute inset-0 bg-white/85" />
        </div>
      )}
      <div className="relative px-[6%] pt-[5%] pb-2">
        <SlideRichText
          fieldKey="demo.headline"
          customFields={cf}
          onFieldChange={onFieldChange}
          className="font-bold leading-snug"
          style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif' }}
        />
        <SlideRichText
          fieldKey="demo.subheadline"
          customFields={cf}
          onFieldChange={onFieldChange}
          className="mt-1"
        />
      </div>

      <div className="relative px-[6%] grid grid-cols-4 gap-3 mb-4">
        {segmentImages.map((image, i) => (
          <div key={i} className="flex flex-col">
            <div className="h-28 rounded-lg overflow-hidden">
              <img src={image} alt="" className="w-full h-full object-cover" />
            </div>
            <SlideRichText
              fieldKey={`demo.segment.${i}`}
              customFields={cf}
              onFieldChange={onFieldChange}
              className="leading-snug mt-2 font-medium"
            />
          </div>
        ))}
      </div>

      <div className="relative mx-[6%] flex-1 border-t-2 pt-3" style={{ borderColor: GREEN }}>
        <SlideRichText
          fieldKey="demo.audienceTitle"
          customFields={cf}
          onFieldChange={onFieldChange}
          className="font-bold mb-2"
          style={{ color: GREEN }}
        />
        <ul className="space-y-1 text-[10px]" style={{ color: '#333' }}>
          <li className="flex items-start gap-1.5">
            <span>•</span>
            <SlideRichText
              fieldKey="demo.stat1"
              customFields={cf}
              onFieldChange={onFieldChange}
              className="flex-1"
            />
          </li>
          <li className="flex items-start gap-1.5">
            <span>•</span>
            <SlideRichText
              fieldKey="demo.stat2"
              customFields={cf}
              onFieldChange={onFieldChange}
              className="flex-1"
            />
          </li>
        </ul>
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
