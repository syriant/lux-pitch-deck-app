import { type DeckCaseStudyLink } from '@/api/decks.api';

// Brand colours
const GREEN = '#00b2a0';

interface CaseStudySlideProps {
  caseStudies?: DeckCaseStudyLink[];
}

export function CaseStudySlide({ caseStudies }: CaseStudySlideProps) {
  const hasCaseStudies = caseStudies && caseStudies.length > 0;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Background photo placeholder */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #c8ddd8 0%, #a3c4bd 40%, #8eb8b0 70%, #d4e8e4 100%)',
      }} />

      {/* Large "Case Studies" title bottom-left */}
      <div className="absolute bottom-[6%] left-[5%]">
        <h2 className="text-4xl font-bold italic text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          Case
        </h2>
        <h2 className="text-4xl font-bold italic text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          Studies
        </h2>
      </div>

      {!hasCaseStudies ? (
        /* Empty state */
        <div className="absolute top-[10%] right-[5%] w-[50%]">
          <div className="bg-white/90 rounded-lg p-6 shadow-sm">
            <p className="text-sm text-gray-400">No case studies linked yet</p>
            <p className="text-[10px] text-gray-300 mt-1">Add case studies in the wizard (Step 5)</p>
          </div>
        </div>
      ) : (
        /* Case study cards — overlaid on background, staggered */
        <div className="absolute top-[5%] right-[4%] w-[55%] space-y-3">
          {caseStudies.slice(0, 2).map((link, i) => {
            const cs = link.caseStudy;
            return (
              <div
                key={link.id}
                className="bg-white/95 rounded-lg shadow-sm p-4 backdrop-blur-sm"
                style={{ marginLeft: i === 1 ? '0' : '15%', marginRight: i === 1 ? '15%' : '0' }}
              >
                {/* Mini photo placeholder */}
                <div className="h-16 rounded-md mb-2" style={{
                  background: `linear-gradient(${120 + i * 60}deg, #a3c4bd, #c8ddd8)`,
                }} />
                <h3 className="text-xs font-bold mb-1" style={{ color: GREEN }}>
                  {cs.hotelName}
                </h3>
                {cs.narrative ? (
                  <p className="text-[9px] leading-relaxed" style={{ color: '#555' }}>
                    {cs.narrative.length > 150 ? cs.narrative.slice(0, 150) + '...' : cs.narrative}
                  </p>
                ) : (
                  <p className="text-[9px]" style={{ color: '#999' }}>
                    {[cs.destination, cs.region].filter(Boolean).join(' · ')}
                    {cs.roomNights != null && ` · ${cs.roomNights.toLocaleString()} room nights`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
