import { type FullDeck } from '@/api/decks.api';
import { type SlideDefinition } from './slide-types';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { CoverSlide } from './slides/CoverSlide';
import { HotelIntroSlide } from './slides/HotelIntroSlide';
import { DifferentiatorsSlide } from './slides/DifferentiatorsSlide';
import { ReachSlide } from './slides/ReachSlide';
import { DemographicsSlide } from './slides/DemographicsSlide';
import { RegionStatsSlide } from './slides/RegionStatsSlide';
import { CaseStudySlide } from './slides/CaseStudySlide';
import { ObjectivesSlide } from './slides/ObjectivesSlide';
import { DealOptionsSlide } from './slides/DealOptionsSlide';
import { MarketingAssetsSlide } from './slides/MarketingAssetsSlide';
import { MarketChallengesSlide } from './slides/MarketChallengesSlide';

interface SlideRendererProps {
  slide: SlideDefinition;
  deck: FullDeck;
  scale?: number;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

export function SlideRenderer({ slide, deck, scale, onFieldChange, onGalleryAdd }: SlideRendererProps) {
  const content = renderSlideContent(slide, deck, onFieldChange, onGalleryAdd);

  const style = scale
    ? {
        width: 1280,
        height: 720,
        transform: `scale(${scale})`,
        transformOrigin: 'top left' as const,
      }
    : {};

  return (
    <div
      className="bg-white shadow-lg overflow-hidden"
      style={{
        aspectRatio: '16 / 9',
        ...style,
      }}
    >
      {content}
    </div>
  );
}

function renderSlideContent(slide: SlideDefinition, deck: FullDeck, onFieldChange?: FieldChangeHandler, onGalleryAdd?: (url: string) => void) {
  const ga = onGalleryAdd;
  switch (slide.type) {
    case 'cover':
      return <CoverSlide deck={deck} onFieldChange={onFieldChange} />;
    case 'hotel-intro':
      return <HotelIntroSlide deck={deck} onFieldChange={onFieldChange} />;
    case 'differentiators':
      return <DifferentiatorsSlide deck={deck} onFieldChange={onFieldChange} onGalleryAdd={ga} />;
    case 'reach':
      return <ReachSlide deck={deck} onFieldChange={onFieldChange} onGalleryAdd={ga} />;
    case 'demographics':
      return <DemographicsSlide deck={deck} onFieldChange={onFieldChange} />;
    case 'region-stats':
      return <RegionStatsSlide property={slide.property} deck={deck} onFieldChange={onFieldChange} onGalleryAdd={ga} />;
    case 'case-study':
      return <CaseStudySlide caseStudies={slide.caseStudies} deck={deck} onFieldChange={onFieldChange} onGalleryAdd={ga} />;
    case 'objectives':
      return <ObjectivesSlide objectives={deck.objectives} deck={deck} onFieldChange={onFieldChange} onGalleryAdd={ga} />;
    case 'deal-options':
      return <DealOptionsSlide property={slide.property} onFieldChange={onFieldChange} />;
    case 'marketing-assets':
      return <MarketingAssetsSlide property={slide.property} />;
    case 'market-challenges':
      return <MarketChallengesSlide deck={deck} onFieldChange={onFieldChange} />;
    default:
      return (
        <div className="h-full w-full flex items-center justify-center text-gray-400">
          Unknown slide type: {slide.type}
        </div>
      );
  }
}
