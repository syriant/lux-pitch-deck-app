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
  | 'campaign-options'
  | 'deal-options'
  | 'marketing-assets-grid'
  | 'marketing-assets'
  | 'market-challenges';

export interface SlideDefinition {
  id: string;
  type: SlideType;
  label: string;
  property?: DeckPropertyFull;
  caseStudies?: DeckCaseStudyLink[];
  caseStudyChunkIndex?: number;
  marketingAssetsChannels?: string[];
  marketingAssetsChunkIndex?: number;
  removable?: boolean;
}

const MARKETING_ASSETS_PAGE_SIZE = 6;

function findRulesByTierForProperty(
  rules: NonNullable<FullDeck['dealTierRules']>,
  property: { grade: string | null; destination: string | null },
): Record<number, { assetEntitlements: Record<string, string> } | undefined> {
  const out: Record<number, { assetEntitlements: Record<string, string> } | undefined> = {};
  if (!property.grade) return out;
  const sameGrade = rules.filter((r) => r.grade === property.grade);
  let matches = sameGrade;
  if (property.destination) {
    const exact = sameGrade.filter((r) => r.destination === property.destination);
    if (exact.length > 0) matches = exact;
    else {
      const partial = sameGrade.filter(
        (r) => property.destination!.toLowerCase().includes(r.destination.toLowerCase())
          || r.destination.toLowerCase().includes(property.destination!.toLowerCase()),
      );
      if (partial.length > 0) matches = partial;
    }
  }
  for (const tier of [1, 2, 3] as const) {
    out[tier] = matches.find((r) => r.tier === tier);
  }
  return out;
}

export function computeMarketingAssetChannels(
  prop: DeckPropertyFull,
  rules: NonNullable<FullDeck['dealTierRules']> = [],
): string[] {
  const rulesByTier = findRulesByTierForProperty(rules, { grade: prop.grade, destination: prop.destination });
  const all = new Set<string>();
  for (const tier of [1, 2, 3] as const) {
    const r = rulesByTier[tier];
    if (r) for (const ch of Object.keys(r.assetEntitlements)) all.add(ch);
  }
  const seen = new Set<number>();
  const opts = prop.options.filter((o) => {
    if (seen.has(o.optionNumber)) return false;
    seen.add(o.optionNumber);
    return true;
  });
  return Array.from(all).filter((ch) => opts.some((o) => o.marketingAssets?.[ch] === true));
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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
          if (slideType === 'case-study') {
            const chunks = chunkCaseStudies(prop.caseStudies ?? []);
            for (let ci = 0; ci < chunks.length; ci++) {
              const suffix = chunks.length > 1 ? ` (${ci * 2 + 1}-${ci * 2 + chunks[ci].length})` : '';
              slides.push({
                id: `case-study-${prop.id}-${ci}`,
                type: slideType,
                label: `Case Studies${suffix}`,
                property: prop,
                caseStudies: chunks[ci],
                caseStudyChunkIndex: ci,
                removable: entry.removable,
              });
            }
          } else if (slideType === 'marketing-assets-grid') {
            const channels = computeMarketingAssetChannels(prop, deck.dealTierRules ?? []);
            const chunks = channels.length === 0 ? [[]] : chunkArray(channels, MARKETING_ASSETS_PAGE_SIZE);
            for (let ci = 0; ci < chunks.length; ci++) {
              const start = ci * MARKETING_ASSETS_PAGE_SIZE + 1;
              const end = start + chunks[ci].length - 1;
              const suffix = chunks.length > 1 ? ` (${start}-${end})` : '';
              slides.push({
                id: `marketing-assets-grid-${prop.id}-${ci}`,
                type: slideType,
                label: `${prop.propertyName} Marketing Assets${suffix}`,
                property: prop,
                marketingAssetsChannels: chunks[ci],
                marketingAssetsChunkIndex: ci,
                removable: entry.removable,
              });
            }
          } else {
            slides.push({
              id: `${slideType}-${prop.id}`,
              type: slideType,
              label: getPerPropertyLabel(slideType, entry.label, prop),
              property: prop,
              removable: entry.removable,
            });
          }
        }
      } else {
        slides.push({
          id: `${slideType}-empty`,
          type: slideType,
          label: entry.label,
          removable: entry.removable,
        });
      }
    } else {
      slides.push({
        id: slideType,
        type: slideType,
        label: entry.label,
        removable: entry.removable,
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
    case 'marketing-assets-grid':
      return `${prop.propertyName} Marketing Assets`;
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

  // 7. Case Studies — chunked into pairs, one slide per pair per property
  if (deck.properties.length > 0) {
    for (const prop of deck.properties) {
      const chunks = chunkCaseStudies(prop.caseStudies ?? []);
      for (let ci = 0; ci < chunks.length; ci++) {
        const suffix = chunks.length > 1 ? ` (${ci * 2 + 1}-${ci * 2 + chunks[ci].length})` : '';
        slides.push({
          id: `case-study-${prop.id}-${ci}`,
          type: 'case-study',
          label: `Case Studies${suffix}`,
          property: prop,
          caseStudies: chunks[ci],
          caseStudyChunkIndex: ci,
        });
      }
    }
  } else {
    slides.push({ id: 'case-study-empty', type: 'case-study', label: 'Case Studies' });
  }

  // 8. Objectives — always
  slides.push({ id: 'objectives', type: 'objectives', label: 'Campaign Objectives' });

  // 9. Campaign Options — always
  slides.push({ id: 'campaign-options', type: 'campaign-options', label: 'Campaign Options' });

  // 10. Deal Options — one per property (or one placeholder)
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

function chunkCaseStudies(caseStudies: DeckCaseStudyLink[]): DeckCaseStudyLink[][] {
  if (caseStudies.length === 0) return [[]];
  const chunks: DeckCaseStudyLink[][] = [];
  for (let i = 0; i < caseStudies.length; i += 2) {
    chunks.push(caseStudies.slice(i, i + 2));
  }
  return chunks;
}
