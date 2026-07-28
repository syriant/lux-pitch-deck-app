import { type FullDeck } from '@/api/decks.api';
import { SLIDE_DISPLAY_STACK } from '../fonts';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { t, dateLocaleTag } from '../labels';
import { uploadUrl } from '@/api/upload.api';
import { SlideRichText } from '../SlideRichText';
import { SlideImage } from '../SlideImage';
import { TextScaleControl, readTextScale } from '../TextScaleControl';
import { OCEAN_TEAL, SANDY_BEIGE } from '../brand';

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
  // Content text scale — factory sizes × scale; stored .size overrides win as-is.
  const textScale = readTextScale(cf, 'demographics.textScale') / 100;
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString(dateLocaleTag(deck?.renderLocale), { day: 'numeric', month: 'long', year: 'numeric' });
  const bgImgUrl = cf?.['image.demographics'] ? uploadUrl(cf['image.demographics']) : null;

  return (
    <div className="h-full w-full flex flex-col relative" style={{ backgroundColor: SANDY_BEIGE }}>
      {/* Optional background image + per-slide text scale (PPTX reads the same key;
          the preview's rich-text sizes come from stored content, so the scale shows
          in the export) */}
      {deck && onFieldChange && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          <TextScaleControl fieldKey="demographics.textScale" customFields={cf} onFieldChange={onFieldChange} />
          {onGalleryAdd && (
            <SlideImage
              fieldKey="image.demographics"
              customFields={cf}
              gallery={deck.gallery}
              onFieldChange={onFieldChange}
              onGalleryAdd={onGalleryAdd}
              className="w-8 h-8 rounded"
              placeholderText="+"
            />
          )}
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
          style={{ fontFamily: SLIDE_DISPLAY_STACK }}
        />
        <SlideRichText
          fieldKey="demo.subheadline"
          defaultSize={17}
          sizeScale={textScale}
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
              defaultSize={14}
              sizeScale={textScale}
              customFields={cf}
              onFieldChange={onFieldChange}
              className="leading-snug mt-2 font-medium"
            />
          </div>
        ))}
      </div>

      <div className="relative mx-[6%] flex-1 border-t-2 pt-3" style={{ borderColor: OCEAN_TEAL }}>
        <SlideRichText
          fieldKey="demo.audienceTitle"
          defaultSize={20}
          sizeScale={textScale}
          customFields={cf}
          onFieldChange={onFieldChange}
          className="font-bold mb-2"
          style={{ color: OCEAN_TEAL }}
        />
        <ul className="space-y-1 text-[10px]" style={{ color: '#333' }}>
          <li className="flex items-start gap-1.5">
            <span>•</span>
            <SlideRichText
              fieldKey="demo.stat1"
              defaultSize={15}
              sizeScale={textScale}
              customFields={cf}
              onFieldChange={onFieldChange}
              className="flex-1"
            />
          </li>
          <li className="flex items-start gap-1.5">
            <span>•</span>
            <SlideRichText
              fieldKey="demo.stat2"
              defaultSize={15}
              sizeScale={textScale}
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
          <span className="text-[10px] text-gray-600 ml-1"><strong>{t('updated', deck?.renderLocale)}</strong> {date}</span>
        </div>
        <div className="flex items-center gap-3">
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-3.5 invert" />
        </div>
      </div>
    </div>
  );
}
