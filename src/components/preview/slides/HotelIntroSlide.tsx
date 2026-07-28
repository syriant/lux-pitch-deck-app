import { type FullDeck } from '@/api/decks.api';
import { SLIDE_DISPLAY_STACK } from '../fonts';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { t, dateLocaleTag } from '../labels';
import { uploadUrl } from '@/api/upload.api';
import { SlideRichText } from '../SlideRichText';
import { useSlideEditorContext } from '../SlideEditorContext';
import { DraggableSlideElement, resetSlideElementPosition } from '../DraggableSlideElement';
import { TextScaleControl, readTextScale } from '../TextScaleControl';
import { OCEAN_TEAL, TEAL_200, TEAL_400 } from '../brand';

const VALUE_PROP_FIELD_KEY = 'hotelIntro.valueProp';

function isPositioned(cf: Record<string, string>, fieldKey: string): boolean {
  const x = cf[`${fieldKey}.x`];
  const y = cf[`${fieldKey}.y`];
  return x !== undefined && x !== '' && y !== undefined && y !== '';
}

const NO_DESTINATION_FALLBACK =
  'Now is the ideal time to diversify distribution channels and capture greater market share with Luxury Escapes.';

interface HotelIntroSlideProps {
  deck: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

export function HotelIntroSlide({ deck, onFieldChange }: HotelIntroSlideProps) {
  const property = deck.properties[0];
  const hotelName = property?.propertyName ?? deck.name;
  const destination = property?.destination ?? '';
  const heroImgUrl = uploadUrl(deck.heroImage);
  const date = new Date().toLocaleDateString(dateLocaleTag(deck?.renderLocale), { day: 'numeric', month: 'long', year: 'numeric' });

  // SlideRichText handles {destination}/{hotelName} substitution automatically via DeckRenderContext.
  // Special case: when destination is empty (real deck without one), substitute the
  // entire field with a no-destination fallback message so the sentence reads naturally.
  const editorContext = useSlideEditorContext();
  const isTemplateEditor = editorContext.allowedKeys !== undefined;

  const cf: Record<string, string> = { ...deck.templateDefaults, ...deck.customFields };
  // When there's no destination the factory default ("…demand in {destination}…")
  // reads awkwardly, so fall back to a generic sentence — but only when the field
  // has no authored value or translation (the overlay puts the active locale's
  // translation into customFields), and translate the fallback itself. Previously
  // this overwrote the key unconditionally, clobbering translations.
  const locale = deck?.renderLocale;
  if (!isTemplateEditor && !destination && !cf['hotelIntro.valueProp']) {
    cf['hotelIntro.valueProp'] = t(NO_DESTINATION_FALLBACK, locale);
  }

  const valuePropPositioned = isPositioned(cf, VALUE_PROP_FIELD_KEY);
  // Per-slide text scale — the PPTX template reads the same key.
  const textScale = readTextScale(cf, 'hotelIntro.textScale') / 100;

  return (
    <div data-slide-root="true" className="relative h-full w-full flex flex-col overflow-hidden">
      {onFieldChange && (
        <div className="absolute top-2 right-2 z-20">
          <TextScaleControl fieldKey="hotelIntro.textScale" customFields={cf} onFieldChange={onFieldChange} />
        </div>
      )}
      {/* min-h-0 at each flex level: oversized text (A+ scale) must clip inside
          the left panel, not inflate the row — a taller row stretches the photo
          panel and cover-crop re-zooms the image. */}
      <div className="flex-1 flex min-h-0">
        <div className="w-[50%] flex flex-col p-[5%] min-h-0 overflow-hidden" style={{ backgroundColor: OCEAN_TEAL }}>
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-5 w-auto self-start mb-6" />

          <div className="flex-1 flex items-center min-h-0">
            <DraggableSlideElement
              fieldKey={VALUE_PROP_FIELD_KEY}
              customFields={cf}
              onFieldChange={onFieldChange}
              className="group/valueprop w-full"
            >
              <SlideRichText
                fieldKey="hotelIntro.valueProp"
                defaultSize={34}
                sizeScale={textScale}
                customFields={cf}
                onFieldChange={onFieldChange}
                className="font-bold text-white leading-snug"
                style={{ fontFamily: SLIDE_DISPLAY_STACK }}
              />
              {onFieldChange && valuePropPositioned && (
                <button
                  type="button"
                  onClick={() => resetSlideElementPosition(VALUE_PROP_FIELD_KEY, onFieldChange)}
                  className="absolute -top-7 right-0 rounded bg-black/60 px-2 py-1 text-[10px] text-white/90 hover:text-white opacity-0 group-hover/valueprop:opacity-100 transition-opacity"
                  title="Move text back to default position"
                >
                  ↺ Reset position
                </button>
              )}
            </DraggableSlideElement>
          </div>
        </div>

        <div className="w-[50%]" style={
          heroImgUrl
            ? { backgroundImage: `url(${heroImgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: `linear-gradient(180deg, ${TEAL_200} 0%, ${TEAL_400} 50%, ${OCEAN_TEAL} 100%)` }
        }>
          {!heroImgUrl && (
            <div className="h-full w-full flex items-center justify-center text-white/50 text-xs">
              Hotel photo
            </div>
          )}
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-[3%] py-2 bg-white/70">
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
