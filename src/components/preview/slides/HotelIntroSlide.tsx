import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { EditableText } from '../EditableText';
import { SlideEditableText } from '../SlideEditableText';

const GREEN = '#00b2a0';

interface HotelIntroSlideProps {
  deck: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

export function HotelIntroSlide({ deck, onFieldChange }: HotelIntroSlideProps) {
  const property = deck.properties[0];
  const hotelName = property?.propertyName ?? deck.name;
  const destination = property?.destination ?? '';
  const heroImgUrl = uploadUrl(deck.heroImage);

  const defaultIntro = destination
    ? `With budgets set to increase and demand in ${destination} projected to grow, now is the ideal time to diversify distribution channels and capture greater market share.`
    : 'Now is the ideal time to diversify distribution channels and capture greater market share with Luxury Escapes.';

  return (
    <div className="h-full w-full flex overflow-hidden">
      <div className="w-[50%] flex flex-col p-[5%]" style={{ backgroundColor: GREEN }}>
        <div className="flex items-center gap-1.5 mb-6">
          <div className="w-4 h-4 rounded-full bg-white/30" />
          <span className="text-[11px] font-semibold tracking-wide text-white">
            LUXURY<span className="font-normal">ESCAPES</span>
          </span>
        </div>

        <div className="flex-1 flex items-center">
          <SlideEditableText
            fieldKey="hotelIntro.valueProp"
            defaultValue={defaultIntro}
            customFields={deck.customFields}
            onFieldChange={onFieldChange}
            className="text-xl font-medium text-white leading-snug italic"
            as="p"
            multiline
          />
        </div>

        <div className="mt-auto">
          {property && onFieldChange ? (
            <EditableText
              value={hotelName}
              onChange={(v) => onFieldChange('property', property.id, 'propertyName', v)}
              className="text-sm font-bold text-white"
              as="p"
            />
          ) : (
            <p className="text-sm font-bold text-white">{hotelName}</p>
          )}
        </div>
      </div>

      <div className="w-[50%]" style={
        heroImgUrl
          ? { backgroundImage: `url(${heroImgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(180deg, #c8ddd8 0%, #a3c4bd 50%, #8eb8b0 100%)' }
      }>
        {!heroImgUrl && (
          <div className="h-full w-full flex items-center justify-center text-white/50 text-xs">
            Hotel photo
          </div>
        )}
      </div>
    </div>
  );
}
