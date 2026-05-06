import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { EditableText } from '../EditableText';
import { SlideRichText } from '../SlideRichText';

const LOGO_SIZE_DEFAULT = 40;
const LOGO_SIZE_MIN = 8;
const LOGO_SIZE_MAX = 80;
const LOGO_SIZE_STEP = 2;

interface CoverSlideProps {
  deck: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

export function CoverSlide({ deck, onFieldChange }: CoverSlideProps) {
  const property = deck.properties[0];
  const hotelName = property?.propertyName ?? deck.name;
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const coverImgUrl = uploadUrl(deck.coverImage);
  const logoImgUrl = uploadUrl(deck.logoImage);
  const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}${String(new Date().getFullYear()).slice(2)}`;
  const cf = { ...deck.templateDefaults, ...deck.customFields };

  return (
    <div className="relative h-full w-full bg-gray-300 overflow-hidden">
      <div className="absolute inset-0" style={
        coverImgUrl
          ? { backgroundImage: `url(${coverImgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(135deg, #8eb8b0 0%, #b0cfc9 30%, #c8ddd8 60%, #a3c4bd 100%)' }
      } />

      <div className="relative h-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-start pt-[6%] px-[12%]">
          <SlideRichText
            fieldKey="cover.hookText"
            customFields={cf}
            onFieldChange={onFieldChange}
            className="font-bold text-white leading-snug max-w-2xl drop-shadow-md"
            style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif', textAlign: 'center' }}
          />
          {logoImgUrl && (() => {
            const rawSize = Number(cf['cover.logoSize']);
            const size = Number.isFinite(rawSize) && rawSize > 0
              ? Math.min(LOGO_SIZE_MAX, Math.max(LOGO_SIZE_MIN, rawSize))
              : LOGO_SIZE_DEFAULT;
            return (
              <div className="relative group" style={{ width: `${size}%` }}>
                <img
                  src={logoImgUrl}
                  alt="Hotel logo"
                  className="w-full object-contain drop-shadow-md"
                />
                {onFieldChange && (
                  // Anchor the size control at the TOP of the wrapper. Logos
                  // grow downward as size increases (top is fixed, bottom
                  // extends), so a top-anchored toolbar stays put while the
                  // logo expands underneath it.
                  <div className="absolute left-1/2 -top-7 -translate-x-1/2 flex items-center gap-0.5 rounded bg-black/60 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onFieldChange('custom', '', 'cover.logoSize', String(Math.max(LOGO_SIZE_MIN, size - LOGO_SIZE_STEP)))}
                      className="px-2 py-1 text-white/80 hover:text-white text-sm font-bold leading-none"
                    >
                      −
                    </button>
                    <span className="px-1.5 py-1 text-[10px] text-white/70 tabular-nums">{size}%</span>
                    <button
                      type="button"
                      onClick={() => onFieldChange('custom', '', 'cover.logoSize', String(Math.min(LOGO_SIZE_MAX, size + LOGO_SIZE_STEP)))}
                      className="px-2 py-1 text-white/80 hover:text-white text-sm font-bold leading-none"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer bar */}
        <div className="flex items-center justify-between px-[3%] py-2 bg-white/70">
          <div className="flex items-baseline gap-1">
            {property && onFieldChange ? (
              <EditableText
                value={hotelName}
                onChange={(v) => onFieldChange('property', property.id, 'propertyName', v)}
                className="text-xs font-bold text-gray-900"
                as="span"
              />
            ) : (
              <span className="text-xs font-bold text-gray-900">{hotelName}</span>
            )}
            <span className="text-[10px] text-gray-600 ml-1"><strong>updated</strong> {date}</span>
          </div>
          <div className="flex items-center gap-3">
            <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-3.5 invert" />
            <span className="text-xs font-bold text-gray-900">{quarter}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
