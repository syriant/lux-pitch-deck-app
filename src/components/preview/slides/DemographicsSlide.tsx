// Brand colours
const GREEN = '#00b2a0';
const MINT = '#dff0ee';

export function DemographicsSlide() {
  const segments = [
    { title: 'Couples at the peak of their careers with a high disposable income' },
    { title: 'Young families with a desire for premium experiences' },
    { title: 'Empty-nesters spoiling themselves with luxurious holidays' },
    { title: 'Avid travelers taking 2-4 trips a year' },
  ];

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      {/* Header */}
      <div className="px-[6%] pt-[5%] pb-2">
        <h2 className="text-lg font-bold leading-snug" style={{ color: '#333' }}>
          With our <span style={{ color: GREEN }}>affluent and engaged</span> customers turn inspiration into bookings
        </h2>
        <p className="text-[10px] mt-1" style={{ color: '#666' }}>
          Our demographic intelligence reveals who our customers are, how they travel, and what inspires them to book.
        </p>
      </div>

      {/* Photo cards row */}
      <div className="px-[6%] grid grid-cols-4 gap-3 mb-4">
        {segments.map((s, i) => (
          <div key={i} className="flex flex-col">
            {/* Photo placeholder */}
            <div className="h-24 rounded-t-md" style={{
              background: `linear-gradient(${135 + i * 30}deg, #a3c4bd, #c8ddd8, #8eb8b0)`,
            }} />
            <p className="text-[9px] leading-snug mt-2 font-medium" style={{ color: '#333' }}>
              {s.title}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom stats section */}
      <div className="mx-[6%] mb-[4%] border-t-2 pt-3" style={{ borderColor: GREEN }}>
        <p className="text-xs font-bold mb-2" style={{ color: GREEN }}>
          Access our loyal audience:
        </p>
        <ul className="space-y-1 text-[10px]" style={{ color: '#333' }}>
          <li className="flex items-start gap-1.5">
            <span>•</span>
            <span>95% of our members weren't planning to stay at the hotel they booked and 63% weren't planning on visiting the destination until we put it in front of them.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span>•</span>
            <span>Try something new: Only 2.5% would have purchased directly from the hotel's site</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
