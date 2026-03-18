// Brand colours
const GREEN = '#00b2a0';

export function ReachSlide() {
  const regions = [
    { name: 'North America', members: '1.1M+', x: '20%', y: '32%' },
    { name: 'Europe', members: '180k+', x: '45%', y: '25%' },
    { name: 'United Kingdom', members: '700k+', x: '45%', y: '18%' },
    { name: 'Africa', members: '49.5k', x: '45%', y: '55%' },
    { name: 'Middle East', members: '50k+', x: '55%', y: '35%' },
    { name: 'India', members: '1M+', x: '60%', y: '45%' },
    { name: 'Asia', members: '400k', x: '72%', y: '30%' },
    { name: 'Australia', members: '5M+', x: '78%', y: '65%' },
    { name: 'New Zealand', members: '400k+', x: '84%', y: '75%' },
  ];

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Side photo strips */}
      <div className="absolute left-0 top-0 bottom-0 w-[12%]" style={{
        background: 'linear-gradient(180deg, #8eb8b0, #a3c4bd, #c8ddd8)',
      }} />
      <div className="absolute right-0 top-0 bottom-0 w-[12%]" style={{
        background: 'linear-gradient(180deg, #c8ddd8, #a3c4bd, #8eb8b0)',
      }} />

      {/* Center white panel */}
      <div className="absolute left-[10%] right-[10%] top-[5%] bottom-[5%] bg-white rounded shadow-sm flex flex-col items-center px-[4%] py-[3%]">
        {/* Title */}
        <h2 className="text-xl mb-0.5" style={{ color: '#333' }}>
          <span className="italic font-light">Our </span>
          <span className="italic font-normal">reach</span>
        </h2>
        <p className="text-xs mb-4" style={{ color: '#555' }}>
          9 million members globally trust Luxury Escapes
        </p>

        {/* Map area */}
        <div className="flex-1 w-full relative">
          {/* Simple world map silhouette in teal */}
          <svg viewBox="0 0 1000 500" className="absolute inset-0 w-full h-full" style={{ opacity: 0.25 }}>
            <path d="M150,120 C200,80 350,90 380,130 C400,160 360,200 340,230 C320,260 280,290 240,310 C200,330 160,300 140,260 C120,220 110,160 150,120Z" fill={GREEN} />
            <path d="M400,80 C450,60 550,70 600,100 C640,130 620,180 580,200 C540,220 480,210 450,180 C420,150 380,100 400,80Z" fill={GREEN} />
            <path d="M420,220 C460,210 500,230 510,270 C520,310 490,350 450,350 C410,350 390,310 400,270 C405,250 410,230 420,220Z" fill={GREEN} />
            <path d="M560,100 C620,70 720,80 780,120 C820,150 810,200 770,230 C730,260 660,250 630,220 C600,190 540,130 560,100Z" fill={GREEN} />
            <path d="M620,240 C660,220 720,230 740,260 C760,290 740,330 700,340 C660,350 630,330 620,300 C610,270 610,250 620,240Z" fill={GREEN} />
            <path d="M750,300 C790,280 850,300 870,340 C890,380 860,420 820,430 C780,440 740,420 730,380 C720,350 730,320 750,300Z" fill={GREEN} />
          </svg>

          {/* Region markers */}
          {regions.map((r) => (
            <div
              key={r.name}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: r.x, top: r.y }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-0.5" style={{ backgroundColor: '#333' }}>
                <div className="text-center">
                  <div className="text-[8px] font-bold" style={{ color: GREEN }}>{r.members}</div>
                </div>
              </div>
              <div className="text-[7px] whitespace-nowrap" style={{ color: '#666' }}>{r.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
