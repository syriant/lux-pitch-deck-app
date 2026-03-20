import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { EditableText } from '../EditableText';
import { SlideRichText } from '../SlideRichText';
import { AlignToggle, type Align } from '../AlignToggle';
import { FontSizeControl } from '../FontSizeControl';

const alignToFlex: Record<Align, string> = {
  left: 'items-start',
  center: 'items-center',
  right: 'items-end',
};

interface CoverSlideProps {
  deck: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

export function CoverSlide({ deck, onFieldChange }: CoverSlideProps) {
  const property = deck.properties[0];
  const hotelName = property?.propertyName ?? deck.name;
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const coverImgUrl = uploadUrl(deck.coverImage);
  const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}${String(new Date().getFullYear()).slice(2)}`;
  const align = (deck.customFields?.['cover.hookAlign'] as Align) || 'center';
  const fontSize = Number(deck.customFields?.['cover.hookSize']) || 45;

  return (
    <div className="relative h-full w-full bg-gray-300 overflow-hidden">
      <div className="absolute inset-0" style={
        coverImgUrl
          ? { backgroundImage: `url(${coverImgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(135deg, #8eb8b0 0%, #b0cfc9 30%, #c8ddd8 60%, #a3c4bd 100%)' }
      } />

      <div className="relative h-full flex flex-col">
        {/* Hook text — upper portion */}
        <div className={`group flex-1 flex flex-col ${alignToFlex[align]} justify-start pt-[6%] px-[12%]`}>
          <SlideRichText
            fieldKey="cover.hookText"
            defaultValue="There are more travelers than ever. And they've never been harder to reach."
            customFields={deck.customFields}
            onFieldChange={onFieldChange}
            className="font-bold text-white leading-snug max-w-2xl drop-shadow-md"
            style={{
              fontFamily: 'Arial, "Helvetica Neue", sans-serif',
              fontSize: `${fontSize}px`,
              textAlign: align,
            }}
          />
          {onFieldChange && (
            <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <AlignToggle fieldKey="cover.hookAlign" align={align} onFieldChange={onFieldChange} />
              <FontSizeControl fieldKey="cover.hookSize" size={fontSize} onFieldChange={onFieldChange} />
            </div>
          )}
        </div>

        {/* Footer bar — light semi-opaque */}
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
