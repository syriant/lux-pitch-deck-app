import { type FullDeck, type DeckPropertyFull, type DeckCaseStudyLink, type DeckOption } from '@/api/decks.api';

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
  | 'market-challenges'
  | 'tactical-investment-overview'
  | 'tactical-amplification'
  | 'tactical-package-detail';

export interface SlideDefinition {
  id: string;
  type: SlideType;
  label: string;
  property?: DeckPropertyFull;
  option?: DeckOption;
  caseStudies?: DeckCaseStudyLink[];
  caseStudyChunkIndex?: number;
  marketingAssetsChannels?: string[];
  marketingAssetsChunkIndex?: number;
  removable?: boolean;
}

// Marketing Assets grid is capped at 2 slides (mirror of the API's
// slide-builder). Up to 7 channels sit on one slide; 8-14 split evenly across
// two (still ≤7 each, full size). Beyond 14 the even split puts >7 on a slide
// and the renderer shrinks the text to fit — never a third slide.
const MARKETING_ASSETS_SINGLE_SLIDE_MAX = 7;
const MARKETING_ASSETS_MAX_SLIDES = 2;

function chunkMarketingAssetChannels(channels: string[]): string[][] {
  if (channels.length === 0) return [[]];
  if (channels.length <= MARKETING_ASSETS_SINGLE_SLIDE_MAX) return [channels];
  const perSlide = Math.ceil(channels.length / MARKETING_ASSETS_MAX_SLIDES);
  return [channels.slice(0, perSlide), channels.slice(perSlide)];
}

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
          } else if (slideType === 'tactical-package-detail' && entry.perOption) {
            // Same rooms-aware pick as uniqueOptionsByNumber — rows sharing
            // an optionNumber hold tactical data sparsely, so we must prefer
            // the row that carries it.
            const byOpt = new Map<number, typeof prop.options>();
            for (const o of prop.options) {
              const arr = byOpt.get(o.optionNumber) ?? [];
              arr.push(o);
              byOpt.set(o.optionNumber, arr);
            }
            const opts: typeof prop.options = [];
            for (const rows of byOpt.values()) {
              // A tier only earns a package-detail slide when at least one of
              // its rows is selected — mirrors the side-by-side, which leaves an
              // unselected tier's column empty. Without this, a tier partially
              // filled in the pricing tool but never selected (e.g. option 3)
              // still produced a full slide with auto-pulled rates.
              if (!rows.some((r) => r.selected)) continue;
              const withTactical = rows.find(
                (r) => (r.rooms != null && r.rooms.length > 0)
                  || (r.tacticalDetails != null && Object.keys(r.tacticalDetails).length > 0),
              );
              opts.push(withTactical ?? rows[0]);
            }
            opts.sort((a, b) => a.optionNumber - b.optionNumber);
            for (const opt of opts) {
              const tierName = opt.tierLabel ?? `Option ${opt.optionNumber}`;
              slides.push({
                id: `tactical-package-detail-${prop.id}-${opt.id}`,
                type: slideType,
                label: `${tierName} Package`,
                property: prop,
                option: opt,
                removable: entry.removable,
              });
            }
          } else if (slideType === 'marketing-assets-grid') {
            const channels = computeMarketingAssetChannels(prop, deck.dealTierRules ?? []);
            const chunks = chunkMarketingAssetChannels(channels);
            let mktgOffset = 0;
            for (let ci = 0; ci < chunks.length; ci++) {
              const start = mktgOffset + 1;
              const end = mktgOffset + chunks[ci].length;
              mktgOffset += chunks[ci].length;
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
