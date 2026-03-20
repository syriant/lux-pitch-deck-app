import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface MarketChallengesSlideProps {
  deck: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

const DEFAULT_CHALLENGES = [
  'Increasing competition from alternative accommodation platforms',
  'Rising customer acquisition costs across traditional channels',
  'Seasonal demand fluctuations impacting occupancy rates',
  'Need for differentiated positioning in a crowded market',
];

export function MarketChallengesSlide({ deck, onFieldChange }: MarketChallengesSlideProps) {
  const cf = deck.customFields;
  const hotelName = deck.properties[0]?.propertyName ?? deck.name;
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      <div className="flex-1 flex flex-col p-[5%]">
        {/* Heading */}
        <div className="mb-8">
          <div className="w-16 border-t-2 mb-4" style={{ borderColor: GREEN }} />
          <SlideRichText
            fieldKey="market-challenges.headline"
            defaultValue="Market Challenges"
            defaultSize={24}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="font-bold mb-2 text-gray-800"
          />
          <SlideRichText
            fieldKey="market-challenges.subheadline"
            defaultValue="Key challenges facing your property in the current landscape"
            defaultSize={14}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="font-light text-gray-500"
          />
        </div>

        {/* Challenge bullets */}
        <div className="flex-1 flex flex-col justify-center gap-4">
          {DEFAULT_CHALLENGES.map((fallback, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="mt-1 w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: GREEN }}
              />
              <SlideRichText
                fieldKey={`market-challenges.item.${i}`}
                defaultValue={fallback}
                defaultSize={13}
                customFields={cf}
                onFieldChange={onFieldChange}
                className="leading-relaxed text-gray-700"
              />
            </div>
          ))}
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
