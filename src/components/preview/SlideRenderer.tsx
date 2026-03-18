import { type FullDeck } from '@/api/decks.api';
import { type SlideDefinition } from './slide-types';
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

interface SlideRendererProps {
  slide: SlideDefinition;
  deck: FullDeck;
  scale?: number;
}

export function SlideRenderer({ slide, deck, scale }: SlideRendererProps) {
  const content = renderSlideContent(slide, deck);

  // Slides use 16:9 aspect ratio (1280x720 base)
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

function renderSlideContent(slide: SlideDefinition, deck: FullDeck) {
  switch (slide.type) {
    case 'cover':
      return <CoverSlide deck={deck} />;
    case 'hotel-intro':
      return <HotelIntroSlide deck={deck} />;
    case 'differentiators':
      return <DifferentiatorsSlide deck={deck} />;
    case 'reach':
      return <ReachSlide />;
    case 'demographics':
      return <DemographicsSlide />;
    case 'region-stats':
      return <RegionStatsSlide property={slide.property} />;
    case 'case-study':
      return <CaseStudySlide caseStudies={slide.caseStudies} />;
    case 'objectives':
      return <ObjectivesSlide objectives={deck.objectives} />;
    case 'deal-options':
      return <DealOptionsSlide property={slide.property} />;
    case 'marketing-assets':
      return <MarketingAssetsSlide property={slide.property} />;
    default:
      return (
        <div className="h-full w-full flex items-center justify-center text-gray-400">
          Unknown slide type: {slide.type}
        </div>
      );
  }
}
