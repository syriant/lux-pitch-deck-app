import { uploadUrl } from '@/api/upload.api';
import { t, dateLocaleTag } from '../labels';
import type { FullDeck } from '@/api/decks.api';

/**
 * A PCM-uploaded one-pager. The image is pre-letterboxed to 16:9 on upload
 * (PDF pages rasterized onto a white 16:9 canvas), so it fills the slide
 * exactly with no distortion. The deck footer is overlaid translucently at the
 * bottom so the page stays full-bleed but still carries the hotel name /
 * updated date / branding that every other slide has.
 */
export function CustomPageSlide({ imageKey, deck }: { imageKey?: string; deck?: FullDeck }) {
  const src = imageKey ? uploadUrl(imageKey) : null;
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString(dateLocaleTag(deck?.renderLocale), { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="relative h-full w-full bg-white">
      {src ? (
        <img src={src} alt="Custom page" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
          {t('Custom page image missing', deck?.renderLocale)}
        </div>
      )}
      {/* Footer bar — opaque overlay (the image is full-bleed, so a translucent
          bar would let it bleed through). */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-[3%] py-2 bg-white">
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
