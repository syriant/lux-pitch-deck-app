import { type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { SlideEditableText } from '../SlideEditableText';
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

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: MINT }}>
      <div className="flex-1 flex p-[5%] gap-[4%]">
        <div className="flex-1 flex flex-col">
          <SlideEditableText
            fieldKey="diff.headline"
            defaultValue={`By leveraging Luxury Escapes' global member base, curated campaigns, and powerful marketing reach ${hotelName} can attract premium travellers, generate incremental demand, and strengthen market share`}
            customFields={deck.customFields}
            onFieldChange={onFieldChange}
            className="text-xl font-light italic leading-snug mb-6"
            as="p"
            multiline
          />

          <div className="grid grid-cols-2 gap-4 mt-auto">
            {items.map((item) => (
              <div key={item.key}>
                <div className="w-8 border-t-2 mb-2" style={{ borderColor: GREEN }} />
                <SlideEditableText
                  fieldKey={`diff.title.${item.key}`}
                  defaultValue={item.title}
                  customFields={deck.customFields}
                  onFieldChange={onFieldChange}
                  className="text-sm font-bold mb-1"
                  as="h3"
                />
                <SlideEditableText
                  fieldKey={`diff.desc.${item.key}`}
                  defaultValue={item.description}
                  customFields={deck.customFields}
                  onFieldChange={onFieldChange}
                  className="text-[10px] leading-relaxed"
                  as="p"
                  multiline
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

      <div className="flex justify-end px-[5%] pb-[3%]">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: GREEN }} />
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#333' }}>
            LUXURY<span className="font-normal">ESCAPES</span>
          </span>
        </div>
      </div>
    </div>
  );
}
