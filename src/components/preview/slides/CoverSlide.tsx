import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { uploadUrl } from '@/api/upload.api';
import { EditableText } from '../EditableText';
import { SlideEditableText } from '../SlideEditableText';

const GREEN = '#00b2a0';

interface CoverSlideProps {
  deck: FullDeck;
  onFieldChange?: FieldChangeHandler;
}

export function CoverSlide({ deck, onFieldChange }: CoverSlideProps) {
  const property = deck.properties[0];
  const hotelName = property?.propertyName ?? deck.name;
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const coverImgUrl = uploadUrl(deck.coverImage);

  return (
    <div className="relative h-full w-full bg-gray-300 overflow-hidden">
      <div className="absolute inset-0" style={
        coverImgUrl
          ? { backgroundImage: `url(${coverImgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(135deg, #8eb8b0 0%, #b0cfc9 30%, #c8ddd8 60%, #a3c4bd 100%)' }
      } />
      <div className="absolute inset-0 bg-black/15" />

      <div className="relative h-full flex flex-col justify-between p-[6%]">
        <div className="flex-1 flex items-center justify-center">
          <SlideEditableText
            fieldKey="cover.hookText"
            defaultValue="There are more travelers than ever. And they've never been harder to reach."
            customFields={deck.customFields}
            onFieldChange={onFieldChange}
            className="text-3xl font-bold text-white text-center leading-snug max-w-lg"
            as="h1"
            multiline
          />
        </div>

        <div className="flex items-end justify-between">
          <div>
            {property && onFieldChange ? (
              <EditableText
                value={hotelName}
                onChange={(v) => onFieldChange('property', property.id, 'propertyName', v)}
                className="text-sm font-bold text-white"
                as="span"
              />
            ) : (
              <span className="text-sm font-bold text-white">{hotelName}</span>
            )}
            <span className="text-xs text-white/80 ml-2">updated {date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: GREEN }} />
            <span className="text-xs font-semibold text-white tracking-wide">
              LUXURY<span className="font-normal">ESCAPES</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
