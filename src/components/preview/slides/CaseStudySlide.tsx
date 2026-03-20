import { type DeckCaseStudyLink, type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { EditableText } from '../EditableText';
import { SlideRichText } from '../SlideRichText';
import { SlideImage } from '../SlideImage';

const GREEN = '#00b2a0';

interface CaseStudySlideProps {
  caseStudies?: DeckCaseStudyLink[];
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

export function CaseStudySlide({ caseStudies, deck, onFieldChange, onGalleryAdd }: CaseStudySlideProps) {
  const hasCaseStudies = caseStudies && caseStudies.length > 0;
  const cf = deck?.customFields;
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      {/* Background image — always clickable to change */}
      <SlideImage
        fieldKey="image.caseStudy"
        customFields={cf}
        gallery={deck?.gallery}
        onFieldChange={onFieldChange}
        onGalleryAdd={onGalleryAdd}
        className="absolute inset-0"
        placeholderText="Background image"
        fallbackGradient="linear-gradient(135deg, #c8ddd8 0%, #a3c4bd 40%, #8eb8b0 70%, #d4e8e4 100%)"
      />

      {/* Content area */}
      <div className="relative flex-1">
        {/* Large "Case Studies" title bottom-left */}
        <div className="absolute bottom-[6%] left-[5%]">
          <SlideRichText
            fieldKey="caseStudy.title"
            defaultValue="Case<br>Studies"
            defaultSize={36}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="font-bold italic text-white"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          />
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
                    onFieldChange ? (
                      <EditableText
                        value={cs.narrative.length > 150 ? cs.narrative.slice(0, 150) + '...' : cs.narrative}
                        onChange={(v) => onFieldChange('case-study', cs.id, 'narrative', v)}
                        className="text-[9px] leading-relaxed"
                        as="p"
                        multiline
                      />
                    ) : (
                      <p className="text-[9px] leading-relaxed" style={{ color: '#555' }}>
                        {cs.narrative.length > 150 ? cs.narrative.slice(0, 150) + '...' : cs.narrative}
                      </p>
                    )
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

      {/* Footer bar */}
      <div className="relative flex items-center justify-between px-[3%] py-2 bg-white/70">
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
