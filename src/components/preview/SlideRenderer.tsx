import { useMemo } from 'react';
import { type FullDeck } from '@/api/decks.api';
import { type SlideDefinition } from './slide-types';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { DeckRenderContext } from './DeckRenderContext';
import { CoverSlide } from './slides/CoverSlide';
import { HotelIntroSlide } from './slides/HotelIntroSlide';
import { DifferentiatorsSlide } from './slides/DifferentiatorsSlide';
import { ReachSlide } from './slides/ReachSlide';
import { DemographicsSlide } from './slides/DemographicsSlide';
import { RegionStatsSlide } from './slides/RegionStatsSlide';
import { CaseStudySlide } from './slides/CaseStudySlide';
import { ObjectivesSlide } from './slides/ObjectivesSlide';
import { CampaignOptionsSlide } from './slides/CampaignOptionsSlide';
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

  // Resolve placeholder values from the slide's active property (for per-property
  // slides) or the deck's first property (for global slides). Used by SlideRichText
  // to substitute {hotelName} / {destination} etc. in templated text at render time.
  const placeholders = useMemo<Record<string, string>>(() => {
    const property = slide.property ?? deck.properties[0];
    return {
      hotelName: property?.propertyName ?? deck.name ?? '',
      destination: property?.destination ?? '',
    };
  }, [slide.property, deck.properties, deck.name]);

  const style = scale
    ? {
        width: 1280,
        height: 720,
        transform: `scale(${scale})`,
        transformOrigin: 'top left' as const,
      }
    : {};

  return (
    <DeckRenderContext.Provider value={{ placeholders }}>
      <div
        className="bg-white shadow-lg overflow-hidden"
        style={{
          aspectRatio: '16 / 9',
          ...style,
        }}
      >
        {content}
      </div>
    </DeckRenderContext.Provider>
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
      return <DemographicsSlide deck={deck} onFieldChange={onFieldChange} onGalleryAdd={ga} />;
    case 'region-stats':
      return <RegionStatsSlide property={slide.property} deck={deck} onFieldChange={onFieldChange} onGalleryAdd={ga} />;
    case 'case-study':
      return <CaseStudySlide slideId={slide.id} caseStudies={slide.caseStudies} deck={deck} onFieldChange={onFieldChange} onGalleryAdd={ga} />;
    case 'objectives':
      return <ObjectivesSlide objectives={deck.objectives} deck={deck} onFieldChange={onFieldChange} onGalleryAdd={ga} />;
    case 'campaign-options':
      return <CampaignOptionsSlide deck={deck} onFieldChange={onFieldChange} onGalleryAdd={ga} />;
    case 'deal-options':
      return <DealOptionsSlide property={slide.property} deck={deck} onFieldChange={onFieldChange} />;
    case 'marketing-assets':
      return <MarketingAssetsSlide property={slide.property} deck={deck} onFieldChange={onFieldChange} />;
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
