import { type FullDeck } from '@/api/decks.api';

// Brand colours
const GREEN = '#00b2a0';

interface HotelIntroSlideProps {
  deck: FullDeck;
}

export function HotelIntroSlide({ deck }: HotelIntroSlideProps) {
  const property = deck.properties[0];
  const hotelName = property?.propertyName ?? deck.name;
  const destination = property?.destination ?? '';

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* Left — green panel with value prop */}
      <div className="w-[50%] flex flex-col p-[5%]" style={{ backgroundColor: GREEN }}>
        {/* LE Logo */}
        <div className="flex items-center gap-1.5 mb-6">
          <div className="w-4 h-4 rounded-full bg-white/30" />
          <span className="text-[11px] font-semibold tracking-wide text-white">
            LUXURY<span className="font-normal">ESCAPES</span>
          </span>
        </div>

        {/* Value proposition text */}
        <div className="flex-1 flex items-center">
          <p className="text-xl font-medium text-white leading-snug italic">
            {destination
              ? `With budgets set to increase and demand in ${destination} projected to grow, now is the ideal time to diversify distribution channels and capture greater market share.`
              : `Now is the ideal time to diversify distribution channels and capture greater market share with Luxury Escapes.`
            }
          </p>
        </div>

        {/* Hotel name */}
        <div className="mt-auto">
          <p className="text-sm font-bold text-white">{hotelName}</p>
        </div>
      </div>

      {/* Right — hotel photo placeholder */}
      <div className="w-[50%]" style={{
        background: 'linear-gradient(180deg, #c8ddd8 0%, #a3c4bd 50%, #8eb8b0 100%)',
      }}>
        <div className="h-full w-full flex items-center justify-center text-white/50 text-xs">
          Hotel photo
        </div>
      </div>
    </div>
  );
}
