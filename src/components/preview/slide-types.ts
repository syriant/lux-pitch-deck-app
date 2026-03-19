import { type FullDeck, type DeckPropertyFull, type DeckCaseStudyLink } from '@/api/decks.api';

export type SlideType =
  | 'cover'
  | 'hotel-intro'
  | 'differentiators'
  | 'reach'
  | 'demographics'
  | 'region-stats'
  | 'case-study'
  | 'objectives'
  | 'deal-options'
  | 'marketing-assets'
  | 'market-challenges';

export interface SlideDefinition {
  id: string;
  type: SlideType;
  label: string;
  property?: DeckPropertyFull;
  caseStudies?: DeckCaseStudyLink[];
}

export function buildSlideList(deck: FullDeck): SlideDefinition[] {
  // If deck has a template-driven slideOrder, use it
  if (deck.slideOrder && deck.slideOrder.length > 0) {
    return buildFromSlideOrder(deck);
  }

  // Fallback: hardcoded layout (backwards compat for decks without templates)
  return buildHardcodedList(deck);
}

function buildFromSlideOrder(deck: FullDeck): SlideDefinition[] {
  const slides: SlideDefinition[] = [];

  for (const entry of deck.slideOrder!) {
    const slideType = entry.type as SlideType;

    if (entry.perProperty) {
      if (deck.properties.length > 0) {
        for (const prop of deck.properties) {
          slides.push({
            id: `${slideType}-${prop.id}`,
            type: slideType,
            label: getPerPropertyLabel(slideType, entry.label, prop),
            property: prop,
            caseStudies: slideType === 'case-study' ? prop.caseStudies : undefined,
          });
        }
      } else {
        slides.push({
          id: `${slideType}-empty`,
          type: slideType,
          label: entry.label,
        });
      }
    } else {
      slides.push({
        id: slideType,
        type: slideType,
        label: entry.label,
      });
    }
  }

  return slides;
}

function getPerPropertyLabel(type: SlideType, defaultLabel: string, prop: DeckPropertyFull): string {
  switch (type) {
    case 'region-stats':
      return `${prop.destination ?? prop.propertyName} & LE`;
    case 'deal-options':
      return `${prop.propertyName} Options`;
    case 'marketing-assets':
      return `${prop.propertyName} Details`;
    case 'case-study':
      return 'Case Studies';
    default:
      return defaultLabel;
  }
}

function buildHardcodedList(deck: FullDeck): SlideDefinition[] {
  const slides: SlideDefinition[] = [];

  // 1. Cover — always
  slides.push({ id: 'cover', type: 'cover', label: 'Cover' });

  // 2. Hotel Intro — always
  slides.push({ id: 'hotel-intro', type: 'hotel-intro', label: 'Hotel Intro' });

  // 3. Differentiators — always
  slides.push({ id: 'differentiators', type: 'differentiators', label: 'Why Partner With Us' });

  // 4. Reach — always
  slides.push({ id: 'reach', type: 'reach', label: 'Our Reach' });

  // 5. Demographics — always
  slides.push({ id: 'demographics', type: 'demographics', label: 'Our Customers' });

  // 6. Region Stats — one per property (or one placeholder)
  if (deck.properties.length > 0) {
    for (const prop of deck.properties) {
      slides.push({
        id: `region-stats-${prop.id}`,
        type: 'region-stats',
        label: `${prop.destination ?? prop.propertyName} & LE`,
        property: prop,
      });
    }
  } else {
    slides.push({ id: 'region-stats-empty', type: 'region-stats', label: 'Destination & LE' });
  }

  // 7. Case Studies — one per property (or one placeholder)
  if (deck.properties.length > 0) {
    for (const prop of deck.properties) {
      slides.push({
        id: `case-study-${prop.id}`,
        type: 'case-study',
        label: 'Case Studies',
        property: prop,
        caseStudies: prop.caseStudies,
      });
    }
  } else {
    slides.push({ id: 'case-study-empty', type: 'case-study', label: 'Case Studies' });
  }

  // 8. Objectives — always
  slides.push({ id: 'objectives', type: 'objectives', label: 'Campaign Objectives' });

  // 9. Deal Options — one per property (or one placeholder)
  if (deck.properties.length > 0) {
    for (const prop of deck.properties) {
      slides.push({
        id: `deal-options-${prop.id}`,
        type: 'deal-options',
        label: `${prop.propertyName} Options`,
        property: prop,
      });
    }
  } else {
    slides.push({ id: 'deal-options-empty', type: 'deal-options', label: 'Campaign Options' });
  }

  // 10. Marketing Assets / continued options — one per property (or one placeholder)
  if (deck.properties.length > 0) {
    for (const prop of deck.properties) {
      slides.push({
        id: `marketing-assets-${prop.id}`,
        type: 'marketing-assets',
        label: `${prop.propertyName} Details`,
        property: prop,
      });
    }
  } else {
    slides.push({ id: 'marketing-assets-empty', type: 'marketing-assets', label: 'Campaign Details' });
  }

  return slides;
}
