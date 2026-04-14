import { type FullDeck } from '@/api/decks.api';
import { type TemplateSlide } from '@/api/templates.api';

/**
 * Builds a hardcoded placeholder FullDeck for the admin Templates editor preview.
 * This is purely visual sample data — never persisted, never sent to the API.
 *
 * The placeholder includes enough realistic data so that every slide type renders
 * meaningfully:
 *   - 1 sample property with destination + 3 priced options + 2 case studies
 *   - 2 objectives (one primary, one secondary)
 *   - 0 differentiators (so the slide shows the 4 hardcoded fallback items
 *     which are the things the admin will most often want to template)
 */
export function buildTemplatePreviewDeck(args: {
  slides: TemplateSlide[];
  templateDefaults: Record<string, string>;
}): FullDeck {
  const { slides, templateDefaults } = args;

  return {
    id: 'template-preview',
    name: 'Sample Hotel',
    status: 'draft',
    locale: 'en-AU',
    coverImage: null,
    heroImage: null,
    customFields: {},
    templateDefaults,
    gallery: [],
    templateId: null,
    slideOrder: slides,
    createdBy: 'preview',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    properties: [
      {
        id: 'sample-property',
        deckId: 'template-preview',
        propertyName: 'Sample Hotel',
        destination: 'Sample Destination',
        isCustomDestination: false,
        grade: 'A',
        tier: 1,
        gmPercentage: null,
        pricingToolFile: null,
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        options: [
          {
            id: 'sample-opt-1',
            propertyId: 'sample-property',
            optionNumber: 1,
            tierLabel: 'Diamond',
            roomType: 'Premium Suite',
            sellPrice: '2999',
            costPrice: '1500',
            nights: 5,
            allocation: 5,
            surcharges: null,
            blackoutDates: null,
            inclusions: ['Daily breakfast', 'Welcome cocktail', 'Spa credit'],
            marketingAssets: { 'At A Glance': true, 'Daily Email': true, 'Paid Search': true },
          },
          {
            id: 'sample-opt-2',
            propertyId: 'sample-property',
            optionNumber: 2,
            tierLabel: 'Platinum',
            roomType: 'Deluxe Room',
            sellPrice: '1999',
            costPrice: '1000',
            nights: 4,
            allocation: 8,
            surcharges: null,
            blackoutDates: null,
            inclusions: ['Daily breakfast', 'Late checkout'],
            marketingAssets: { 'At A Glance': true, 'Daily Email': true },
          },
          {
            id: 'sample-opt-3',
            propertyId: 'sample-property',
            optionNumber: 3,
            tierLabel: 'Gold',
            roomType: 'Standard Room',
            sellPrice: '1499',
            costPrice: '700',
            nights: 3,
            allocation: 12,
            surcharges: null,
            blackoutDates: null,
            inclusions: ['Daily breakfast'],
            marketingAssets: { 'At A Glance': true },
          },
        ],
        caseStudies: [
          {
            id: 'sample-cs-link-1',
            propertyId: 'sample-property',
            caseStudyId: 'sample-cs-1',
            pcmContext: null,
            sortOrder: 0,
            caseStudy: {
              id: 'sample-cs-1',
              title: 'Sample Case Study One',
              hotelName: 'Sample Hotel',
              destination: 'Sample Destination',
              propertyType: 'Resort',
              roomNights: 250,
              revenue: '500000',
              adr: '350',
              alos: '3.2',
              leadTime: 45,
              bookings: 80,
              narrative: 'A successful campaign that delivered strong room nights and high-value bookings.',
              images: null,
              tags: ['beach', 'luxury'],
            },
          },
          {
            id: 'sample-cs-link-2',
            propertyId: 'sample-property',
            caseStudyId: 'sample-cs-2',
            pcmContext: null,
            sortOrder: 1,
            caseStudy: {
              id: 'sample-cs-2',
              title: 'Sample Case Study Two',
              hotelName: 'Sample Hotel',
              destination: 'Sample Destination',
              propertyType: 'Resort',
              roomNights: 180,
              revenue: '380000',
              adr: '320',
              alos: '2.8',
              leadTime: 30,
              bookings: 65,
              narrative: 'A second sample showing strong international demand and high engagement.',
              images: null,
              tags: ['beach'],
            },
          },
        ],
      },
    ],
    objectives: [
      {
        id: 'sample-obj-1',
        deckId: 'template-preview',
        objectiveText: 'Drive incremental room nights and capture demand from new market segments.',
        source: 'template',
        sortOrder: 0,
      },
      {
        id: 'sample-obj-2',
        deckId: 'template-preview',
        objectiveText: 'Increase ADR through premium package positioning and tailored campaigns.',
        source: 'template',
        sortOrder: 1,
      },
    ],
    differentiators: [],
  };
}
