import { type DeckPropertyFull } from '@/api/decks.api';

// Brand colours
const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface RegionStatsSlideProps {
  property?: DeckPropertyFull;
}

export function RegionStatsSlide({ property }: RegionStatsSlideProps) {
  const destination = property?.destination ?? property?.propertyName ?? 'Your Destination';

  const metrics = [
    { icon: '🛏️', value: '80 – 250', label: 'room nights per campaign' },
    { icon: '📅', value: '3.35 days', label: 'ALOS' },
    { icon: '🌍', value: '68%', label: 'bookings from international markets' },
    { icon: '📆', value: '95 days', label: 'booking window' },
    { icon: '👫', value: '79% couples\n21% families', label: '' },
    { icon: '⬆️', value: '45%', label: 'of members upgraded their packages' },
  ];

  return (
    <div className="h-full w-full flex" style={{ backgroundColor: MINT }}>
      {/* Left content */}
      <div className="flex-1 p-[5%] flex flex-col">
        <div className="mb-4">
          <h2 className="text-xl font-bold leading-snug" style={{ color: '#333' }}>
            {destination}
          </h2>
          <h2 className="text-xl italic font-light" style={{ color: '#333' }}>
            & <span style={{ color: GREEN }}>Luxury Escapes</span>
          </h2>
        </div>

        <p className="text-[10px] leading-relaxed mb-5" style={{ color: '#555' }}>
          Consistent campaigns drive significant increases in production,
          showing the impact of keeping the destination top of mind and
          inspiring travelers to choose {destination} for their next getaway.
        </p>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-lg">{m.icon}</span>
              <div>
                <div className="text-xs font-bold whitespace-pre-line" style={{ color: '#333' }}>{m.value}</div>
                {m.label && <div className="text-[9px]" style={{ color: '#777' }}>{m.label}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto border-t pt-2" style={{ borderColor: GREEN }}>
          <p className="text-[9px] font-semibold" style={{ color: GREEN }}>Market Coverage</p>
          <p className="text-[9px]" style={{ color: '#555' }}>
            • Maximum two {destination} hotels featured per month
          </p>
        </div>
      </div>

      {/* Right photo placeholder */}
      <div className="w-[42%]" style={{
        background: 'linear-gradient(180deg, #a3c4bd, #8eb8b0, #c8ddd8)',
      }}>
        <div className="h-full w-full flex items-center justify-center text-white/50 text-xs">
          Destination photo
        </div>
      </div>
    </div>
  );
}
