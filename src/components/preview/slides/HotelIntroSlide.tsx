import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { SlideRichText } from '../SlideRichText';
import { AlignToggle, type Align } from '../AlignToggle';
import { FontSizeControl } from '../FontSizeControl';

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
  const align = (deck.customFields?.['hotelIntro.valueAlign'] as Align) || 'left';
  const fontSize = Number(deck.customFields?.['hotelIntro.valueSize']) || 34;

  const defaultIntro = destination
    ? `With budgets set to increase and demand in ${destination} projected to grow, now is the ideal time to diversify distribution channels and capture greater market share.`
    : 'Now is the ideal time to diversify distribution channels and capture greater market share with Luxury Escapes.';

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 flex">
        {/* Left half — green panel */}
        <div
          className="group w-[50%] flex flex-col p-[5%]"
          style={{ backgroundColor: GREEN }}
        >
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-5 w-auto self-start mb-6" />

          <div className="flex-1 flex items-center">
            <SlideRichText
              fieldKey="hotelIntro.valueProp"
              defaultValue={defaultIntro}
              customFields={deck.customFields}
              onFieldChange={onFieldChange}
              className="font-bold text-white leading-snug w-full"
              style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif', fontSize: `${fontSize}px`, textAlign: align }}
            />
          </div>

          {onFieldChange && (
            <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <AlignToggle fieldKey="hotelIntro.valueAlign" align={align} onFieldChange={onFieldChange} />
              <FontSizeControl fieldKey="hotelIntro.valueSize" size={fontSize} onFieldChange={onFieldChange} />
            </div>
          )}
        </div>

        {/* Right half — hero image */}
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
