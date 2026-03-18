import { type FullDeck } from '@/api/decks.api';

// Brand colours
const GREEN = '#00b2a0';

interface CoverSlideProps {
  deck: FullDeck;
}

export function CoverSlide({ deck }: CoverSlideProps) {
  const property = deck.properties[0];
  const hotelName = property?.propertyName ?? deck.name;
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="relative h-full w-full bg-gray-300 overflow-hidden">
      {/* Photo placeholder — gradient simulates a blurred destination image */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #8eb8b0 0%, #b0cfc9 30%, #c8ddd8 60%, #a3c4bd 100%)',
      }} />

      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-black/15" />

      {/* Large headline */}
      <div className="relative h-full flex flex-col justify-between p-[6%]">
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-3xl font-bold text-white text-center leading-snug max-w-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            There are more travelers than ever. And they've never been <span className="underline decoration-2">harder</span> to reach.
          </h1>
        </div>

        {/* Bottom bar */}
        <div className="flex items-end justify-between">
          <div>
            <span className="text-sm font-bold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              {hotelName}
            </span>
            <span className="text-xs text-white/80 ml-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              updated {date}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: GREEN }} />
            <span className="text-xs font-semibold text-white tracking-wide" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              LUXURY<span className="font-normal">ESCAPES</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
