import { type FullDeck } from '@/api/decks.api';

// Brand colours
const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface DifferentiatorsSlideProps {
  deck: FullDeck;
}

const defaultDifferentiators = [
  {
    title: 'High-Value Customers',
    description: 'Access more than 9 million engaged Luxury Escapes members: high-spending travellers looking for inspiration',
  },
  {
    title: 'Reach New Customers',
    description: "More than 90% of Luxury Escapes members weren't planning to stay at the hotel they booked until they discovered it on Luxury Escapes",
  },
];

export function DifferentiatorsSlide({ deck }: DifferentiatorsSlideProps) {
  const items = deck.differentiators.length > 0
    ? deck.differentiators.map((d) => ({
        title: d.differentiator.title,
        description: d.differentiator.description ?? '',
      }))
    : defaultDifferentiators;

  const property = deck.properties[0];
  const hotelName = property?.propertyName ?? deck.name;

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      <div className="flex-1 flex p-[5%] gap-[4%]">
        {/* Left — value prop + differentiators */}
        <div className="flex-1 flex flex-col">
          <p className="text-xl font-light italic leading-snug mb-6" style={{ color: GREEN }}>
            By leveraging Luxury Escapes' global member base, curated campaigns, and{' '}
            <span className="font-semibold not-italic px-1" style={{ backgroundColor: GREEN, color: 'white' }}>
              powerful marketing reach
            </span>{' '}
            {hotelName} can attract premium travellers, generate incremental demand, and strengthen market share
          </p>

          {/* Differentiator cards */}
          <div className="grid grid-cols-2 gap-4 mt-auto">
            {items.slice(0, 4).map((item, i) => (
              <div key={i}>
                <div className="w-8 border-t-2 mb-2" style={{ borderColor: GREEN }} />
                <h3 className="text-sm font-bold mb-1" style={{ color: '#333' }}>
                  {item.title}
                </h3>
                <p className="text-[10px] leading-relaxed" style={{ color: '#555' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — photo placeholder */}
        <div className="w-[40%] rounded-lg overflow-hidden" style={{
          background: 'linear-gradient(135deg, #a3c4bd 0%, #8eb8b0 50%, #c8ddd8 100%)',
        }}>
          <div className="h-full w-full flex items-center justify-center text-white/50 text-xs">
            Hotel photo
          </div>
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
