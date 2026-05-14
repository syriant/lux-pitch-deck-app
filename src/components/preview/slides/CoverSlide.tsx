import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { EditableText } from '../EditableText';
import { SlideRichText } from '../SlideRichText';

const LOGO_SIZE_DEFAULT = 35;
const LOGO_SIZE_MIN = 8;
const LOGO_SIZE_MAX = 80;
const LOGO_SIZE_STEP = 2;

type LogoBackdrop = 'none' | 'light' | 'dark';
const LOGO_BACKDROPS: ReadonlyArray<{ key: LogoBackdrop; label: string; swatch: string }> = [
  { key: 'none', label: 'No backdrop', swatch: 'border border-white/40 bg-transparent' },
  { key: 'light', label: 'Light backdrop', swatch: 'bg-white/80' },
  { key: 'dark', label: 'Dark backdrop', swatch: 'bg-black/70 border border-white/20' },
];

function parseBackdrop(raw: string | undefined): LogoBackdrop {
  return raw === 'light' || raw === 'dark' ? raw : 'none';
}

type CoverBackdrop = 'none' | 'light' | 'dark';
const COVER_BACKDROPS: ReadonlyArray<{ key: CoverBackdrop; label: string; swatch: string; overlay: string }> = [
  { key: 'none',  label: 'No image tint',    swatch: 'border border-white/40 bg-transparent', overlay: '' },
  { key: 'light', label: 'Light image tint', swatch: 'bg-white/60',                            overlay: 'bg-white/30' },
  { key: 'dark',  label: 'Dark image tint',  swatch: 'bg-black/60 border border-white/20',     overlay: 'bg-black/35' },
];

function parseCoverBackdrop(raw: string | undefined): CoverBackdrop {
  return raw === 'light' || raw === 'dark' ? raw : 'none';
}

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

  const coverBackdrop = parseCoverBackdrop(cf['cover.imageBackdrop']);
  const coverBackdropOverlay = COVER_BACKDROPS.find((b) => b.key === coverBackdrop)?.overlay ?? '';

  return (
    <div className="relative h-full w-full bg-gray-300 overflow-hidden group/slide">
      <div className="absolute inset-0" style={
        coverImgUrl
          ? { backgroundImage: `url(${coverImgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(135deg, #8eb8b0 0%, #b0cfc9 30%, #c8ddd8 60%, #a3c4bd 100%)' }
      } />
      {coverBackdropOverlay && <div className={`absolute inset-0 ${coverBackdropOverlay}`} />}

      {onFieldChange && coverImgUrl && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded bg-black/60 p-0.5 opacity-0 group-hover/slide:opacity-100 transition-opacity">
          <span className="px-1.5 py-1 text-[10px] text-white/70">Image tint</span>
          {COVER_BACKDROPS.map((opt) => {
            const isActive = coverBackdrop === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                title={opt.label}
                onClick={() => onFieldChange('custom', '', 'cover.imageBackdrop', opt.key)}
                className={`w-5 h-5 rounded-sm ${opt.swatch} ${isActive ? 'ring-2 ring-white' : 'opacity-70 hover:opacity-100'}`}
              />
            );
          })}
        </div>
      )}

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
            const backdrop = parseBackdrop(cf['cover.logoBackdrop']);
            const backdropPanel =
              backdrop === 'light' ? 'bg-white/75 rounded-md p-[6%]'
              : backdrop === 'dark' ? 'bg-black/60 rounded-md p-[6%]'
              : '';
            return (
              <div className="relative group" style={{ width: `${size}%` }}>
                <div className={backdropPanel}>
                  <img
                    src={logoImgUrl}
                    alt="Hotel logo"
                    className="w-full object-contain drop-shadow-md"
                  />
                </div>
                {onFieldChange && (
                  // Anchor the toolbar at the TOP of the wrapper. Logos
                  // grow downward as size increases (top is fixed, bottom
                  // extends), so a top-anchored toolbar stays put.
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
                    <div className="w-px h-4 bg-white/20 mx-1" />
                    {LOGO_BACKDROPS.map((opt) => {
                      const isActive = backdrop === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          title={opt.label}
                          onClick={() => onFieldChange('custom', '', 'cover.logoBackdrop', opt.key)}
                          className={`w-5 h-5 rounded-sm ${opt.swatch} ${isActive ? 'ring-2 ring-white' : 'opacity-70 hover:opacity-100'}`}
                        />
                      );
                    })}
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
