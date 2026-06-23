import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type FullDeck } from '@/api/decks.api';
import { getBrandStats } from '@/api/brand-stats.api';
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
import { MarketingAssetsGridSlide } from './slides/MarketingAssetsGridSlide';
import { MarketChallengesSlide } from './slides/MarketChallengesSlide';
import { TacticalInvestmentOverviewSlide } from './slides/TacticalInvestmentOverviewSlide';
import { TacticalAmplificationSlide } from './slides/TacticalAmplificationSlide';
import { TacticalPackageDetailSlide } from './slides/TacticalPackageDetailSlide';
import { CustomPageSlide } from './slides/CustomPageSlide';

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
  // Admin-editable brand figures (e.g. {facebookMembers}) substituted alongside
  // {hotelName}/{destination}. Cached across slides via React Query.
  const { data: brandStats } = useQuery({
    queryKey: ['brand-stats'],
    queryFn: getBrandStats,
    staleTime: 5 * 60 * 1000,
  });

  const placeholders = useMemo<Record<string, string>>(() => {
    const property = slide.property ?? deck.properties[0];
    const yearIso = deck.campaignEnd ?? deck.campaignStart;
    const year = yearIso ? new Date(yearIso).getFullYear() : NaN;
    return {
      hotelName: property?.propertyName ?? deck.name ?? '',
      destination: property?.destination ?? '',
      year: Number.isNaN(year) ? '' : String(year),
      ...Object.fromEntries((brandStats ?? []).map((b) => [b.key, b.value])),
    };
  }, [slide.property, deck.properties, deck.name, deck.campaignStart, deck.campaignEnd, brandStats]);

  const style = scale
    ? {
        width: 1280,
        height: 720,
        transform: `scale(${scale})`,
        transformOrigin: 'top left' as const,
      }
    : {};

  return (
    <DeckRenderContext.Provider value={{ placeholders, deckId: deck.id }}>
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
    case 'marketing-assets-grid':
      return <MarketingAssetsGridSlide property={slide.property} deck={deck} channels={slide.marketingAssetsChannels} onFieldChange={onFieldChange} />;
    case 'marketing-assets':
      return <MarketingAssetsSlide property={slide.property} deck={deck} onFieldChange={onFieldChange} />;
    case 'market-challenges':
      return <MarketChallengesSlide deck={deck} onFieldChange={onFieldChange} />;
    case 'tactical-investment-overview':
      return <TacticalInvestmentOverviewSlide property={slide.property} deck={deck} onFieldChange={onFieldChange} />;
    case 'tactical-amplification':
      return <TacticalAmplificationSlide property={slide.property} deck={deck} onFieldChange={onFieldChange} />;
    case 'tactical-package-detail':
      return <TacticalPackageDetailSlide property={slide.property} option={slide.option} deck={deck} onFieldChange={onFieldChange} />;
    case 'custom-page':
      return <CustomPageSlide imageKey={slide.customImageKey} deck={deck} />;
    default:
      return (
        <div className="h-full w-full flex items-center justify-center text-gray-400">
          Unknown slide type: {slide.type}
        </div>
      );
  }
}
