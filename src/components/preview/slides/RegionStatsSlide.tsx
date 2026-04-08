import { type DeckPropertyFull, type FullDeck } from '@/api/decks.api';
import { type FieldChangeHandler } from '@/pages/DeckPreview';
import { EditableText } from '../EditableText';
import { SlideRichText } from '../SlideRichText';
import { SlideImage } from '../SlideImage';

const GREEN = '#00b2a0';
const MINT = '#dff0ee';

interface RegionStatsSlideProps {
  property?: DeckPropertyFull;
  deck?: FullDeck;
  onFieldChange?: FieldChangeHandler;
  onGalleryAdd?: (url: string) => void;
}

const metrics = [
  { icon: '/icon-bed.svg', keySuffix: 'roomNights', def: '<b>80 - 250</b>', label: 'room nights per campaign' },
  { icon: '/icon-hotel.svg', keySuffix: 'alos', def: '<b>3.35 days</b>', label: 'ALOS' },
  { icon: '/icon-globe.svg', keySuffix: 'intl', def: '<b>68%</b>', label: 'bookings from international markets' },
  { icon: '/icon-calendar.svg', keySuffix: 'window', def: '<b>95 days</b>', label: 'booking window' },
  { icon: '/icon-customers.svg', keySuffix: 'demo', def: '<b>79%</b> couples<br><b>21%</b> families', label: '' },
  { icon: '/icon-up-arrow.svg', keySuffix: 'upgrade', def: '<b>45%</b>', label: 'of members upgraded their packages' },
];

export function RegionStatsSlide({ property, deck, onFieldChange, onGalleryAdd }: RegionStatsSlideProps) {
  const destination = property?.destination ?? property?.propertyName ?? 'Your Destination';
  const cf = { ...deck?.templateDefaults, ...deck?.customFields };
  const propKey = property?.id ?? 'empty';
  const hotelName = deck?.properties[0]?.propertyName ?? deck?.name ?? '';
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="flex-1 flex min-h-0">
        {/* Left content */}
        <div className="w-[58%] flex flex-col">
          {/* Title — white background */}
          <div className="px-[8.5%] pt-[7%] pb-3">
            {property && onFieldChange ? (
              <EditableText
                value={destination}
                onChange={(v) => onFieldChange('property', property.id, 'destination', v)}
                className="text-[33px] font-bold leading-tight"
                style={{ color: '#000' }}
                as="h2"
              />
            ) : (
              <h2 className="text-[33px] font-bold leading-tight" style={{ color: '#000' }}>{destination}</h2>
            )}
            <p className="text-[33px] italic font-light" style={{ color: '#000' }}>
              & <span style={{ color: GREEN }}>Luxury Escapes</span>
            </p>
          </div>

          {/* Body — mint background */}
          <div className="flex-1 flex flex-col px-[8.5%] pt-3 pb-3 overflow-hidden" style={{ backgroundColor: MINT }}>

          {/* Narrative */}
          <SlideRichText
            fieldKey={`region.${propKey}.narrative`}
            defaultValue={`Last year, ${destination} wasn't actively promoted. This year, consistent campaigns drove a 197% increase in production, showing the impact of keeping the destination top of mind and inspiring travelers to choose ${destination} for their next getaway`}
            defaultSize={15}
            customFields={cf}
            onFieldChange={onFieldChange}
            className="leading-relaxed mb-3"
            style={{ color: '#333' }}
          />

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-auto">
            {metrics.map((m) => (
              <div key={m.keySuffix} className="flex items-start gap-3">
                <img src={m.icon} alt="" className="w-9 h-9 mt-0.5" />
                <div>
                  <SlideRichText
                    fieldKey={`region.${propKey}.${m.keySuffix}`}
                    defaultValue={m.def}
                    defaultSize={17}
                    customFields={cf}
                    onFieldChange={onFieldChange}
                    className="whitespace-pre-line leading-snug"
                    style={{ color: '#000' }}
                  />
                  {m.label && (
                    <div className="text-[14px] leading-snug mt-0.5" style={{ color: '#444' }}>{m.label}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Market Coverage */}
          <div className="mt-3 pt-2">
            <p className="text-[15px] font-semibold underline mb-1" style={{ color: '#000' }}>Market Coverage</p>
            <div className="flex items-start gap-1.5">
              <span className="text-[14px]" style={{ color: '#333' }}>•</span>
              <SlideRichText
                fieldKey={`region.${propKey}.coverage`}
                defaultValue={`Maximum two ${destination} hotels featured per month`}
                defaultSize={14}
                customFields={cf}
                onFieldChange={onFieldChange}
                style={{ color: '#333' }}
              />
            </div>
          </div>
          </div>
        </div>

        {/* Right image */}
        <SlideImage
          fieldKey={`image.regionStats.${propKey}`}
          customFields={cf}
          gallery={deck?.gallery}
          onFieldChange={onFieldChange}
          onGalleryAdd={onGalleryAdd}
          className="w-[42%]"
          placeholderText="Destination photo"
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
