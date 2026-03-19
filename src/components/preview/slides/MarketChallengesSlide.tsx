import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { EditableText } from '../EditableText';

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
  const headline = deck.customFields?.['market-challenges.headline'] ?? 'Market Challenges';
  const subheadline = deck.customFields?.['market-challenges.subheadline'] ?? 'Key challenges facing your property in the current landscape';

  const challengeTexts = DEFAULT_CHALLENGES.map((fallback, i) =>
    deck.customFields?.[`market-challenges.item.${i}`] ?? fallback,
  );

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      <div className="flex-1 flex flex-col p-[5%]">
        {/* Heading */}
        <div className="mb-8">
          <div className="w-16 border-t-2 mb-4" style={{ borderColor: GREEN }} />
          {onFieldChange ? (
            <EditableText
              value={headline}
              onChange={(v) => onFieldChange('custom', deck.id, 'market-challenges.headline', v)}
              className="text-2xl font-bold mb-2 text-gray-800"
              as="h2"
            />
          ) : (
            <h2 className="text-2xl font-bold mb-2 text-gray-800">{headline}</h2>
          )}
          {onFieldChange ? (
            <EditableText
              value={subheadline}
              onChange={(v) => onFieldChange('custom', deck.id, 'market-challenges.subheadline', v)}
              className="text-sm font-light text-gray-500"
              as="p"
            />
          ) : (
            <p className="text-sm font-light text-gray-500">{subheadline}</p>
          )}
        </div>

        {/* Challenge bullets */}
        <div className="flex-1 flex flex-col justify-center gap-4">
          {challengeTexts.map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="mt-1 w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: GREEN }}
              />
              {onFieldChange ? (
                <EditableText
                  value={text}
                  onChange={(v) => onFieldChange('custom', deck.id, `market-challenges.item.${i}`, v)}
                  className="text-[13px] leading-relaxed text-gray-700"
                  as="p"
                  multiline
                />
              ) : (
                <p className="text-[13px] leading-relaxed text-gray-700">{text}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom-right logo */}
      <div className="flex justify-end px-[5%] pb-[3%]">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: GREEN }} />
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#333' }}>
            LUXURY<span className="font-normal">ESCAPES</span>
          </span>
        </div>
      </div>
    </div>
  );
}
