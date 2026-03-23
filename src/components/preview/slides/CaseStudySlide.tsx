import { type DeckCaseStudyLink, type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';
import { SlideImage } from '../SlideImage';
import { uploadUrl } from '@/api/upload.api';

const GREEN = '#00b2a0';

interface CaseStudySlideProps {
  caseStudies?: DeckCaseStudyLink[];
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

function CaseStudyCard({
  cs,
  imageFirst,
  customFields,
  onFieldChange,
}: {
  cs: DeckCaseStudyLink['caseStudy'];
  imageFirst: boolean;
  customFields?: Record<string, string>;
  onFieldChange?: FieldChangeHandler;
}) {
  const imgSrc = cs.images?.[0] ? uploadUrl(cs.images[0]) : null;

  const imageBlock = (
    <div style={{ height: '55%' }} className="overflow-hidden">
      {imgSrc ? (
        <img src={imgSrc} alt={cs.hotelName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #a3c4bd, #c8ddd8)' }} />
      )}
    </div>
  );

  const textBlock = (
    <div style={{ height: '45%' }} className="p-[5%] flex flex-col justify-center overflow-visible">
      <SlideRichText
        fieldKey={`caseStudy.${cs.id}.title`}
        defaultValue={cs.title}
        defaultSize={20}
        customFields={customFields}
        onFieldChange={onFieldChange}
        className="font-bold leading-snug mb-1"
        style={{ color: GREEN }}
      />
      <SlideRichText
        fieldKey={`caseStudy.${cs.id}.narrative`}
        defaultValue={cs.narrative || [cs.destination, cs.region].filter(Boolean).join(' · ') + (cs.roomNights != null ? ` · ${cs.roomNights.toLocaleString()} room nights` : '')}
        defaultSize={15}
        customFields={customFields}
        onFieldChange={onFieldChange}
        className="leading-[1.4]"
        style={{ color: '#333' }}
      />
    </div>
  );

  return (
    <div className="bg-white rounded shadow-lg h-full flex flex-col overflow-visible">
      {imageFirst ? (
        <>{imageBlock}{textBlock}</>
      ) : (
        <>{textBlock}{imageBlock}</>
      )}
    </div>
  );
}

export function CaseStudySlide({ caseStudies, deck, onFieldChange, onGalleryAdd }: CaseStudySlideProps) {
  const hasCaseStudies = caseStudies && caseStudies.length > 0;
  const cf = deck?.customFields;
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const swapped = cf?.['caseStudy.swapped'] === 'true';
  const cards = hasCaseStudies ? caseStudies.slice(0, 2) : [];
  const leftCard = swapped ? cards[1] : cards[0];
  const rightCard = swapped ? cards[0] : cards[1];

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      {/* Background image */}
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
        {/* Background image picker — top-left */}
        {onFieldChange && onGalleryAdd && (
          <div className="absolute top-2 left-2 z-20">
            <SlideImage
              fieldKey="image.caseStudy"
              customFields={cf}
              gallery={deck?.gallery}
              onFieldChange={onFieldChange}
              onGalleryAdd={onGalleryAdd}
              className="w-8 h-8 rounded"
              placeholderText=""
            />
          </div>
        )}

        {/* "Case Studies" title — bottom-left */}
        <div className="absolute bottom-[8%] left-[4%] z-10">
          <h2
            className="text-[42px] font-bold text-white leading-none"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
          >
            Case<br />Studies
          </h2>
        </div>

        {!hasCaseStudies ? (
          <div className="absolute top-[10%] right-[5%] w-[40%]">
            <div className="bg-white/90 rounded-lg p-6 shadow-sm">
              <p className="text-sm text-gray-400">No case studies linked yet</p>
              <p className="text-[10px] text-gray-300 mt-1">Add case studies in the wizard (Step 5)</p>
            </div>
          </div>
        ) : (
          <>
            {/* Left card — image top, text bottom (only when 2 cards) */}
            {leftCard && rightCard && (
              <div className="absolute" style={{ left: '21%', top: '50%', transform: 'translateY(-50%)', width: '36%', height: '80%' }}>
                <CaseStudyCard cs={leftCard.caseStudy} imageFirst={true} customFields={cf} onFieldChange={onFieldChange} />
              </div>
            )}

            {/* Right card — text top, image bottom (or single card) */}
            {(rightCard || (!rightCard && leftCard)) && (
              <div className="absolute" style={{ right: '3%', top: '50%', transform: 'translateY(-50%)', width: '36%', height: '80%' }}>
                <CaseStudyCard cs={(rightCard ?? leftCard)!.caseStudy} imageFirst={false} customFields={cf} onFieldChange={onFieldChange} />
              </div>
            )}

            {/* Swap button */}
            {cards.length === 2 && onFieldChange && (
              <button
                onClick={() => onFieldChange('custom', '', 'caseStudy.swapped', swapped ? 'false' : 'true')}
                className="absolute z-20 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md cursor-pointer"
                style={{ left: '59%', top: '50%', transform: 'translate(-50%, -50%)' }}
                title="Swap cards"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00b2a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 16l-4-4 4-4" />
                  <path d="M17 8l4 4-4 4" />
                  <path d="M3 12h18" />
                </svg>
              </button>
            )}
          </>
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
