import { type DeckCaseStudyLink, type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { t, dateLocaleTag } from '../labels';
import { SlideRichText } from '../SlideRichText';
import { buildCaseStudyMetricVars, buildCaseStudyStatTiles, hiddenCaseStudyTileKeys, type CaseStudyStatTile } from '../case-study-metrics';
import { TextScaleControl, readTextScale } from '../TextScaleControl';
import { SlideImage } from '../SlideImage';
import { DraggableSlideElement, resetSlideElementPosition } from '../DraggableSlideElement';
import { SLIDE_DISPLAY_STACK } from '../fonts';
import { OCEAN_TEAL, TEAL_100, TEAL_200, TEAL_400, SANDY_BEIGE, SOFT_LINE, INK } from '../brand';

const TITLE_FIELD_KEY = 'caseStudy.heading';

interface CaseStudySlideProps {
  slideId?: string;
  caseStudies?: DeckCaseStudyLink[];
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

/** Post Campaign Report-style stat tile — label, big value, optional sub line. */
function StatTile({ tile, compact, locale, scale = 1 }: { tile: CaseStudyStatTile; compact: boolean; locale?: string; scale?: number }) {
  return (
    <div
      className="rounded flex flex-col justify-center min-w-0"
      style={{
        background: SANDY_BEIGE,
        border: `1px solid ${SOFT_LINE}`,
        borderLeft: `3px solid ${OCEAN_TEAL}`,
        padding: compact ? '2px 4px' : '6px 10px',
      }}
    >
      <div className="text-gray-500 leading-tight truncate" style={{ fontSize: (compact ? 6 : 9) * scale }}>{t(tile.label, locale)}</div>
      <div className="font-bold leading-tight truncate" style={{ color: INK, fontSize: (compact ? 11 : 20) * scale }}>{tile.value}</div>
      {!compact && tile.sub && (
        <div className="text-gray-400 leading-tight truncate" style={{ fontSize: 8 * scale }}>{t(tile.sub, locale)}</div>
      )}
    </div>
  );
}

function CaseStudyCard({
  cs,
  imageFirst,
  customFields,
  onFieldChange,
  locale,
  textScale = 1,
  tileScale = 1,
}: {
  cs: DeckCaseStudyLink['caseStudy'];
  imageFirst: boolean;
  customFields?: Record<string, string>;
  onFieldChange?: FieldChangeHandler;
  locale?: string;
  /** Per-slide text scale as a multiplier (1 = 100%). */
  textScale?: number;
  /** Separate multiplier for the metric stat tiles. */
  tileScale?: number;
}) {
  // Metric tokens ({revenue}, {room_nights}, …) scoped to this case study, so the
  // narrative resolves to its own numbers in preview (and, via the mirror in the
  // API, in the PPTX/PDF export).
  const metricVars = buildCaseStudyMetricVars(cs);
  const tiles = buildCaseStudyStatTiles(cs, locale, hiddenCaseStudyTileKeys(customFields));
  const hasTiles = tiles.length > 0;

  // Card image — pick WHICH of the case study's own photos to feature (per-deck
  // override; defaults to the record's first image). Deliberately not the deck
  // gallery: the pitched hotel's photos don't belong on another hotel's case study.
  const imageBlock = (
    <div style={{ height: hasTiles ? '42%' : '55%' }} className="overflow-hidden">
      <SlideImage
        fieldKey={`caseStudy.${cs.id}.image`}
        customFields={customFields}
        defaultValue={cs.images?.[0] ?? null}
        gallery={cs.images ?? []}
        onFieldChange={onFieldChange}
        className="w-full h-full"
        fallbackGradient={`linear-gradient(135deg, ${TEAL_400}, ${TEAL_200})`}
        placeholderText={onFieldChange ? 'Card image' : ''}
      />
    </div>
  );

  const textBlock = (
    <div style={{ height: hasTiles ? '32%' : '45%' }} className="p-[5%] flex flex-col justify-center overflow-visible">
      <SlideRichText
        fieldKey={`caseStudy.${cs.id}.title`}
        defaultValue={cs.title}
        defaultSize={20}
        sizeScale={textScale}
        customFields={customFields}
        extraPlaceholders={metricVars}
        onFieldChange={onFieldChange}
        className="font-bold leading-snug mb-1"
        style={{ color: OCEAN_TEAL }}
      />
      <SlideRichText
        fieldKey={`caseStudy.${cs.id}.narrative`}
        defaultValue={cs.narrative || [cs.destination, cs.roomNights != null ? `${cs.roomNights.toLocaleString()} ${t('room nights', locale)}` : null].filter(Boolean).join(' · ')}
        defaultSize={15}
        sizeScale={textScale}
        customFields={customFields}
        extraPlaceholders={metricVars}
        onFieldChange={onFieldChange}
        className="leading-[1.4]"
        style={{ color: '#333' }}
      />
    </div>
  );

  const tileStrip = hasTiles ? (
    // Fixed 3×2 grid — sized for the full 6 tiles so sparse metrics don't
    // stretch into tall tiles; unused cells stay as whitespace.
    <div className="px-[5%] pb-[3%] grid grid-cols-3 grid-rows-2 gap-1.5" style={{ height: '26%' }}>
      {tiles.map((tile) => (
        <StatTile key={tile.key} tile={tile} compact locale={locale} scale={tileScale} />
      ))}
    </div>
  ) : null;

  return (
    <div className="bg-white rounded shadow-lg h-full flex flex-col overflow-visible">
      {imageFirst ? (
        <>{imageBlock}{textBlock}{tileStrip}</>
      ) : (
        <>{textBlock}{tileStrip}{imageBlock}</>
      )}
    </div>
  );
}

/**
 * Full-width layout used when exactly one case study is selected — the Post
 * Campaign Report look: title + narrative on top, 2×3 stat tile grid on the
 * left, hero image on the right.
 */
function FeaturedCaseStudyCard({
  cs,
  customFields,
  onFieldChange,
  locale,
  textScale = 1,
  tileScale = 1,
}: {
  cs: DeckCaseStudyLink['caseStudy'];
  customFields?: Record<string, string>;
  onFieldChange?: FieldChangeHandler;
  locale?: string;
  /** Per-slide text scale as a multiplier (1 = 100%). */
  textScale?: number;
  /** Separate multiplier for the metric stat tiles. */
  tileScale?: number;
}) {
  const metricVars = buildCaseStudyMetricVars(cs);
  const tiles = buildCaseStudyStatTiles(cs, locale, hiddenCaseStudyTileKeys(customFields));

  return (
    <div className="bg-white rounded shadow-lg h-full flex flex-col overflow-visible p-[3%]">
      <SlideRichText
        fieldKey={`caseStudy.${cs.id}.title`}
        defaultValue={cs.title}
        defaultSize={24}
        sizeScale={textScale}
        customFields={customFields}
        extraPlaceholders={metricVars}
        onFieldChange={onFieldChange}
        className="font-bold leading-snug mb-1"
        style={{ color: OCEAN_TEAL }}
      />
      <SlideRichText
        fieldKey={`caseStudy.${cs.id}.narrative`}
        defaultValue={cs.narrative || [cs.destination, cs.roomNights != null ? `${cs.roomNights.toLocaleString()} ${t('room nights', locale)}` : null].filter(Boolean).join(' · ')}
        defaultSize={14}
        sizeScale={textScale}
        customFields={customFields}
        extraPlaceholders={metricVars}
        onFieldChange={onFieldChange}
        className="leading-[1.4]"
        style={{ color: '#333' }}
      />
      <div className="flex-1 flex gap-3 min-h-0 mt-3">
        {/* Fixed 2×3 grid — sized for the full 6 tiles so sparse metrics don't
            balloon into oversized tiles; unused cells stay as whitespace. */}
        <div className="flex-1 grid grid-cols-2 grid-rows-3 gap-2 min-w-0">
          {tiles.map((tile) => (
            <StatTile key={tile.key} tile={tile} compact={false} locale={locale} scale={tileScale} />
          ))}
        </div>
        <div className="w-[42%] rounded overflow-hidden shrink-0">
          <SlideImage
            fieldKey={`caseStudy.${cs.id}.image`}
            customFields={customFields}
            defaultValue={cs.images?.[0] ?? null}
            gallery={cs.images ?? []}
            onFieldChange={onFieldChange}
            className="w-full h-full"
            fallbackGradient={`linear-gradient(135deg, ${TEAL_400}, ${TEAL_200})`}
            placeholderText={onFieldChange ? 'Hero image' : ''}
          />
        </div>
      </div>
    </div>
  );
}

export function CaseStudySlide({ slideId, caseStudies, deck, onFieldChange, onGalleryAdd }: CaseStudySlideProps) {
  const hasCaseStudies = caseStudies && caseStudies.length > 0;
  const cf = { ...deck?.templateDefaults, ...deck?.customFields };
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString(dateLocaleTag(deck?.renderLocale), { day: 'numeric', month: 'long', year: 'numeric' });
  // Per-slide image key so each case study slide can have its own background
  const imageFieldKey = slideId ? `image.caseStudy.${slideId}` : 'image.caseStudy';
  const swapped = cf?.['caseStudy.swapped'] === 'true';
  const cards = hasCaseStudies ? caseStudies.slice(0, 2) : [];
  const leftCard = swapped ? cards[1] : cards[0];
  const rightCard = swapped ? cards[0] : cards[1];
  const titlePositioned = !!(cf[`${TITLE_FIELD_KEY}.x`] && cf[`${TITLE_FIELD_KEY}.y`]);
  // Featured layout = exactly one case study that has metrics to tile. It spans
  // the full width, so the title's default moves to the top-left band above the
  // card (the bottom-left default would sit under it).
  const featured = cards.length === 1 && buildCaseStudyStatTiles(cards[0].caseStudy, deck?.renderLocale, hiddenCaseStudyTileKeys(cf)).length > 0;
  // Per-slide scales, keyed on the slide id (case-study slides are chunked, so
  // each pair of studies scales independently). Card text and the metric tiles
  // scale separately. PPTX reads the same keys.
  const textScaleKey = slideId ? `caseStudy.${slideId}.textScale` : 'caseStudy.textScale';
  const textScale = readTextScale(cf, textScaleKey) / 100;
  const tileScaleKey = slideId ? `caseStudy.${slideId}.tileScale` : 'caseStudy.tileScale';
  const tileScale = readTextScale(cf, tileScaleKey) / 100;

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      {/* Background image */}
      <SlideImage
        fieldKey={imageFieldKey}
        customFields={cf}
        gallery={deck?.gallery}
        onFieldChange={onFieldChange}
        onGalleryAdd={onGalleryAdd}
        className="absolute inset-0"
        placeholderText="Background image"
        fallbackGradient={`linear-gradient(135deg, ${TEAL_200} 0%, ${TEAL_400} 40%, ${OCEAN_TEAL} 70%, ${TEAL_100} 100%)`}
      />

      {/* Content area */}
      <div data-slide-root="true" className="relative flex-1">
        {/* Background image picker — top-left */}
        {onFieldChange && onGalleryAdd && (
          <div className="absolute top-2 left-2 z-20">
            <SlideImage
              fieldKey={imageFieldKey}
              customFields={cf}
              gallery={deck?.gallery}
              onFieldChange={onFieldChange}
              onGalleryAdd={onGalleryAdd}
              className="w-8 h-8 rounded"
              placeholderText=""
            />
          </div>
        )}

        {/* Tile toggles — ADR and Total revenue tiles are shown by default;
            these hide them deck-wide (all case-study slides, preview + export). */}
        {onFieldChange && hasCaseStudies && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
            <TextScaleControl fieldKey={textScaleKey} customFields={cf} onFieldChange={onFieldChange} label="Text" title="Scale card title and narrative text" />
            <TextScaleControl fieldKey={tileScaleKey} customFields={cf} onFieldChange={onFieldChange} label="Tiles" title="Scale the metric tile text" />
            {cards.some((c) => c.caseStudy.revenue != null) && (
              <button
                type="button"
                onClick={() => onFieldChange('custom', '', 'caseStudy.showRevenue', cf['caseStudy.showRevenue'] === 'false' ? 'true' : 'false')}
                className="text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer whitespace-nowrap"
                title="Show or hide the Total revenue stat tile on case-study slides (on by default)"
              >
                {cf['caseStudy.showRevenue'] === 'false' ? 'Show total revenue' : 'Hide total revenue'}
              </button>
            )}
            {cards.some((c) => c.caseStudy.adr != null) && (
              <button
                type="button"
                onClick={() => onFieldChange('custom', '', 'caseStudy.showAdr', cf['caseStudy.showAdr'] === 'false' ? 'true' : 'false')}
                className="text-[10px] bg-white/80 hover:bg-white text-gray-600 rounded px-2 py-1 shadow cursor-pointer whitespace-nowrap"
                title="Show or hide the ADR stat tile on case-study slides (on by default)"
              >
                {cf['caseStudy.showAdr'] === 'false' ? 'Show ADR' : 'Hide ADR'}
              </button>
            )}
          </div>
        )}

        {/* "Case Studies" title — draggable + resizable; position/size are saved
            per-language so the wider translated title can be repositioned. */}
        <DraggableSlideElement
          fieldKey={TITLE_FIELD_KEY}
          customFields={cf}
          onFieldChange={onFieldChange}
          // Default width keeps the title inside the left column (cards start
          // at 21%) so it wraps like the PPTX title box instead of running
          // under the left card. Featured titles sit in the top band, single-line.
          defaultClassName={featured ? 'absolute top-[2.5%] left-[4%]' : 'absolute bottom-[8%] left-[4%] w-[17%]'}
          className="z-10 group/cstitle"
        >
          <SlideRichText
            fieldKey={TITLE_FIELD_KEY}
            defaultValue={t(cards.length === 1 ? 'Case Study' : 'Case Studies', deck?.renderLocale)}
            defaultSize={42}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="font-bold leading-none"
            style={{ fontFamily: SLIDE_DISPLAY_STACK, color: '#ffffff', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
          />
          {onFieldChange && titlePositioned && (
            <button
              type="button"
              onClick={() => resetSlideElementPosition(TITLE_FIELD_KEY, onFieldChange)}
              className="absolute -top-7 right-0 rounded bg-black/60 px-2 py-1 text-[10px] text-white/90 hover:text-white opacity-0 group-hover/cstitle:opacity-100 transition-opacity"
              title="Move title back to default position"
            >
              ↺ Reset position
            </button>
          )}
        </DraggableSlideElement>

        {!hasCaseStudies ? (
          <div className="absolute top-[10%] right-[5%] w-[40%]">
            <div className="bg-white/90 rounded-lg p-6 shadow-sm">
              <p className="text-sm text-gray-400">{t('No case studies linked yet', deck?.renderLocale)}</p>
              <p className="text-[10px] text-gray-300 mt-1">{t('Add case studies in the wizard (Step 5)', deck?.renderLocale)}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Single case study with metrics — full-width featured layout
                (Post Campaign Report look). Falls back to the standard card
                when the study has no metrics to tile. */}
            {featured ? (
              /* Starts below the title band (bottom edge stays at 90% like the
                 two-card layout) so the top-left title clears the card. */
              <div className="absolute" style={{ left: '21%', right: '3%', top: '13%', height: '77%' }}>
                <FeaturedCaseStudyCard cs={cards[0].caseStudy} customFields={cf} onFieldChange={onFieldChange} locale={deck?.renderLocale} textScale={textScale} tileScale={tileScale} />
              </div>
            ) : (
              <>
                {/* Left card — image top, text bottom (only when 2 cards) */}
                {leftCard && rightCard && (
                  <div className="absolute" style={{ left: '21%', top: '50%', transform: 'translateY(-50%)', width: '36%', height: '80%' }}>
                    <CaseStudyCard cs={leftCard.caseStudy} imageFirst={true} customFields={cf} onFieldChange={onFieldChange} locale={deck?.renderLocale} textScale={textScale} tileScale={tileScale} />
                  </div>
                )}

                {/* Right card — text top, image bottom (or single card) */}
                {(rightCard || (!rightCard && leftCard)) && (
                  <div className="absolute" style={{ right: '3%', top: '50%', transform: 'translateY(-50%)', width: '36%', height: '80%' }}>
                    <CaseStudyCard cs={(rightCard ?? leftCard)!.caseStudy} imageFirst={false} customFields={cf} onFieldChange={onFieldChange} locale={deck?.renderLocale} textScale={textScale} tileScale={tileScale} />
                  </div>
                )}
              </>
            )}

            {/* Swap button */}
            {cards.length === 2 && onFieldChange && (
              <button
                type="button"
                onClick={() => onFieldChange('custom', '', 'caseStudy.swapped', swapped ? 'false' : 'true')}
                className="absolute z-20 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md cursor-pointer"
                style={{ left: '59%', top: '50%', transform: 'translate(-50%, -50%)' }}
                title="Swap cards"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={OCEAN_TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          <span className="text-[10px] text-gray-600 ml-1"><strong>{t('updated', deck?.renderLocale)}</strong> {date}</span>
        </div>
        <div className="flex items-center gap-3">
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-3.5 invert" />
        </div>
      </div>
    </div>
  );
}
