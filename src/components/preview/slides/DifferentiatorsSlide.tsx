import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideRichText } from '../SlideRichText';
import { SlideImage } from '../SlideImage';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface DifferentiatorsSlideProps {
  deck: FullDeck;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

const defaultDifferentiators = [
  { title: 'High-Value Customers', description: 'Access more than 9 million engaged Luxury Escapes members: high-spending travellers looking for inspiration' },
  { title: 'Reach New Customers', description: "More than 90% of Luxury Escapes members weren't planning to stay at the hotel they booked until they discovered it on Luxury Escapes" },
  { title: 'Multi-Channel Marketing', description: 'Exclusive access to 360-degree media assets that amplify your brand across social, email, push, and web' },
  { title: 'Tailored Campaigns', description: 'Our in-house team of world-class writers, editors, designers and videographers will create an incredible campaign' },
];

export function DifferentiatorsSlide({ deck, onFieldChange, onGalleryAdd }: DifferentiatorsSlideProps) {
  const items = deck.differentiators.length > 0
    ? deck.differentiators.map((d) => ({
        title: d.differentiator.title,
        description: d.differentiator.description ?? '',
        key: d.id,
      }))
    : defaultDifferentiators.map((d, i) => ({ ...d, key: `default-${i}` }));

  const hotelName = deck.properties[0]?.propertyName ?? deck.name;
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      <div className="flex-1 flex p-[5%] gap-[4%]">
        <div className="flex-1 flex flex-col">
          <SlideRichText
            fieldKey="diff.headline"
            defaultValue={`By leveraging Luxury Escapes' global member base, curated campaigns, and powerful marketing reach ${hotelName} can attract premium travellers, generate incremental demand, and strengthen market share`}
            defaultSize={28}
            customFields={deck.customFields}
            onFieldChange={onFieldChange}
            className="font-bold leading-snug mb-4"
            style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif', color: GREEN }}
          />

          <div className="grid grid-cols-2 gap-4 mt-auto">
            {items.map((item) => (
              <div key={item.key}>
                <div className="w-8 border-t-2 mb-2" style={{ borderColor: GREEN }} />
                <SlideRichText
                  fieldKey={`diff.title.${item.key}`}
                  defaultValue={item.title}
                  defaultSize={14}
                  customFields={deck.customFields}
                  onFieldChange={onFieldChange}
                  className="font-bold mb-1"
                />
                <SlideRichText
                  fieldKey={`diff.desc.${item.key}`}
                  defaultValue={item.description}
                  defaultSize={10}
                  customFields={deck.customFields}
                  onFieldChange={onFieldChange}
                  className="leading-relaxed"
                />
              </div>
            ))}
          </div>
        </div>

        <SlideImage
          fieldKey="image.differentiators"
          customFields={deck.customFields}
          gallery={deck.gallery}
          onFieldChange={onFieldChange}
          onGalleryAdd={onGalleryAdd}
          className="w-[40%] rounded-lg overflow-hidden"
          placeholderText="Hotel photo"
        />
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-[3%] py-2 bg-white/70">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-bold text-gray-900">{hotelName}</span>
          <span className="text-[10px] text-gray-600 ml-1"><strong>updated</strong> {date}</span>
        </div>
        <div className="flex items-center gap-3">
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-3.5 invert" />
        </div>
      </div>
    </div>
  );
}
