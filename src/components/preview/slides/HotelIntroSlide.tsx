import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { SlideRichText } from '../SlideRichText';

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
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const cf = { ...deck.templateDefaults, ...deck.customFields };

  const defaultIntro = destination
    ? `With budgets set to increase and demand in ${destination} projected to grow, now is the ideal time to diversify distribution channels and capture greater market share.`
    : 'Now is the ideal time to diversify distribution channels and capture greater market share with Luxury Escapes.';

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 flex">
        <div className="w-[50%] flex flex-col p-[5%]" style={{ backgroundColor: GREEN }}>
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-5 w-auto self-start mb-6" />

          <div className="flex-1 flex items-center">
            <SlideRichText
              fieldKey="hotelIntro.valueProp"
              defaultValue={defaultIntro}
              defaultSize={34}
              customFields={cf}
              onFieldChange={onFieldChange}
              className="font-bold text-white leading-snug"
              style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif' }}
            />
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
